import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
import { getMessages, listConversations } from "@/lib/chat-store";
import { aiEnabled } from "@/lib/ai/client";
import { ChatThread } from "@/components/chat/ChatThread";

export const metadata = { title: "Coach" };

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const { c } = await searchParams;

  const conversations = await listConversations(userId, 30);

  const active = c ? conversations.find((conv) => conv.id === c) : undefined;
  const messages = active ? await getMessages(active.id, userId, 200) : [];

  return (
    <ChatThread
      // Remount when the selected conversation changes so the thread re-seeds
      // from the new server-loaded messages (client-side nav reuses the
      // instance otherwise, leaving useState-held messages stale).
      key={active?.id ?? "new"}
      aiEnabled={aiEnabled()}
      conversationId={active?.id ?? null}
      initialMessages={messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        imageUrl: m.imageUrl,
      }))}
      conversations={conversations.map((conv) => ({
        id: conv.id,
        title: conv.title ?? "Chat",
        updatedAt: conv.updatedAt.toISOString(),
      }))}
    />
  );
}
