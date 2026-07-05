"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyMessageButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard permission denied/unavailable — nothing sensible to do
    }
  }

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy message"}
      onClick={copy}
      className={cn(
        "text-muted-foreground/60 hover:text-foreground inline-flex items-center justify-center rounded-md p-1 transition-colors",
        className
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}
