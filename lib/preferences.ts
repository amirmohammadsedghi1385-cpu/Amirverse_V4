import { db, ensureDb } from "./db";

export type Preferences = { theme: "dark" | "light"; lowPower: boolean; quality: "high" | "balanced" | "performance"; sound: boolean; motion: boolean };

const defaults: Preferences = { theme: "dark", lowPower: false, quality: "balanced", sound: true, motion: true };

export async function getPreferences(userId: string): Promise<Preferences> {
  await ensureDb();
  const result = await db.execute({ sql: `SELECT theme, low_power, quality, sound, motion FROM preferences WHERE user_id = ?`, args: [userId] });
  const row = result.rows[0] as unknown as { theme: string; low_power: number; quality: string; sound: number; motion: number } | undefined;
  if (!row) return defaults;
  return {
    theme: row.theme === "light" ? "light" : "dark",
    lowPower: Boolean(row.low_power),
    quality: row.quality === "high" ? "high" : row.quality === "performance" ? "performance" : "balanced",
    sound: Boolean(row.sound),
    motion: Boolean(row.motion)
  };
}

export async function setPreference(userId: string, key: keyof Preferences, value: string | number | boolean) {
  await ensureDb();
  if (key === "theme") {
    await db.execute({ sql: `INSERT INTO preferences (user_id, theme) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET theme=excluded.theme`, args: [userId, value === "light" ? "light" : "dark"] });
  } else if (key === "lowPower") {
    await db.execute({ sql: `INSERT INTO preferences (user_id, low_power) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET low_power=excluded.low_power`, args: [userId, value ? 1 : 0] });
  } else if (key === "quality") {
    const quality = value === "high" || value === "performance" ? value : "balanced";
    await db.execute({ sql: `INSERT INTO preferences (user_id, quality) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET quality=excluded.quality`, args: [userId, quality] });
  } else if (key === "sound") {
    await db.execute({ sql: `INSERT INTO preferences (user_id, sound) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET sound=excluded.sound`, args: [userId, value ? 1 : 0] });
  } else if (key === "motion") {
    await db.execute({ sql: `INSERT INTO preferences (user_id, motion) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET motion=excluded.motion`, args: [userId, value ? 1 : 0] });
  }
}
