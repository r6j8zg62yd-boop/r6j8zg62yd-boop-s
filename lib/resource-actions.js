/**
 * Note resources and the three actions that change them: fabricate, delete, clear.
 * Each action returns every validation error it finds. runResourceActions always
 * runs the full list so a failure in one step does not hide later errors.
 */

export function createStore(resources = []) {
  return {
    resources: resources.map((resource) => ({ ...resource })),
  };
}

function error(action, code, message) {
  return { action, code, message };
}

function normalizeId(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\/+/, "");
}

/**
 * Create a resource. Collects every problem (missing id, missing body, duplicate)
 * before writing anything.
 */
export function fabricateResource(store, input = {}) {
  const errors = [];
  const id = normalizeId(input.id);
  const title = String(input.title ?? "").trim();
  const body = String(input.body ?? "").trim();

  if (!id) {
    errors.push(error("fabricate", "missing-id", "A resource id is required."));
  }
  if (!title) {
    errors.push(error("fabricate", "missing-title", "A resource title is required."));
  }
  if (!body) {
    errors.push(error("fabricate", "missing-body", "A resource body is required."));
  }
  if (id && store.resources.some((resource) => resource.id === id)) {
    errors.push(
      error("fabricate", "duplicate-id", `Resource "${id}" already exists.`),
    );
  }
  if (errors.length > 0) return { ok: false, errors };

  const resource = { id, title, body };
  if (input.locked) resource.locked = true;
  store.resources.unshift(resource);
  return { ok: true, errors: [], resource };
}

/** Remove one resource. Reports a missing id and a missing resource separately. */
export function deleteResource(store, idInput) {
  const errors = [];
  const id = normalizeId(idInput);
  if (!id) {
    errors.push(error("delete", "missing-id", "A resource id is required."));
    return { ok: false, errors };
  }
  const index = store.resources.findIndex((resource) => resource.id === id);
  if (index === -1) {
    errors.push(error("delete", "not-found", `Resource "${id}" was not found.`));
    return { ok: false, errors };
  }
  const [resource] = store.resources.splice(index, 1);
  return { ok: true, errors: [], resource };
}

/**
 * Remove every resource. An empty store is an error so callers can see that
 * clear had nothing to do. Locked resources stay and are reported one by one.
 */
export function clearResources(store) {
  const errors = [];
  if (store.resources.length === 0) {
    errors.push(error("clear", "already-empty", "There are no resources to clear."));
    return { ok: false, errors };
  }
  const locked = store.resources.filter((resource) => resource.locked);
  for (const resource of locked) {
    errors.push(
      error("clear", "locked", `Resource "${resource.id}" is locked and was kept.`),
    );
  }
  store.resources = locked.map((resource) => ({ ...resource }));
  return { ok: errors.length === 0, errors };
}

const ACTIONS = {
  fabricate: (store, step) => fabricateResource(store, step.resource ?? step),
  delete: (store, step) => deleteResource(store, step.id),
  clear: (store) => clearResources(store),
};

/**
 * Run every clear, delete, and fabricate step. Later steps still run after
 * earlier ones fail. The returned errors array is the full set.
 */
export function runResourceActions(store, steps) {
  const results = [];
  const errors = [];
  for (const step of steps) {
    const run = ACTIONS[step.action];
    if (!run) {
      const unknown = error(
        step.action || "unknown",
        "unknown-action",
        `Unknown resource action "${step.action}".`,
      );
      errors.push(unknown);
      results.push({ ok: false, errors: [unknown] });
      continue;
    }
    const result = run(store, step);
    results.push(result);
    errors.push(...result.errors);
  }
  return { ok: errors.length === 0, errors, results };
}
