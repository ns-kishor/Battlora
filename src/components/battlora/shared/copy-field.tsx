"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, Copy, Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

// ---------- Copy field with reveal (room credentials, PRD 15) ----------

export function CopyField({
  label,
  value,
  secret,
  hiddenUntil,
}: {
  label: string;
  value: string | null;
  secret?: boolean;
  hiddenUntil?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);

  if (hiddenUntil || value === null) {
    return (
      <div className="rounded-lg border border-border bg-background/60 px-4 py-3 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="font-mono tracking-widest">••••••••</span>
        </div>
        {hiddenUntil && (
          <p className="text-xs text-amber-400">Available at {formatDateTime(hiddenUntil)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background/60 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <span className={cn("font-mono text-sm truncate", secret && !revealed && "tracking-widest")}>
          {secret && !revealed ? "••••••••" : value}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {secret && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? "Hide value" : "Reveal value"}
            >
              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              navigator.clipboard?.writeText(value).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            aria-label={`Copy ${label}`}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Confirm dialog for destructive actions (PRD 56) ----------

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = true,
  onConfirm,
  disabled,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="bg-popover border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : ""}
            disabled={busy || disabled}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
