import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

export function generateApiKey() {
  // 32 url-safe chars
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "ft_" + Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, Math.max(0, ms)));
}
