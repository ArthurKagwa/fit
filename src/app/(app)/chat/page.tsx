import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
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

  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { id: true, title: true, updatedAt: true },
  });

  const active = c ? conversations.find((conv) => conv.id === c) : undefined;
  const messages = active
    ? await prisma.chatMessage.findMany({
        where: { conversationId: active.id },
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true, role: true, content: true, imageUrl: true, createdAt: true },
      })
    : [];

  return (
    <ChatThread
      aiEnabled={aiEnabled()}
      conversationId={active?.id ?? null}
      initialMessages={messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
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
