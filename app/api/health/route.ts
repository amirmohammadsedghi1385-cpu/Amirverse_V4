import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureDb();
    return NextResponse.json({ ok: true, database: "ready", aiConfigured: Boolean(process.env.OPENAI_API_KEY), time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, database: "error", aiConfigured: Boolean(process.env.OPENAI_API_KEY) }, { status: 503 });
  }
}
