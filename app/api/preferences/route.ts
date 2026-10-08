import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPreferences, setPreference } from "@/lib/preferences";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "وارد حساب شوید." }, { status: 401 });
  return NextResponse.json({ preferences: await getPreferences(user.id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "وارد حساب شوید." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const key = String(body.key || "");
  if (!["theme", "lowPower", "quality", "sound", "motion"].includes(key)) return NextResponse.json({ error: "تنظیم نامعتبر است." }, { status: 400 });
  await setPreference(user.id, key as never, body.value);
  return NextResponse.json({ preferences: await getPreferences(user.id) });
}
