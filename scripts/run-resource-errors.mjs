#!/usr/bin/env node
/**
 * Run clear, delete, and fabricate resource actions and print every error.
 *
 *   node scripts/run-resource-errors.mjs
 *   node scripts/run-resource-errors.mjs --json
 *   node scripts/run-resource-errors.mjs --steps steps.json
 *
 * With no steps file, a built-in sequence exercises each error code. Exit
 * status is 1 when any error is reported, unless --expect-errors is set.
 * --expect-errors checks that the built-in sequence reports every known code
 * and exits 0 only when that set is complete.
 */

import { readFileSync } from "node:fs";
import { createStore, runResourceActions } from "../lib/resource-actions.js";

const EXPECTED_CODES = [
  "missing-id",
  "missing-title",
  "missing-body",
  "duplicate-id",
  "not-found",
  "already-empty",
  "locked",
  "unknown-action",
];

/** Sequence that produces every known error code, then continues. */
export function builtinScenario() {
  const store = createStore();
  const steps = [
    { action: "clear" },
    { action: "fabricate", id: "", title: "", body: "" },
    { action: "fabricate", id: "launch-notes", title: "Launch notes", body: "Ship it." },
    { action: "fabricate", id: "launch-notes", title: "Launch notes", body: "Again." },
    { action: "delete", id: "" },
    { action: "delete", id: "missing-note" },
    {
      action: "fabricate",
      id: "kept",
      title: "Kept",
      body: "Locked on purpose.",
      locked: true,
    },
    { action: "clear" },
    { action: "noop" },
  ];
  return { store, steps };
}

function parseArgs(argv) {
  const args = { json: false, expectErrors: false, stepsPath: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg === "--expect-errors") args.expectErrors = true;
    else if (arg === "--steps") {
      args.stepsPath = argv[i + 1] || "";
      i += 1;
    } else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument "${arg}".`);
  }
  return args;
}

function loadSteps(stepsPath) {
  const raw = JSON.parse(readFileSync(stepsPath, "utf8"));
  if (!Array.isArray(raw)) throw new Error("Steps file must be a JSON array.");
  return raw;
}

export function runAllErrors(options = {}) {
  const scenario = options.steps
    ? { store: createStore(options.resources ?? []), steps: options.steps }
    : builtinScenario();
  const report = runResourceActions(scenario.store, scenario.steps);
  const codes = report.errors.map((item) => item.code);
  const missing = EXPECTED_CODES.filter((code) => !codes.includes(code));
  return {
    ...report,
    resources: scenario.store.resources,
    codes,
    missing,
  };
}

function printHelp() {
  console.log(`Usage: node scripts/run-resource-errors.mjs [--json] [--expect-errors] [--steps file.json]

Runs fabricate, delete, and clear, and prints every error from the full run.
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const report = runAllErrors(
    args.stepsPath ? { steps: loadSteps(args.stepsPath) } : {},
  );
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const item of report.errors) {
      console.log(`${item.action}\t${item.code}\t${item.message}`);
    }
    if (report.errors.length === 0) console.log("No resource errors.");
  }
  if (args.expectErrors) {
    if (args.stepsPath) {
      console.error("--expect-errors only applies to the built-in scenario.");
      process.exitCode = 1;
      return;
    }
    if (report.missing.length > 0) {
      console.error(`Missing error codes: ${report.missing.join(", ")}`);
      process.exitCode = 1;
    }
    return;
  }
  if (report.errors.length > 0) process.exitCode = 1;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("run-resource-errors.mjs");
if (invokedDirectly) main();
