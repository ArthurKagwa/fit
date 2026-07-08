"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  History,
  ImagePlus,
  Loader2,
  MessageCirclePlus,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/EmptyState";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import { CopyMessageButton } from "@/components/chat/CopyMessageButton";
import { compressImage } from "@/lib/image-client";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  pending?: boolean;
};

type ConversationSummary = { id: string; title: string; updatedAt: string };

export function ChatThread({
  aiEnabled,
  conversationId: initialConversationId,
  initialMessages,
  conversations,
}: {
  aiEnabled: boolean;
  conversationId: string | null;
  initialMessages: ChatMessage[];
  conversations: ConversationSummary[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  function pickFile(picked: File | null) {
    setFile(picked);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(picked ? URL.createObjectURL(picked) : null);
  }

  async function send() {
    const text = input.trim();
    if ((!text && !file) || sending) return;

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      imageUrl: preview,
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    setSending(true);

    try {
      const form = new FormData();
      form.append("message", text);
      if (conversationId) form.append("conversationId", conversationId);
      if (file) form.append("image", await compressImage(file));
      pickFile(null);
      if (fileRef.current) fileRef.current.value = "";

      const res = await fetch("/api/chat", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(
          data?.error === "ai_unconfigured"
            ? "AI is not configured — set OPENROUTER_API_KEY."
            : "The coach didn’t answer. Try again."
        );
        setMessages((m) => m.filter((msg) => msg.id !== optimistic.id));
        setInput(text);
        return;
      }

      setMessages((m) => [...m, data.message]);
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
        window.history.replaceState(null, "", `/chat?c=${data.conversationId}`);
      }
      for (const saved of data.savedEntries ?? []) {
        toast.success(saved.label);
      }
      if (data.savedEntries?.length) router.refresh();
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col">
      <header className="flex items-center justify-between pb-3">
        <div>
          <h1 className="text-2xl font-bold">Coach</h1>
          <p className="text-muted-foreground text-sm">Log by chatting — or ask anything</p>
        </div>
        <div className="flex gap-1">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Conversation history">
                <History className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Conversations</SheetTitle>
              </SheetHeader>
              <div className="grid gap-1 overflow-y-auto px-2 pb-4">
                {conversations.length === 0 && (
                  <p className="text-muted-foreground px-2 text-sm">No conversations yet.</p>
                )}
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/chat?c=${conv.id}`}
                    onClick={() => setHistoryOpen(false)}
                    className={cn(
                      "hover:bg-accent rounded-lg px-3 py-2.5 text-sm transition-colors",
                      conv.id === conversationId && "bg-accent font-medium"
                    )}
                  >
                    <span className="line-clamp-1">{conv.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="ghost" size="icon" aria-label="New chat" asChild>
            <Link href="/chat">
              <MessageCirclePlus className="size-5" />
            </Link>
          </Button>
        </div>
      </header>

      {!aiEnabled ? (
        <EmptyState
          icon={Bot}
          title="The coach is offline"
          description="Set the OPENROUTER_API_KEY environment variable to enable the AI coach. Everything else in the app keeps working."
        />
      ) : (
        <>
          <div className="-mx-4 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
            {messages.length === 0 && (
              <EmptyState
                icon={Sparkles}
                title="Tell me what you did"
                description={'Try: "ran 5k in 26:10", "weighed 82.4 this morning", "had chicken rice for lunch" — or send a photo of your meal or run screenshot.'}
              />
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col gap-0.5",
                  m.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
                      : "bg-card rounded-bl-md border"
                  )}
                >
                  {m.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imageUrl}
                      alt="Attachment"
                      className="mb-2 max-h-48 rounded-lg object-cover"
                    />
                  )}
                  {m.role === "assistant" ? <ChatMarkdown content={m.content} /> : m.content}
                </div>
                {m.content && (
                  <CopyMessageButton text={m.content} className={m.role === "user" ? "mr-1" : "ml-1"} />
                )}
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-card flex items-center gap-1.5 rounded-2xl rounded-bl-md border px-4 py-3">
                  <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
                  <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
                  <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="bg-background border-t pt-3">
            {preview && (
              <div className="relative mb-2 w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Attachment preview" className="h-16 rounded-lg object-cover" />
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => {
                    pickFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="bg-background/80 absolute top-1 right-1 rounded-full p-0.5"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Attach photo"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
              >
                <ImagePlus className="size-5" />
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message your coach…"
                rows={1}
                className="max-h-32 min-h-10 flex-1 resize-none"
              />
              <Button
                size="icon"
                aria-label="Send"
                onClick={send}
                disabled={sending || (!input.trim() && !file)}
              >
                {sending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <SendHorizonal className="size-5" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
