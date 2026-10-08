import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveArtifact } from "@/lib/artifacts";
import { buildContent, generatePdfFromContent } from "@/lib/generators";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "ابتدا وارد Amirverse شوید." }, { status: 401 });
  const rl = rateLimit(clientKey(request, `pdf:${user.id}`), 5, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "تعداد درخواست‌های PDF زیاد است." }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  const prompt = cleanText(body.prompt, 4000) || "یک مقاله درباره هوش مصنوعی";
  try {
    const content = await buildContent(prompt);
    const buffer = await generatePdfFromContent(content);
    await saveArtifact(user.id, "pdf", content.title, prompt);
    return new Response(buffer as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="amirverse-document.pdf"`, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("pdf generation error:", error);
    return NextResponse.json({ error: "ساخت PDF ناموفق بود. برای PDF فارسی، PDF_FONT_PATH را روی یک فونت Unicode تنظیم کن." }, { status: 502 });
  }
}
