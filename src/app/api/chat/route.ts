import type OpenAI from "openai";
import { requireUserId } from "@/lib/session";
import {
  appendMessage,
  createConversation,
  getConversation,
  getMessages,
} from "@/lib/chat-store";
import { auth } from "@/auth";
import {
  MODELS,
  aiEnabled,
  aiUnconfiguredResponse,
  fleetRouting,
  getAiClient,
  looksGarbled,
  looksLikeReasoning,
  stripReasoning,
} from "@/lib/ai/client";
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
    let convId: string;
    if (conversationId) {
      const existing = await getConversation(conversationId, userId);
      if (!existing) {
        return Response.json({ error: "conversation not found" }, { status: 404 });
      }
      convId = existing._id.toHexString();
    } else {
      convId = await createConversation(userId, (text || "Photo").slice(0, 60));
    }

    await appendMessage(convId, { role: "user", content: text, imageUrl });

    // Build model messages from persisted history (text only — images
    // are represented by their analysis blocks, keeping chat-tier cheap)
    const history = await getMessages(convId, userId, 200);
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

    async function chatOnce() {
      const response = await client.chat.completions.create({
        ...fleetRouting(MODELS.chat),
        // Safety ceiling, not the enforcement mechanism — the persona asks for ~500
        // words, but markdown/table/emoji overhead eats tokens faster than prose, so
        // this is set well above that to avoid truncating mid-sentence.
        max_tokens: 1400,
        messages,
        tools: toolDefinitions,
      });

      // OpenRouter can return a 200 whose body is an error object (no `choices`)
      // when every fallback model fails (e.g. all rate-limited). Surface it
      // instead of crashing on `response.choices[0]`.
      const apiError = (response as { error?: { message?: string } }).error;
      if (apiError || !response.choices?.length) {
        console.error("chat model error", apiError ?? response);
        return { error: apiError?.message ?? "No model available." } as const;
      }
      return { message: response.choices[0]?.message } as const;
    }

    let badReplyRetries = 0;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const result = await chatOnce();
      if ("error" in result) {
        return Response.json(
          { error: "model_unavailable", message: result.error },
          { status: 502 }
        );
      }

      const message = result.message;
      if (!message) break;

      if (!message.tool_calls?.length) {
        const text = stripReasoning(message.content ?? "");
        if (looksGarbled(text) || looksLikeReasoning(text)) {
          // Free models occasionally degrade into mixed-script gibberish, or leak
          // their planning ("we need to call create_plan...") as the final reply
          // instead of acting. Retry once by just looping again on the same
          // messages — if the model calls the tool properly this time, the
          // normal tool-handling branch below picks it up.
          if (badReplyRetries < 1) {
            badReplyRetries++;
            console.error("chat model produced a bad reply, retrying", {
              preview: text.slice(0, 200),
            });
            continue;
          }
          finalText = "Sorry — I got stuck putting that together. Could you try asking again?";
          break;
        }
        finalText = text;
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
          ? `${savedEntries.map((s) => s.label).join("; ")}.`
          : "Sorry — I could not finish that. Try rephrasing?";
    }

    // appendMessage also bumps the conversation's updatedAt.
    const assistantMessage = await appendMessage(convId, {
      role: "assistant",
      content: finalText,
      toolCalls: toolAudit.length ? toolAudit : undefined,
    });

    return Response.json({
      conversationId: convId,
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
