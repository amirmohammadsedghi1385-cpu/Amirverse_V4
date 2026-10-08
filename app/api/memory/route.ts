import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteMemory, getMemories, saveMemory } from "@/lib/memory";
import { cleanText } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "وارد حساب شوید." }, { status: 401 });
  return NextResponse.json({ memories: await getMemories(user.id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "وارد حساب شوید." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const content = cleanText(body.content, 600);
  if (!content) return NextResponse.json({ error: "یادداشت خالی است." }, { status: 400 });
  return NextResponse.json({ memory: await saveMemory(user.id, content, cleanText(body.source || "کاربر", 30)) });
}

export async function DELETE(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "وارد حساب شوید." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = cleanText(body.id, 100);
  if (!id) return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  await deleteMemory(user.id, id);
  return NextResponse.json({ ok: true });
}
