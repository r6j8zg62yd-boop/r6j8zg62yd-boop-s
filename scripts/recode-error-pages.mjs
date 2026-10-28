#!/usr/bin/env node
/**
 * Find static error pages and recode their scripts to the shared module.
 *
 * An error page is an HTML file whose name is a 4xx/5xx code or starts with
 * "error" (404.html, 500.html, error-offline.html).
 *
 * Recoding removes inline scripts and javascript: URLs, then leaves one
 * external module:
 *   <script type="module" src="./error-page.js"></script>
 *
 * Usage:
 *   node scripts/recode-error-pages.mjs            # rewrite pages under web/
 *   node scripts/recode-error-pages.mjs --check    # exit 1 if a rewrite is needed
 *   node scripts/recode-error-pages.mjs --json
 *   node scripts/recode-error-pages.mjs --root web
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PROPER_SCRIPT_SRC = "./error-page.js";

const ERROR_PAGE_NAME =
  /^(?:[45]\d\d|error)(?:[-_.].*)?\.html?$/i;

const INLINE_OR_ANY_SCRIPT =
  /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;

export function isErrorPage(filePath) {
  return ERROR_PAGE_NAME.test(path.basename(filePath));
}

/**
 * Return HTML that uses only the shared error-page module.
 * Already-correct pages are returned unchanged.
 */
export function recodeErrorPage(html, scriptSrc = PROPER_SCRIPT_SRC) {
  const proper = `<script type="module" src="${scriptSrc}"></script>`;
  let next = html.replace(INLINE_OR_ANY_SCRIPT, "");
  next = next.replace(
    /\s(?:href|src)\s*=\s*(['"])\s*javascript:[^'"]*\1/gi,
    "",
  );
  next = next.replace(/\son[a-z]+\s*=\s*(['"])[^'"]*\1/gi, "");
  next = next.replace(/[ \t]+$/gm, "");
  next = next.replace(/\n{3,}/g, "\n\n");

  if (/<\/body>/i.test(next)) {
    next = next.replace(/\s*<\/body>/i, `\n    ${proper}\n  </body>`);
  } else {
    next = `${next.replace(/\s*$/, "")}\n${proper}`;
  }
  if (!next.endsWith("\n")) next += "\n";
  return next;
}

export function findErrorPages(rootDir) {
  const found = [];
  walk(rootDir, found);
  found.sort();
  return found;
}

function walk(dir, found) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".git" || name === "out" || name === "cache") {
      continue;
    }
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, found);
      continue;
    }
    if (st.isFile() && isErrorPage(full)) found.push(full);
  }
}

export function recodeTree(rootDir, { write = true } = {}) {
  const pages = [];
  for (const file of findErrorPages(rootDir)) {
    const before = readFileSync(file, "utf8");
    const after = recodeErrorPage(before);
    const changed = after !== before;
    if (write && changed) writeFileSync(file, after);
    pages.push({
      file: path.relative(rootDir, file).split(path.sep).join("/"),
      changed,
    });
  }
  return pages;
}

function repoWebDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../web");
}

function printText(pages) {
  if (pages.length === 0) {
    console.log("No error pages found.");
    return;
  }
  for (const page of pages) {
    console.log(`${page.changed ? "recoded" : "ok"} ${page.file}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const check = args.includes("--check");
  const rootFlag = args.indexOf("--root");
  const root = rootFlag >= 0 && args[rootFlag + 1]
    ? path.resolve(args[rootFlag + 1])
    : repoWebDir();

  const pages = recodeTree(root, { write: !check });
  if (asJson) {
    console.log(JSON.stringify({ root, pages }, null, 2));
  } else {
    printText(pages);
  }
  if (check && pages.some((page) => page.changed)) {
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) main();
