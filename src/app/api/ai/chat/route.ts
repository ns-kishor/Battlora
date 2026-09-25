import { getSessionUser, ApiError } from "@/lib/auth";
import { getAIReply, type ChatMessage } from "@/lib/ai/providers";
import { buildAssistantMessages } from "@/lib/ai/assistant";
import { handleRouteError, ok, readJson } from "@/lib/route-helpers";

// ============================================================
// POST /api/ai/chat — Battlora AI Assistant
// - Server-side only: the system prompt, live context and AI
//   provider calls never leave the backend.
// - Authorization is re-derived from the session on EVERY
//   request (stateless; guests get public context only).
// - Rate limited per user (or per IP for guests).
// ============================================================

const MAX_HISTORY = 16; // messages of client history kept
const MAX_MESSAGE_CHARS = 4000;
const MAX_NEW_MESSAGE_CHARS = 2000;
const USER_LIMIT_PER_HOUR = 30;
const GUEST_LIMIT_PER_HOUR = 10;

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(key: string, limit: number): void {
  const now = Date.now();
  // opportunistic cleanup so the map never grows unbounded
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) if (v.resetAt <= now) rateBuckets.delete(k);
  }
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const minutes = Math.max(1, Math.ceil((bucket.resetAt - now) / 60000));
    throw new ApiError(
      `You've reached the assistant's hourly limit. Please try again in ~${minutes} minute${minutes > 1 ? "s" : ""}.`,
      429
    );
  }
}

function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) throw new ApiError("Invalid message history.", 400);
  const cleaned: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (typeof content !== "string") continue;
    const text = content.trim();
    if (!text) continue;
    // only user/assistant roles accepted from the client — a
    // client-supplied "system" message is always discarded
    if (role === "user" || role === "assistant") {
      cleaned.push({ role, content: text.slice(0, MAX_MESSAGE_CHARS) });
    }
  }
  return cleaned.slice(-MAX_HISTORY);
}

export async function POST(req: Request) {
  try {
    const body = await readJson<{ messages?: unknown }>(req);
    const history = sanitizeHistory(body.messages);
    const last = history[history.length - 1];
    if (!last || last.role !== "user") {
      throw new ApiError("Please provide your question.", 400);
    }
    if (last.content.length > MAX_NEW_MESSAGE_CHARS) {
      throw new ApiError("Message is too long (max 2000 characters).", 400);
    }

    const user = await getSessionUser(); // optional — guests allowed

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    checkRateLimit(user ? `u:${user.id}` : `ip:${ip}`, user ? USER_LIMIT_PER_HOUR : GUEST_LIMIT_PER_HOUR);

    const messages = await buildAssistantMessages(user, history);
    const reply = await getAIReply(messages);

    return ok({ reply });
  } catch (e) {
    if (e instanceof Error && e.message === "AI_ASSISTANT_UNAVAILABLE") {
      // all providers down — generic, client-safe message
      return ok(
        {
          reply:
            "I'm having trouble reaching my language services right now. Please try again in a little while — everything else on Battlora keeps working normally.",
          degraded: true,
        },
        200
      );
    }
    if (e instanceof Error && e.message === "AI_ASSISTANT_NOT_CONFIGURED") {
      return ok(
        {
          reply:
            "The AI assistant hasn't been configured on this deployment yet. Platform admins can enable it via server environment variables.",
          degraded: true,
        },
        200
      );
    }
    return handleRouteError(e);
  }
}
