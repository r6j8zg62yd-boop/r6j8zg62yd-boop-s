#!/usr/bin/env node
/**
 * Scan lines that previous commits inserted into code and scripts.
 *
 * Usage:
 *   node scripts/scan-previous-inserts.mjs
 *   node scripts/scan-previous-inserts.mjs --json
 *
 * Exit status is 1 when a high-severity finding is present.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const CODE_EXT = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".sol",
  ".py",
  ".sh",
  ".bash",
  ".yml",
  ".yaml",
  ".html",
  ".css",
]);

const SCRIPT_BASENAMES = new Set([
  "makefile",
  "dockerfile",
  "containerfile",
]);

const RULES = [
  {
    id: "pipe-download-to-shell",
    severity: "high",
    message: "A download is piped into a shell.",
    test: (line) =>
      /\b(curl|wget)\b/i.test(line) &&
      /\|\s*(sudo\s+)?(ba)?sh\b/.test(line),
  },
  {
    id: "authorized-keys-append",
    severity: "high",
    message: "A command appends to an SSH authorized_keys file.",
    test: (line) => /authorized_keys/.test(line) && /(>>|tee)\s*/.test(line),
  },
  {
    id: "private-key-material",
    severity: "high",
    message: "A private key block was inserted.",
    test: (line) => /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/.test(line),
  },
  {
    id: "dynamic-eval",
    severity: "high",
    message: "Dynamic code evaluation was inserted.",
    test: (line) => /\beval\s*\(/.test(line) || /new\s+Function\s*\(/.test(line),
  },
  {
    id: "hardcoded-secret-assignment",
    severity: "medium",
    message: "A secret-looking literal is assigned in source.",
    test: (line) =>
      /\b(api[_-]?key|secret|password|token)\b\s*[:=]\s*['"][^'"]{8,}['"]/i.test(
        line,
      ) && !/\$\{?[A-Z0-9_]+\}?/.test(line),
  },
];

export function isScannable(filePath) {
  const base = path.basename(filePath).toLowerCase();
  if (SCRIPT_BASENAMES.has(base)) return true;
  if (base.startsWith("dockerfile")) return true;
  return CODE_EXT.has(path.extname(base));
}

export function scanLine(line) {
  const findings = [];
  for (const rule of RULES) {
    if (rule.test(line)) {
      findings.push({
        id: rule.id,
        severity: rule.severity,
        message: rule.message,
      });
    }
  }
  return findings;
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

function repoRoot(start) {
  return git(["rev-parse", "--show-toplevel"], start).trim();
}

/**
 * Added lines from `git log -p`, plus uncommitted additions from `git diff`.
 * Each item is { commit, file, line, text }.
 */
export function collectInserts(cwd) {
  const root = repoRoot(cwd);
  const inserts = [];

  const history = git(
    ["log", "--reverse", "--unified=0", "--no-color", "-p", "--", "."],
    root,
  );
  parsePatch(history, inserts, { uncommitted: false });

  if (existsSync(path.join(root, ".git"))) {
    const work = git(["diff", "--unified=0", "--no-color", "HEAD", "--", "."], root);
    parsePatch(work, inserts, { uncommitted: true });
  }

  return inserts.filter((row) => isScannable(row.file));
}

function parsePatch(patch, inserts, { uncommitted }) {
  let commit = uncommitted ? "WORKTREE" : "UNKNOWN";
  let file = "";
  let newLine = 0;

  for (const raw of patch.split("\n")) {
    if (raw.startsWith("commit ")) {
      commit = raw.slice(7).trim().slice(0, 12);
      continue;
    }
    const diffGit = raw.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (diffGit) {
      file = diffGit[2];
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (!file || raw.startsWith("+++") || raw.startsWith("---")) continue;
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      inserts.push({
        commit,
        file,
        line: newLine,
        text: raw.slice(1),
      });
      newLine += 1;
      continue;
    }
    if (raw.startsWith("\\")) continue;
    if (!raw.startsWith("-")) {
      // Context line in a non-zero unified diff.
      if (raw.startsWith(" ")) newLine += 1;
    }
  }
}

export function scanInserts(inserts) {
  const findings = [];
  for (const row of inserts) {
    for (const hit of scanLine(row.text)) {
      findings.push({ ...hit, ...row });
    }
  }
  return findings;
}

function printText(findings, scanned) {
  console.log(`Scanned ${scanned} inserted line(s) in code and scripts.`);
  if (findings.length === 0) {
    console.log("No findings.");
    return;
  }
  for (const finding of findings) {
    console.log(
      `${finding.severity.toUpperCase()} ${finding.id} ${finding.file}:${finding.line} (${finding.commit})`,
    );
    console.log(`  ${finding.message}`);
    console.log(`  ${finding.text.trim()}`);
  }
}

function main() {
  const asJson = process.argv.includes("--json");
  const root = repoRoot(process.cwd());
  const inserts = collectInserts(root);
  const findings = scanInserts(inserts);
  if (asJson) {
    console.log(JSON.stringify({ scanned: inserts.length, findings }, null, 2));
  } else {
    printText(findings, inserts.length);
  }
  if (findings.some((finding) => finding.severity === "high")) {
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isDirectRun) main();
