import { NextResponse } from "next/server";
import { createUser, startSession, verifyUser, endSession, getSession } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { cleanText, isValidEmail } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSession();
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const isSensitive = action === "login" || action === "register";
  if (isSensitive) {
    const rl = rateLimit(clientKey(request, "auth"), 8, 10 * 60_000);
    if (!rl.ok) return NextResponse.json({ error: "تعداد تلاش‌ها زیاد است. چند دقیقه بعد دوباره امتحان کن." }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } });
  }

  try {
    if (action === "register") {
      const name = cleanText(body.name, 60);
      const email = cleanText(body.email, 254).toLowerCase();
      const password = String(body.password || "");
      if (name.length < 2 || !isValidEmail(email) || password.length < 8 || password.length > 128) {
        return NextResponse.json({ error: "نام معتبر، ایمیل معتبر و گذرواژه ۸ تا ۱۲۸ کاراکتری لازم است." }, { status: 400 });
      }
      const user = await createUser(name, email, password);
      await startSession(user.id);
      return NextResponse.json({ user });
    }
    if (action === "login") {
      const email = cleanText(body.email, 254).toLowerCase();
      const password = String(body.password || "");
      if (!isValidEmail(email) || password.length < 1 || password.length > 128) return NextResponse.json({ error: "اطلاعات ورود نامعتبر است." }, { status: 400 });
      const user = await verifyUser(email, password);
      if (!user) return NextResponse.json({ error: "ایمیل یا گذرواژه نادرست است." }, { status: 401 });
      await startSession(user.id);
      return NextResponse.json({ user });
    }
    if (action === "logout") {
      await endSession();
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const duplicate = /UNIQUE/i.test(msg);
    return NextResponse.json({ error: duplicate ? "این ایمیل قبلاً ثبت شده است." : "انجام عملیات ممکن نشد." }, { status: duplicate ? 409 : 500 });
  }
}
