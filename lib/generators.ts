import PDFDocument from "pdfkit";
import PptxGenJS from "pptxgenjs";
import { existsSync } from "node:fs";
import { openai, textModel } from "./openai";
import { cleanText } from "./validation";

export type GeneratedContent = {
  title: string;
  intro: string;
  slides: Array<{ title: string; bullets: string[] }>;
};

function fallbackContent(prompt: string): GeneratedContent {
  const safe = cleanText(prompt, 1500);
  const bullets = safe.split(/[.!؟\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
  return { title: "محتوای Amirverse", intro: safe, slides: [{ title: "نکات اصلی", bullets: bullets.length ? bullets : [safe] }] };
}

function parseGenerated(raw: string): GeneratedContent {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return fallbackContent(raw);
  try {
    const value = JSON.parse(cleaned.slice(start, end + 1)) as Partial<GeneratedContent>;
    const title = cleanText(value.title, 150) || "محتوای Amirverse";
    const intro = cleanText(value.intro, 900);
    const slides = Array.isArray(value.slides)
      ? value.slides.slice(0, 12).map((slide) => ({
          title: cleanText(slide?.title, 150),
          bullets: Array.isArray(slide?.bullets) ? slide.bullets.slice(0, 8).map((b) => cleanText(b, 350)).filter(Boolean) : []
        })).filter((s) => s.title)
      : [];
    return { title, intro, slides: slides.length ? slides : [{ title: "محتوا", bullets: [intro] }] };
  } catch {
    return fallbackContent(raw);
  }
}

export async function buildContent(prompt: string) {
  const safePrompt = cleanText(prompt, 4000);
  if (!openai) return fallbackContent(safePrompt);
  const response = await openai.responses.create({
    model: textModel,
    instructions: "محتوای حرفه‌ای و کاملاً فارسی تولید کن. فقط JSON معتبر بده: {title:string,intro:string,slides:[{title:string,bullets:string[]}]}. محتوا را روشن، دقیق و آماده PDF و پاورپوینت بنویس.",
    input: safePrompt
  });
  return parseGenerated(response.output_text || safePrompt);
}

function resolvePdfFont() {
  const candidates = [
    process.env.PDF_FONT_PATH,
    "C:\\Windows\\Fonts\\tahoma.ttf",
    "C:\\Windows\\Fonts\\segoeui.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
  ].filter(Boolean) as string[];
  return candidates.find((candidate) => existsSync(candidate));
}

export async function generatePdfFromContent(content: GeneratedContent) {
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  const fontPath = resolvePdfFont();
  if (fontPath) doc.font(fontPath);
  else throw new Error("یک فونت Unicode برای PDF پیدا نشد. PDF_FONT_PATH را تنظیم کن.");
  doc.fontSize(22).text(content.title, { align: "right" });
  doc.moveDown(0.5);
  doc.fontSize(11).text(content.intro, { align: "right" });
  for (const slide of content.slides) {
    doc.moveDown();
    doc.fontSize(16).text(slide.title, { align: "right" });
    doc.moveDown(0.2);
    for (const bullet of slide.bullets) doc.fontSize(11).text(`• ${bullet}`, { align: "right" });
  }
  doc.end();
  return done;
}

export async function generatePdf(prompt: string) {
  return generatePdfFromContent(await buildContent(prompt));
}

export async function generatePptxFromContent(content: GeneratedContent) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Amirverse";
  pptx.subject = content.title;
  pptx.title = content.title;
  pptx.company = "Amirverse";
  const slides = [{ title: content.title, bullets: [content.intro] }, ...content.slides];
  slides.forEach((item, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: "050A17" };
    slide.addText(item.title, { x: 0.55, y: 0.4, w: 12.15, h: 0.7, fontFace: "Vazirmatn", fontSize: index === 0 ? 28 : 23, bold: true, color: "EAF5FF", rtlMode: true, align: "right", margin: 0 });
    slide.addShape(pptx.ShapeType.line, { x: 0.55, y: 1.15, w: 12.15, h: 0, line: { color: "28D9FF", width: 1.6 } });
    slide.addText(item.bullets.map((b) => `• ${b}`).join("\n"), { x: 0.75, y: 1.48, w: 11.8, h: 4.8, fontFace: "Vazirmatn", fontSize: index === 0 ? 18 : 17, color: "D5E1F2", valign: "top", rtlMode: true, align: "right", margin: 0.04 });
  });
  return pptx.write({ outputType: "nodebuffer" }) as Promise<Buffer>;
}

export async function generatePptx(prompt: string) {
  return generatePptxFromContent(await buildContent(prompt));
}
