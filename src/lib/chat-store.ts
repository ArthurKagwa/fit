import { MongoClient, ObjectId, type Db } from "mongodb";
import { randomUUID } from "node:crypto";

/**
 * Chat persistence in MongoDB.
 *
 * Conversations live in a single document store — each conversation embeds its
 * messages as an array, so the whole thread reads/writes in one document. This
 * is the natural NoSQL shape for bounded, always-loaded-together chat threads
 * (we cap history reads), and it keeps the relational Postgres schema focused
 * on the structured fitness data (runs, meals, goals, ...).
 */

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB ?? "fit";

// Reuse a single client across HMR reloads in dev (same pattern as the Prisma client).
const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
  _mongoDb?: Promise<Db>;
};

const client = globalForMongo._mongoClient ?? new MongoClient(uri);
if (process.env.NODE_ENV !== "production") globalForMongo._mongoClient = client;

function getDb(): Promise<Db> {
  globalForMongo._mongoDb ??= client.connect().then((c) => c.db(dbName));
  return globalForMongo._mongoDb;
}

export type ChatRole = "user" | "assistant";

export type StoredMessage = {
  id: string;
  role: ChatRole;
  content: string;
  imageUrl?: string | null;
  toolCalls?: unknown;
  createdAt: Date;
};

type ConversationDoc = {
  _id: ObjectId;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: StoredMessage[];
};

export type ConversationSummary = { id: string; title: string; updatedAt: Date };

async function conversations() {
  return (await getDb()).collection<ConversationDoc>("conversations");
}

/** Creates an empty conversation and returns its id (Mongo ObjectId hex string). */
export async function createConversation(userId: string, title: string): Promise<string> {
  const now = new Date();
  const col = await conversations();
  const _id = new ObjectId();
  await col.insertOne({ _id, userId, title, createdAt: now, updatedAt: now, messages: [] });
  return _id.toHexString();
}

/** Loads a conversation scoped to its owner, or null if missing / not theirs. */
export async function getConversation(id: string, userId: string): Promise<ConversationDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await conversations();
  return col.findOne({ _id: new ObjectId(id), userId });
}

/** Appends a message to a conversation and bumps its updatedAt. Returns the stored message. */
export async function appendMessage(
  conversationId: string,
  message: { role: ChatRole; content: string; imageUrl?: string | null; toolCalls?: unknown }
): Promise<StoredMessage> {
  const stored: StoredMessage = {
    id: randomUUID(),
    role: message.role,
    content: message.content,
    imageUrl: message.imageUrl ?? null,
    createdAt: new Date(),
    ...(message.toolCalls !== undefined && message.toolCalls !== null
      ? { toolCalls: message.toolCalls }
      : {}),
  };
  const col = await conversations();
  await col.updateOne(
    { _id: new ObjectId(conversationId) },
    { $push: { messages: stored }, $set: { updatedAt: stored.createdAt } }
  );
  return stored;
}

/** Returns the most recent `limit` messages of a conversation, oldest-first. */
export async function getMessages(
  id: string,
  userId: string,
  limit = 200
): Promise<StoredMessage[]> {
  const conv = await getConversation(id, userId);
  if (!conv) return [];
  return conv.messages.slice(-limit);
}

/** Lists a user's conversations (no message bodies) for the history sidebar. */
export async function listConversations(userId: string, limit = 30): Promise<ConversationSummary[]> {
  const col = await conversations();
  const docs = await col
    .find({ userId }, { projection: { title: 1, updatedAt: 1 } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => ({ id: d._id.toHexString(), title: d.title, updatedAt: d.updatedAt }));
}
