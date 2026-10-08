import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMemories, recentMessages, saveMessage } from "@/lib/memory";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/validation";

function localAI(text: string, memories: { content: string }[]): string {
  const t = text.trim().toLowerCase();
  const pick = (items: string[]) => items[Math.floor(Math.random() * items.length)];

  if (/^(سلام|درود|های|هلو|hello|hi|سلاممم+|سلا+م)([ !؟?]|$)/i.test(t))
    return pick(["سلام امیر 👋 خوبی؟ چه خبر؟","سلام امیر 😄 بالاخره پیدات شد!","سلام 👋 من اینجام، بگو امروز چیکار داریم؟","سلام رفیق 😎 آماده‌ام."]);

  if (/خوبی|حالت چطوره|چه خبر|چطوری/.test(t))
    return pick(["خوبم 😄 تو چطوری؟","عالی‌ام، آماده‌ام کمک کنم 😎","مرسی که پرسیدی ❤️ تو چه خبر؟","خوبم رفیق، بگو ببینم چه خبر شده؟"]);

  if (/خسته ?ام|خسته شدم|حوصله ندارم|حوصلم نیست/.test(t))
    return pick(["یه استراحت کوچیک بد نیست 😌","حق داری 😅 یکم نفس بکش، من اینجام.","پس فعلاً فشار نیاریم؛ بگو دوست داری یه کار ساده انجام بدیم؟"]);

  if (/حالم خوب نیست|حالم بده|ناراحتم|اعصابم خورده|کلافه ?ام/.test(t))
    return pick(["اوه 😕 امیدوارم زودتر بهتر بشی. اگه خواستی بگو چی شده.","می‌فهمم. فعلاً آروم باش، من گوش می‌دم.","باشه رفیق، عجله‌ای نیست. بگو چی اذیتت کرده."]);

  if (/ممنون|مرسی|دمت گرم|تشکر|مچکرم|خیلی ممنون/.test(t))
    return pick(["خواهش می‌کنم ❤️","قربانت 😄","دمت گرم خودت 😎","خواهش می‌کنم رفیق."]);

  if (/خداحافظ|فعلا|فعلاً|بای|شب بخیر|شب‌ بخیر/.test(t))
    return pick(["فعلاً امیر 👋","فعلاً رفیق، مواظب خودت باش 👋","شب بخیر 🌙","بای 😄 هر وقت برگشتی من اینجام."]);

  if (/باحالی|خفنی|عالی هستی|کارت درسته/.test(t))
    return pick(["مرسی رفیق 😎","دمت گرم ❤️","قربانت، خوشحالم به کارت اومدم 😄"]);

  if (/تو کی هستی|چی هستی|خودتو معرفی|اسمت چیه|کی هستی/.test(t))
    return "من دستیار Local داخل Amirverse هستم 🤖 بدون OpenAI API کار می‌کنم و فعلاً با هسته محلی خودم باهات گفت‌وگو می‌کنم.";

  if (/امیرورس|amirverse/.test(t))
    return "Amirverse دنیای مجازی شخصی توست؛ جایی برای شهر، شرکت، اتاق‌ها، شخصیت‌ها، کارکنان، مأموریت‌ها و سیستم‌های مختلف.";

  if (/چه کار میتونی|چه کارهایی بلدی|چه کارهایی میتونی|کمک/.test(t))
    return "فعلاً می‌تونم باهات گفت‌وگو کنم، درباره Amirverse کمک کنم، حافظه رو بررسی کنم و درباره برنامه‌نویسی، Next.js، TypeScript، مهندسی برق، بازی، فوتبال و محاسبات ساده جواب بدم.";

  if (/^حافظه|یادت هست|یادته|چی یادت|چیا یادت/.test(t)) {
    if (!memories.length) return "فعلاً حافظه‌ای برای این حساب ثبت نشده.";
    return "چیزهایی که در حافظه دارم:\n" + memories.slice(0, 10).map((m) => "• " + m.content).join("\n");
  }

  if (/cpu|پردازنده|رم|ram|گرافیک|gpu|کارت گرافیک/.test(t))
    return "اگر درباره مشخصات سیستم سؤال داری، مدل CPU، RAM یا GPU رو بگو.";

  if (/برنامه نویسی|برنامه‌نویسی|کدنویسی|کد/.test(t))
    return "حتماً 👨‍💻 بگو با چه کدی مشکل داری؛ JavaScript، TypeScript، React یا Next.js؟";

  if (/next\.?js|نکست/.test(t))
    return "برای Next.js می‌تونیم Route، API، صفحه‌ها و خطاهای TypeScript رو بررسی کنیم.";

  if (/typescript|تایپ اسکریپت|tsc/.test(t))
    return "برای بررسی TypeScript از npx tsc --noEmit استفاده کن.";

  if (/برق|مهندسی برق|الکتریک|الکتریکی/.test(t))
    return "⚡ سؤال مهندسی برقت رو بگو؛ مدار، ماشین، سیستم قدرت، الکترونیک یا هر موضوع دیگه.";

  if (/فوتبال|پرسپولیس|استقلال|بارسلونا|مسی|نیمار|سوارز|pes|fifa/.test(t))
    return "⚽ بگو سؤال فوتبالی‌ات چیه.";

  if (/بازی|گیم|گیمینگ|stronghold/.test(t))
    return "🎮 اسم بازی رو بگو تا درباره‌ش صحبت کنیم.";

  const arithmetic = t.match(/^\s*(-?\d+(?:\.\d+)?)\s*(\+|-|\*|\/|×|÷)\s*(-?\d+(?:\.\d+)?)\s*$/);

  if (arithmetic) {
    const a = Number(arithmetic[1]);
    const op = arithmetic[2];
    const b = Number(arithmetic[3]);
    if ((op === "/" || op === "÷") && b === 0) return "تقسیم بر صفر تعریف نشده 😅";
    if (op === "+") return "جواب: " + (a + b);
    if (op === "-") return "جواب: " + (a - b);
    if (op === "*" || op === "×") return "جواب: " + (a * b);
    if (op === "/" || op === "÷") return "جواب: " + (a / b);
  }

  return "این جمله رو هنوز یاد نگرفتم 🤔 ولی می‌تونیم قابلیت جدیدی به هسته Local اضافه کنیم."; 
}

export async function GET() {
  const user = await getSession();

  if (!user)
    return NextResponse.json({ error: "وارد حساب شوید." }, { status: 401 });

  return NextResponse.json(
    { messages: await recentMessages(user.id, 60) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const user = await getSession();

  if (!user)
    return NextResponse.json({ error: "ابتدا وارد Amirverse شوید." }, { status: 401 });

  const rl = rateLimit(clientKey(request, "ai:" + user.id), 30, 60000);

  if (!rl.ok)
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره امتحان کن." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const text = cleanText(body.message, 5000);

  if (!text)
    return NextResponse.json({ error: "پیام خالی است." }, { status: 400 });

  await saveMessage(user.id, "user", text);

  const memories = await getMemories(user.id, 10);
  const answer = cleanText(localAI(text, memories), 12000);

  await saveMessage(user.id, "assistant", answer);

  return NextResponse.json({
    message: answer,
    actions: [],
    mode: "local"
  });
}
