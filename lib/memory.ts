import { db, ensureDb, newId } from "./db";
import { cleanText } from "./validation";

export async function getMemories(userId: string, limit = 50) {
  await ensureDb();
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const result = await db.execute({ sql: `SELECT id, content, source, created_at FROM memories WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, args: [userId, safeLimit] });
  return result.rows.map((row: any) => ({ id: String(row.id), content: String(row.content), source: String(row.source), createdAt: String(row.created_at) }));
}

export async function saveMemory(userId: string, content: string, source = "کاربر") {
  await ensureDb();
  const safe = cleanText(content, 600);
  if (!safe) throw new Error("یادداشت خالی است.");
  const id = newId();
  const createdAt = new Date().toISOString();
  await db.execute({ sql: `INSERT INTO memories (id, user_id, content, source, created_at) VALUES (?, ?, ?, ?, ?)`, args: [id, userId, safe, source.slice(0, 30), createdAt] });
  return { id, content: safe, source: source.slice(0, 30), createdAt };
}

export async function deleteMemory(userId: string, id: string) {
  await ensureDb();
  await db.execute({ sql: `DELETE FROM memories WHERE id = ? AND user_id = ?`, args: [id, userId] });
}

export async function saveMessage(userId: string, role: "user" | "assistant", content: string) {
  await ensureDb();
  await db.execute({ sql: `INSERT INTO messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`, args: [newId(), userId, role, cleanText(content, 12000), new Date().toISOString()] });
}

export async function recentMessages(userId: string, limit = 20) {
  await ensureDb();
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const result = await db.execute({ sql: `SELECT role, content FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, args: [userId, safeLimit] });
  return result.rows.reverse().map((row: any) => ({ role: String(row.role) as "user" | "assistant", content: String(row.content) }));
}
