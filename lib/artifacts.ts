import { db, ensureDb, newId } from "./db";
import { cleanText } from "./validation";

export type ArtifactKind = "image" | "document" | "pdf" | "ppt";

export async function saveArtifact(userId: string, kind: ArtifactKind, title: string, prompt: string) {
  await ensureDb();
  await db.execute({ sql: `INSERT INTO artifacts (id, user_id, kind, title, prompt, created_at) VALUES (?, ?, ?, ?, ?, ?)`, args: [newId(), userId, kind, cleanText(title, 150), cleanText(prompt, 4000), new Date().toISOString()] });
}

export async function getArtifacts(userId: string, limit = 40) {
  await ensureDb();
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const result = await db.execute({ sql: `SELECT id, kind, title, prompt, created_at FROM artifacts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, args: [userId, safeLimit] });
  return result.rows.map((row: any) => ({ id: String(row.id), kind: String(row.kind), title: String(row.title), prompt: String(row.prompt), createdAt: String(row.created_at) }));
}
