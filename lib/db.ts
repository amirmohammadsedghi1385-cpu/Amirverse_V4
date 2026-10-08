import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

type QueryArgs = Array<string | number | bigint | null | Uint8Array>;

type ExecuteInput = {
  sql: string;
  args?: QueryArgs;
};

class LocalDatabase {
  private sqlite: DatabaseSync;

  constructor(filename: string) {
    mkdirSync(dirname(filename), { recursive: true });
    this.sqlite = new DatabaseSync(filename);
  }

  execute(input: ExecuteInput) {
    const statement = this.sqlite.prepare(input.sql);
    const args = input.args ?? [];

    if (/^\s*(SELECT|PRAGMA|WITH)\b/i.test(input.sql)) {
      return {
        rows: statement.all(...args) as Record<string, unknown>[],
      };
    }

    const result = statement.run(...args);

    return {
      rows: [],
      changes: Number(result.changes),
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  }

  batch(statements: string[]) {
    for (const sql of statements) {
      this.sqlite.exec(sql);
    }
  }
}

const databasePath = process.env.DATABASE_URL?.startsWith("file:")
  ? process.env.DATABASE_URL.slice(5)
  : "./data/amirverse.db";

export const db = new LocalDatabase(databasePath);

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureDb() {
  if (initialized) return;

  if (!initPromise) {
    initPromise = (async () => {
      db.batch([
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`,

        `CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          expires_at TEXT NOT NULL
        )`,

        `CREATE INDEX IF NOT EXISTS idx_sessions_user_id
          ON sessions(user_id)`,

        `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
          ON sessions(expires_at)`,

        `CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          source TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`,

        `CREATE INDEX IF NOT EXISTS idx_memories_user_id_created_at
          ON memories(user_id, created_at)`,

        `CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`,

        `CREATE INDEX IF NOT EXISTS idx_messages_user_id_created_at
          ON messages(user_id, created_at)`,

        `CREATE TABLE IF NOT EXISTS preferences (
          user_id TEXT PRIMARY KEY,
          theme TEXT NOT NULL DEFAULT 'dark',
          low_power INTEGER NOT NULL DEFAULT 0,
          quality TEXT NOT NULL DEFAULT 'balanced',
          sound INTEGER NOT NULL DEFAULT 1,
          motion INTEGER NOT NULL DEFAULT 1
        )`,

        `CREATE TABLE IF NOT EXISTS artifacts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          prompt TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`,

        `CREATE INDEX IF NOT EXISTS idx_artifacts_user_id_created_at
          ON artifacts(user_id, created_at)`,

        `CREATE TABLE IF NOT EXISTS public_gallery (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          value TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`,

        `CREATE INDEX IF NOT EXISTS idx_public_gallery_created_at
          ON public_gallery(created_at)`,

        `CREATE INDEX IF NOT EXISTS idx_public_gallery_owner_id
          ON public_gallery(owner_id)`
      ]);

      db.execute({
        sql: `DELETE FROM sessions WHERE expires_at <= ?`,
        args: [new Date().toISOString()]
      });

      initialized = true;
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
}

export function newId() {
  return randomUUID();
}
