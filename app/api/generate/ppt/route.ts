import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveArtifact } from "@/lib/artifacts";
import { buildContent, generatePptxFromContent } from "@/lib/generators";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "ابتدا وارد Amirverse شوید." }, { status: 401 });
  const rl = rateLimit(clientKey(request, `ppt:${user.id}`), 5, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "تعداد درخواست‌های پاورپوینت زیاد است." }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  const prompt = cleanText(body.prompt, 4000) || "یک ارائه درباره هوش مصنوعی";
  try {
    const content = await buildContent(prompt);
    const buffer = await generatePptxFromContent(content);
    await saveArtifact(user.id, "ppt", content.title, prompt);
    return new Response(buffer as BodyInit, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Content-Disposition": `attachment; filename="amirverse-presentation.pptx"`, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ppt generation error:", error);
    return NextResponse.json({ error: "ساخت پاورپوینت ناموفق بود." }, { status: 502 });
  }
}
