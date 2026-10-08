import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveArtifact } from "@/lib/artifacts";
import { openai, imageModel } from "@/lib/openai";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "ابتدا وارد Amirverse شوید." }, { status: 401 });
  const rl = rateLimit(clientKey(request, `image:${user.id}`), 5, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "درخواست تصویر زیادی ارسال شده؛ کمی بعد دوباره امتحان کن." }, { status: 429 });
  if (!openai) return NextResponse.json({ error: "OPENAI_API_KEY تنظیم نشده است." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const prompt = cleanText(body.prompt, 4000);
  if (!prompt) return NextResponse.json({ error: "توضیح تصویر را وارد کن." }, { status: 400 });
  try {
    const result = await openai.images.generate({ model: imageModel, prompt, size: "1024x1024" });
    const data = result.data?.[0]?.b64_json;
    if (!data) return NextResponse.json({ error: "تصویر تولید نشد." }, { status: 502 });
    await saveArtifact(user.id, "image", "تصویر تولیدشده", prompt);
    return NextResponse.json({ dataUrl: `data:image/png;base64,${data}` });
  } catch (error) {
    console.error("image generation error:", error);
    return NextResponse.json({ error: "تولید تصویر ناموفق بود. بعداً دوباره امتحان کن." }, { status: 502 });
  }
}
