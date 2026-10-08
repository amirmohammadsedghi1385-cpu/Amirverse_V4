import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveArtifact } from "@/lib/artifacts";
import { buildContent } from "@/lib/generators";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "ابتدا وارد Amirverse شوید." }, { status: 401 });
  const rl = rateLimit(clientKey(request, `document:${user.id}`), 10, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "تعداد درخواست‌ها زیاد است." }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  const prompt = cleanText(body.prompt, 4000) || "یک متن حرفه‌ای درباره هوش مصنوعی";
  try {
    const content = await buildContent(prompt);
    await saveArtifact(user.id, "document", content.title, prompt);
    return NextResponse.json(content);
  } catch {
    return NextResponse.json({ error: "تولید سند ناموفق بود." }, { status: 502 });
  }
}
