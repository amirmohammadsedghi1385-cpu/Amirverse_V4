export function cleanText(value: unknown, max = 4000) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function isValidTheme(value: unknown): value is "dark" | "light" {
  return value === "dark" || value === "light";
}

export function isValidSection(value: unknown): value is "home" | "visit" | "create" | "ai" | "memory" | "control" {
  return ["home", "visit", "create", "ai", "memory", "control"].includes(String(value));
}
