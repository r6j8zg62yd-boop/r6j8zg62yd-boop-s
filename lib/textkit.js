/**
 * Small text helpers shared by the web app.
 * No dependencies. Works in the browser (ES module) and in Node.
 */

export function titleCase(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b[\p{L}\p{N}]/gu, (char) => char.toUpperCase());
}

export function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function summarize(value, max = 80) {
  const text = String(value).trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
