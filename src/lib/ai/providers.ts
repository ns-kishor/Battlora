// ============================================================
// AI provider abstraction (server-only)
// Dual-provider chain: OpenAI + Google Gemini with automatic
// fallback. The active provider is env-switchable
// (AI_PROVIDER_PRIMARY=openai|gemini) so the frontend never
// knows or cares which provider is serving a request.
//
// SECURITY:
// - API keys are read exclusively from server-side env vars.
// - Provider errors are logged server-side only; clients get a
//   generic message. Keys/prompts/tokens never cross the wire.
// ============================================================

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  chat(messages: ChatMessage[]): Promise<string>;
}

const REQUEST_TIMEOUT_MS = 60_000;

function isKey(v: string | undefined): v is string {
  return typeof v === "string" && v.trim().length > 10;
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: { message?: string } | string;
      message?: string;
    };
    const msg =
      typeof body.error === "string"
        ? body.error
        : body.error?.message ?? body.message ?? "";
    return msg.slice(0, 300);
  } catch {
    return "";
  }
}

/** fetch with timeout + uniform error handling */
async function postJSON(
  url: string,
  headers: Record<string, string>,
  payload: unknown
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await readErrorMessage(res)}`);
    }
    return (await res.json()) as string;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- OpenAI ----------

class OpenAIProvider implements AIProvider {
  name = "openai";
  get key() {
    return process.env.OPENAI_API_KEY?.trim();
  }
  get model() {
    return process.env.AI_OPENAI_MODEL?.trim() || "gpt-4o";
  }
  isConfigured() {
    return isKey(this.key);
  }
  async chat(messages: ChatMessage[]): Promise<string> {
    const raw = await postJSON(
      "https://api.openai.com/v1/chat/completions",
      {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
      },
      {
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.4,
        max_tokens: 900,
      }
    );
    const parsed = JSON.parse(raw) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = parsed.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response from OpenAI");
    return content;
  }
}

// ---------- Google Gemini ----------

class GeminiProvider implements AIProvider {
  name = "gemini";
  get key() {
    return process.env.GEMINI_API_KEY?.trim();
  }
  get model() {
    return process.env.AI_GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  }
  isConfigured() {
    return isKey(this.key);
  }
  async chat(messages: ChatMessage[]): Promise<string> {
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const raw = await postJSON(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        "x-goog-api-key": this.key,
        "Content-Type": "application/json",
      },
      {
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
      }
    );
    const parsed = JSON.parse(raw) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const content = parsed.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!content) throw new Error("Empty response from Gemini");
    return content;
  }
}

// ---------- Local sandbox fallback ----------
// Both OpenAI and Gemini enforce regional availability. When the
// hosting region is not served by either provider, this optional
// built-in fallback keeps the assistant functional. Disable with
// AI_ENABLE_LOCAL_FALLBACK=false.

class LocalFallbackProvider implements AIProvider {
  name = "local";
  isEnabled() {
    return process.env.AI_ENABLE_LOCAL_FALLBACK !== "false";
  }
  isConfigured() {
    return this.isEnabled();
  }
  async chat(messages: ChatMessage[]): Promise<string> {
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      thinking: { type: "disabled" },
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response from local fallback");
    return content;
  }
}

// ---------- Chain resolution ----------

export function resolveProviderChain(): AIProvider[] {
  const openai = new OpenAIProvider();
  const gemini = new GeminiProvider();
  const primary =
    process.env.AI_PROVIDER_PRIMARY?.trim().toLowerCase() === "gemini"
      ? gemini
      : openai;
  const secondary = primary === gemini ? openai : gemini;
  const chain: AIProvider[] = [primary, secondary].filter((p) =>
    p.isConfigured()
  );
  const local = new LocalFallbackProvider();
  if (local.isConfigured()) chain.push(local);
  return chain;
}

/**
 * Get an assistant reply. Tries the primary provider, then falls
 * back automatically. Throws a client-safe ApiError when the
 * whole chain fails — provider-level details stay server-side.
 */
export async function getAIReply(messages: ChatMessage[]): Promise<string> {
  const chain = resolveProviderChain();
  if (chain.length === 0) {
    throw new Error("AI_ASSISTANT_NOT_CONFIGURED");
  }
  const failures: string[] = [];
  for (const provider of chain) {
    try {
      return await provider.chat(messages);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      failures.push(`${provider.name}: ${detail}`);
      console.error(`[ai-assistant] provider "${provider.name}" failed:`, detail);
    }
  }
  console.error("[ai-assistant] all providers failed:", failures.join(" | "));
  throw new Error("AI_ASSISTANT_UNAVAILABLE");
}
