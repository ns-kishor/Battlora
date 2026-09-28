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
async function postJSON<T = any>(
  url: string,
  headers: Record<string, string>,
  payload: unknown
): Promise<T> {
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
    return (await res.json()) as T;
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
    return process.env.AI_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  }
  isConfigured() {
    return isKey(this.key);
  }
  async chat(messages: ChatMessage[]): Promise<string> {
    const parsed = await postJSON<{
      choices?: { message?: { content?: string } }[];
    }>(
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
    return process.env.AI_GEMINI_MODEL?.trim() || "gemini-flash-latest";
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

    const candidateModels = Array.from(
      new Set([
        this.model,
        "gemini-flash-latest",
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-pro-latest",
      ])
    );

    let lastError: Error | null = null;
    for (const model of candidateModels) {
      try {
        const parsed = await postJSON<{
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        }>(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.key}`,
          {
            "Content-Type": "application/json",
          },
          {
            ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
            contents,
            generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
          }
        );
        const content = parsed.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("")
          .trim();
        if (content) return content;
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[gemini] model "${model}" failed:`, lastError.message);
      }
    }

    throw lastError || new Error("All Gemini models failed to return a response");
  }
}

// ---------- Groq ----------

class GroqProvider implements AIProvider {
  name = "groq";
  get key() {
    return process.env.GROQ_API_KEY?.trim();
  }
  get model() {
    return process.env.AI_GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  }
  isConfigured() {
    return isKey(this.key);
  }
  async chat(messages: ChatMessage[]): Promise<string> {
    const parsed = await postJSON<{
      choices?: { message?: { content?: string } }[];
    }>(
      "https://api.groq.com/openai/v1/chat/completions",
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
    const content = parsed.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response from Groq");
    return content;
  }
}

// ---------- Local sandbox fallback ----------

class LocalFallbackProvider implements AIProvider {
  name = "local";
  isEnabled() {
    return process.env.AI_ENABLE_LOCAL_FALLBACK === "true";
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
  const providers: Record<string, AIProvider> = {
    gemini: new GeminiProvider(),
    openai: new OpenAIProvider(),
    groq: new GroqProvider(),
  };

  const primaryName = process.env.AI_PROVIDER_PRIMARY?.trim().toLowerCase() || "gemini";
  const primary = providers[primaryName] || providers.gemini;

  // Order chain: primary first, then other configured external providers
  const chain: AIProvider[] = [primary];
  for (const [name, p] of Object.entries(providers)) {
    if (p !== primary && p.isConfigured()) {
      chain.push(p);
    }
  }

  // Filter only configured
  const configured = chain.filter((p) => p.isConfigured());

  const local = new LocalFallbackProvider();
  if (local.isConfigured()) configured.push(local);

  return configured;
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

