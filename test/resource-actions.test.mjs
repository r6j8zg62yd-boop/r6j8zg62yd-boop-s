import assert from "node:assert/strict";
import test from "node:test";
import {
  clearResources,
  createStore,
  deleteResource,
  fabricateResource,
  runResourceActions,
} from "../lib/resource-actions.js";
import { runAllErrors } from "../scripts/run-resource-errors.mjs";

test("fabricate collects every field error and writes nothing", () => {
  const store = createStore();
  const result = fabricateResource(store, { id: "", title: "  ", body: "" });
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((item) => item.code),
    ["missing-id", "missing-title", "missing-body"],
  );
  assert.equal(store.resources.length, 0);
});

test("fabricate rejects a duplicate id", () => {
  const store = createStore();
  assert.equal(
    fabricateResource(store, { id: "a", title: "A", body: "one" }).ok,
    true,
  );
  const again = fabricateResource(store, { id: "/a", title: "A", body: "two" });
  assert.equal(again.ok, false);
  assert.equal(again.errors[0].code, "duplicate-id");
  assert.equal(store.resources.length, 1);
});

test("delete reports a missing id and a missing resource", () => {
  const store = createStore([{ id: "a", title: "A", body: "one" }]);
  assert.equal(deleteResource(store, "  ").errors[0].code, "missing-id");
  assert.equal(deleteResource(store, "nope").errors[0].code, "not-found");
  assert.equal(store.resources.length, 1);
  assert.equal(deleteResource(store, "a").ok, true);
  assert.equal(store.resources.length, 0);
});

test("clear reports an empty store and keeps locked resources", () => {
  const empty = createStore();
  assert.equal(clearResources(empty).errors[0].code, "already-empty");

  const store = createStore([
    { id: "open", title: "Open", body: "go" },
    { id: "kept", title: "Kept", body: "stay", locked: true },
  ]);
  const cleared = clearResources(store);
  assert.equal(cleared.ok, false);
  assert.equal(cleared.errors[0].code, "locked");
  assert.deepEqual(
    store.resources.map((resource) => resource.id),
    ["kept"],
  );
});

test("runResourceActions continues after errors and returns all of them", () => {
  const store = createStore();
  const report = runResourceActions(store, [
    { action: "delete", id: "" },
    { action: "fabricate", id: "note", title: "Note", body: "body" },
    { action: "rename" },
  ]);
  assert.equal(report.ok, false);
  assert.deepEqual(
    report.errors.map((item) => item.code),
    ["missing-id", "unknown-action"],
  );
  assert.equal(store.resources[0].id, "note");
});

test("built-in run reports every known error code", () => {
  const report = runAllErrors();
  assert.deepEqual(report.missing, []);
  assert.ok(report.errors.length >= 8);
  assert.deepEqual(
    report.resources.map((resource) => resource.id),
    ["kept"],
  );
});
