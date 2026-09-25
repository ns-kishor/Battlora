"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, X, RotateCcw, Loader2 } from "lucide-react";
import { useAuth } from "../auth-context";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How does the scoring system work?",
  "How do I register my team for a tournament?",
  "What tournaments are open right now?",
  "What happens if someone cheats in a match?",
];

// ---------- Mini markdown renderer (safe: React nodes only) ----------

function renderInline(text: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i++}`} className="text-primary font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(
        <code
          key={`${keyPrefix}-c${i++}`}
          className="rounded bg-secondary px-1 py-0.5 font-mono text-[0.85em] text-amber-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function MarkdownLite({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = (key: string) => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={key}
        className={cn(
          "my-1.5 space-y-1 pl-4",
          list.ordered ? "list-decimal marker:text-primary" : "list-disc marker:text-primary"
        )}
      >
        {list.items.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {renderInline(item, `${key}-${i}`)}
          </li>
        ))}
      </Tag>
    );
    list = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `l${idx}`;
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,4}\s+(.*)$/);

    if (bullet) {
      if (!list || list.ordered) flush(`${key}-f`);
      list = list ?? { ordered: false, items: [] };
      list.items.push(bullet[1]);
    } else if (numbered) {
      if (!list || !list.ordered) flush(`${key}-f`);
      list = list ?? { ordered: true, items: [] };
      list.items.push(numbered[1]);
    } else {
      flush(`${key}-f`);
      if (!line.trim()) return;
      if (heading) {
        blocks.push(
          <p key={key} className="mt-2 mb-1 font-display font-bold text-sm uppercase tracking-wide text-primary">
            {renderInline(heading[1], key)}
          </p>
        );
      } else {
        blocks.push(
          <p key={key} className="leading-relaxed my-0.5">
            {renderInline(line, key)}
          </p>
        );
      }
    }
  });
  flush("tail");
  return <>{blocks}</>;
}

// ---------- Assistant panel ----------

export function AIAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setDegraded(false);
    const history = [...messages, { role: "user", content: question } as Msg];
    setMessages(history);
    setInput("");
    setBusy(true);
    try {
      const data = await api<{ reply: string; degraded?: boolean }>("/api/ai/chat", {
        json: { messages: history.slice(-16) },
      });
      setMessages([...history, { role: "assistant", content: data.reply }]);
      if (data.degraded) setDegraded(true);
    } catch (e) {
      setMessages([
        ...history,
        {
          role: "assistant",
          content:
            e instanceof Error && /hourly limit/i.test(e.message)
              ? e.message
              : "Something went wrong while contacting the assistant. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        title="Battlora AI Assistant"
        className={cn(
          "fixed bottom-4 right-4 z-[60] grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-primary/40 sm:h-14 sm:w-14",
          "bg-primary text-primary-foreground shadow-[0_0_24px_rgba(255,122,28,0.45)]",
          "transition-transform hover:scale-105 active:scale-95"
        )}
      >
        {open ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Battlora AI Assistant chat"
          className={cn(
            "fixed z-[60] flex flex-col overflow-hidden glass border border-border rounded-xl",
            "bottom-20 right-3 left-3 top-16 sm:top-auto sm:left-auto sm:right-5 sm:bottom-24",
            "sm:w-[400px] sm:h-[min(620px,calc(100vh-8rem))]"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
            <img src="/images/logo.png" alt="" aria-hidden className="logo-glow h-8 w-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold leading-tight text-sm">
                BATTLE<span className="text-primary">ORA</span> AI
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight truncate">
                {user ? `${user.name} • tournament copilot` : "Tournament copilot — public info"}
              </p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  setDegraded(false);
                }}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card/60 p-4">
                  <p className="text-sm leading-relaxed">
                    Hey! I'm the <strong className="text-primary">Battlora AI Assistant</strong>. Ask me
                    anything — tournaments, registration, scoring, rules, your matches, or any
                    general question.
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {user
                      ? "You're signed in — I can see your public platform data and your own team's info."
                      : "Sign in and I can also answer questions about your own team and registrations."}
                  </p>
                </div>
                <div className="grid gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="cursor-pointer rounded-lg border border-border bg-card/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl rounded-br-sm bg-primary/90 px-3.5 py-2 text-sm text-primary-foreground whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start gap-2">
                  <img src="/images/logo.png" alt="" aria-hidden className="logo-glow mt-0.5 h-6 w-6 shrink-0" />
                  <div
                    className={cn(
                      "max-w-[88%] rounded-xl rounded-bl-sm border px-3.5 py-2 text-sm break-words",
                      degraded && i === messages.length - 1
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-card/70"
                    )}
                  >
                    <MarkdownLite content={m.content} />
                  </div>
                </div>
              )
            )}

            {busy && (
              <div className="flex justify-start gap-2">
                <img src="/images/logo.png" alt="" aria-hidden className="logo-glow mt-0.5 h-6 w-6 shrink-0" />
                <div className="flex items-center gap-1.5 rounded-xl rounded-bl-sm border border-border bg-card/70 px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={Math.min(4, Math.max(1, input.split("\n").length))}
                placeholder="Ask anything…"
                aria-label="Message the Battlora AI assistant"
                className="max-h-24 flex-1 resize-none rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
              />
              <Button
                type="submit"
                size="icon"
                className="btn-primary-glow h-9 w-9 shrink-0"
                disabled={busy || !input.trim()}
                aria-label="Send message"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              AI guidance — verify critical details on the platform.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
