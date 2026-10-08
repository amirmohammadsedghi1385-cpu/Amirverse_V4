import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db, ensureDb } from "./db";

const COOKIE_NAME = "amirverse_session";
const DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUser(name: string, email: string, password: string) {
  await ensureDb();
  const normalized = email.trim().toLowerCase();
  const safeName = name.trim().slice(0, 60);
  const passwordHash = await bcrypt.hash(password, 12);
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
    args: [id, safeName, normalized, passwordHash, new Date().toISOString()]
  });
  await db.execute({ sql: `INSERT OR IGNORE INTO preferences (user_id) VALUES (?)`, args: [id] });
  return { id, name: safeName, email: normalized };
}

export async function verifyUser(email: string, password: string) {
  await ensureDb();
  const result = await db.execute({ sql: `SELECT id, name, email, password_hash FROM users WHERE email = ?`, args: [email.trim().toLowerCase()] });
  const row = result.rows[0] as unknown as { id: string; name: string; email: string; password_hash: string } | undefined;
  if (!row || !(await bcrypt.compare(password, row.password_hash))) return null;
  return { id: row.id, name: row.name, email: row.email };
}

export async function startSession(userId: string) {
  await ensureDb();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + DAYS * 86400000).toISOString();
  await db.execute({ sql: `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`, args: [hashToken(token), userId, expires] });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
    maxAge: DAYS * 86400,
    priority: "high"
  });
}

export async function getSession() {
  await ensureDb();
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token || token.length < 20) return null;
  const hashed = hashToken(token);
  const result = await db.execute({
    sql: `SELECT u.id, u.name, u.email, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
    args: [hashed]
  });
  const row = result.rows[0] as unknown as { id: string; name: string; email: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db.execute({ sql: `DELETE FROM sessions WHERE token_hash = ?`, args: [hashed] });
    store.delete(COOKIE_NAME);
    return null;
  }
  return { id: row.id, name: row.name, email: row.email };
}

export async function endSession() {
  await ensureDb();
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await db.execute({ sql: `DELETE FROM sessions WHERE token_hash = ?`, args: [hashToken(token)] });
  store.delete(COOKIE_NAME);
}
