"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * navigator.clipboard needs a "secure context" (HTTPS, or exactly `localhost`) —
 * it's undefined on plain http://<lan-ip>:3000, which is how this app is most
 * often opened on a phone during local dev. Fall back to the old
 * execCommand("copy") trick (via a hidden textarea) there.
 */
function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

export function CopyMessageButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) ok = legacyCopy(text);

    if (ok) {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } else {
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
