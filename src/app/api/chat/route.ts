import type OpenAI from "openai";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { MODELS, aiEnabled, aiUnconfiguredResponse, getAiClient } from "@/lib/ai/client";
import { analyzeChatImage } from "@/lib/ai/extractors";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { executeTool, toolDefinitions, type SavedEntry } from "@/lib/ai/tools";
import { putImage, readImageFile } from "@/lib/storage";

export const maxDuration = 60; // tool loops can take a few model round-trips

const MAX_HISTORY_MESSAGES = 30;
const MAX_TOOL_ITERATIONS = 6;

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    if (!aiEnabled()) return aiUnconfiguredResponse();

    const form = await request.formData().catch(() => null);
    if (!form) return Response.json({ error: "expected multipart form data" }, { status: 400 });

    const text = String(form.get("message") ?? "").trim().slice(0, 8000);
    const conversationId = String(form.get("conversationId") ?? "") || null;
    const imageFile = form.get("image");
    const hasImage = imageFile instanceof File && imageFile.size > 0;

    if (!text && !hasImage) {
      return Response.json({ error: "empty message" }, { status: 400 });
    }

    // Store the image (for the thread) and analyze it on the cheap tier
    let imageUrl: string | null = null;
    let imageAnalysisText: string | null = null;
    if (hasImage) {
      const image = await readImageFile(imageFile);
      if ("error" in image) return Response.json({ error: image.error }, { status: 400 });
      imageUrl = await putImage(image.buffer, image.contentType, `chat/${userId}`);
      const dataUrl = `data:${image.contentType};base64,${image.buffer.toString("base64")}`;
      const analysis = await analyzeChatImage({ imageDataUrl: dataUrl, caption: text });
      imageAnalysisText = analysis
        ? JSON.stringify(analysis)
        : JSON.stringify({ kind: "other", summary: "image could not be analyzed" });
    }

    // Find or create the conversation (always scoped to the user)
    const conversation = conversationId
      ? await prisma.conversation.findFirst({ where: { id: conversationId, userId } })
      : await prisma.conversation.create({
          data: { userId, title: (text || "Photo").slice(0, 60) },
        });
    if (!conversation) {
      return Response.json({ error: "conversation not found" }, { status: 404 });
    }

    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: text,
        imageUrl,
      },
    });

    // Build model messages from persisted history (text only — images
    // are represented by their analysis blocks, keeping chat-tier cheap)
    const history = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    const recent = history.slice(-MAX_HISTORY_MESSAGES);

    const session = await auth();
    const messages: Message[] = [
      { role: "system", content: await buildSystemPrompt(userId, session?.user?.name) },
    ];
    for (let i = 0; i < recent.length; i++) {
      const m = recent[i];
      const isCurrent = i === recent.length - 1;
      if (m.role === "user") {
        let content = m.content;
        if (m.imageUrl) {
          content += isCurrent && imageAnalysisText
            ? `\n\n[Image analysis: ${imageAnalysisText}]`
            : "\n\n[the user attached a photo here, analyzed earlier in the conversation]";
        }
        messages.push({ role: "user", content: content.trim() });
      } else {
        messages.push({ role: "assistant", content: m.content });
      }
    }

    // Manual tool loop on the chat tier
    const client = getAiClient();
    const savedEntries: SavedEntry[] = [];
    const toolAudit: { name: string; args: unknown; ok: boolean }[] = [];
    let finalText = "";

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await client.chat.completions.create({
        model: MODELS.chat,
        max_tokens: 1500,
        messages,
        tools: toolDefinitions,
      });

      const choice = response.choices[0];
      const message = choice?.message;
      if (!message) break;

      if (!message.tool_calls?.length) {
        finalText = message.content ?? "";
        break;
      }

      messages.push(message);
      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        let result: { content: string; saved?: SavedEntry };
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
          result = await executeTool(userId, call.function.name, args);
          if (result.saved) savedEntries.push(result.saved);
          toolAudit.push({ name: call.function.name, args, ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "tool failed";
          result = { content: JSON.stringify({ error: message }) };
          toolAudit.push({ name: call.function.name, args, ok: false });
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.content,
        });
      }
    }

    if (!finalText) {
      finalText =
        savedEntries.length > 0
          ? `Saved: ${savedEntries.map((s) => s.label).join("; ")}.`
          : "Sorry — I could not finish that. Try rephrasing?";
    }

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: finalText,
        toolCalls: toolAudit.length ? JSON.parse(JSON.stringify(toolAudit)) : undefined,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return Response.json({
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: "assistant",
        content: finalText,
        createdAt: assistantMessage.createdAt,
      },
      savedEntries,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("chat failed", error);
    return Response.json({ error: "chat failed" }, { status: 502 });
  }
}
