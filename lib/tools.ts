import { getPreferences, setPreference } from "./preferences";
import { getMemories, saveMemory } from "./memory";
import { isValidSection, isValidTheme } from "./validation";

const sectionLabels: Record<string, string> = { home: "خانه", visit: "بازدید", create: "ساخت", ai: "دستیار", memory: "حافظه", control: "مرکز کنترل" };

export const toolDefinitions = [
  {
    type: "function",
    name: "navigate",
    description: "کاربر را به یکی از بخش‌های Amirverse می‌برد.",
    parameters: { type: "object", properties: { section: { type: "string", enum: ["home", "visit", "create", "ai", "memory", "control"] } }, required: ["section"], additionalProperties: false },
    strict: true
  },
  {
    type: "function",
    name: "remember",
    description: "چیزی را که کاربر صریحاً خواسته به خاطر بسپاری، در حافظه ذخیره می‌کند.",
    parameters: { type: "object", properties: { content: { type: "string" } }, required: ["content"], additionalProperties: false },
    strict: true
  },
  {
    type: "function",
    name: "get_memory",
    description: "حافظه‌های اخیر کاربر را برای پاسخ شخصی‌سازی‌شده می‌خواند.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true
  },
  {
    type: "function",
    name: "set_theme",
    description: "حالت ظاهری سایت را تغییر می‌دهد.",
    parameters: { type: "object", properties: { theme: { type: "string", enum: ["dark", "light"] } }, required: ["theme"], additionalProperties: false },
    strict: true
  },
  {
    type: "function",
    name: "set_low_power",
    description: "حالت کم‌مصرف سه‌بعدی را روشن یا خاموش می‌کند.",
    parameters: { type: "object", properties: { enabled: { type: "boolean" } }, required: ["enabled"], additionalProperties: false },
    strict: true
  },
  {
    type: "function",
    name: "set_quality",
    description: "کیفیت رندر سه‌بعدی را انتخاب می‌کند.",
    parameters: { type: "object", properties: { quality: { type: "string", enum: ["high", "balanced", "performance"] } }, required: ["quality"], additionalProperties: false },
    strict: true
  },
  {
    type: "function",
    name: "set_motion",
    description: "انیمیشن‌های رابط کاربری را روشن یا خاموش می‌کند.",
    parameters: { type: "object", properties: { enabled: { type: "boolean" } }, required: ["enabled"], additionalProperties: false },
    strict: true
  },
  {
    type: "function",
    name: "set_sound",
    description: "صداهای محیط را روشن یا خاموش می‌کند.",
    parameters: { type: "object", properties: { enabled: { type: "boolean" } }, required: ["enabled"], additionalProperties: false },
    strict: true
  }
] as const;

export async function runTool(userId: string, name: string, args: Record<string, unknown>) {
  switch (name) {
    case "navigate": {
      if (!isValidSection(args.section)) return { output: "بخش نامعتبر است.", action: null };
      const section = String(args.section);
      return { output: `بخش ${sectionLabels[section]} باز شد.`, action: { type: "navigate", section } };
    }
    case "remember": {
      const saved = await saveMemory(userId, String(args.content), "دستیار");
      return { output: `در حافظه ذخیره شد: ${saved.content}`, action: { type: "memory_saved", memory: saved } };
    }
    case "get_memory": {
      const memories = await getMemories(userId, 14);
      return { output: JSON.stringify(memories), action: null };
    }
    case "set_theme": {
      if (!isValidTheme(args.theme)) return { output: "تم نامعتبر است.", action: null };
      await setPreference(userId, "theme", args.theme);
      return { output: `تم روی ${args.theme === "dark" ? "تاریک" : "روشن"} تنظیم شد.`, action: { type: "set_theme", theme: args.theme } };
    }
    case "set_low_power": {
      const enabled = Boolean(args.enabled);
      await setPreference(userId, "lowPower", enabled);
      return { output: `حالت کم‌مصرف ${enabled ? "روشن" : "خاموش"} شد.`, action: { type: "set_low_power", enabled } };
    }
    case "set_quality": {
      const quality = args.quality === "high" || args.quality === "performance" ? args.quality : "balanced";
      await setPreference(userId, "quality", quality);
      return { output: `کیفیت سه‌بعدی روی ${quality} قرار گرفت.`, action: { type: "set_quality", quality } };
    }
    case "set_motion": {
      const enabled = Boolean(args.enabled);
      await setPreference(userId, "motion", enabled);
      return { output: `انیمیشن‌ها ${enabled ? "روشن" : "خاموش"} شدند.`, action: { type: "set_motion", enabled } };
    }
    case "set_sound": {
      const enabled = Boolean(args.enabled);
      await setPreference(userId, "sound", enabled);
      return { output: `صدا ${enabled ? "روشن" : "خاموش"} شد.`, action: { type: "set_sound", enabled } };
    }
    default:
      return { output: "این ابزار در دسترس نیست.", action: null };
  }
}
