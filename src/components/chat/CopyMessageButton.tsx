"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyMessageButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — try selecting the text instead.");
    }
  }

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy message"}
      onClick={copy}
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors active:scale-95",
        className
      )}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
