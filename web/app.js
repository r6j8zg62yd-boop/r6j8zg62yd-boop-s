import {
  clearResources,
  createStore,
  deleteResource,
  fabricateResource,
} from "../lib/resource-actions.js";
import { slugify, summarize, titleCase } from "../lib/textkit.js";

const form = document.querySelector("#note-form");
const list = document.querySelector("#notes");
const empty = document.querySelector("#empty");
const errors = document.querySelector("#errors");
const clearButton = document.querySelector("#clear-notes");
const store = createStore();

function showErrors(items) {
  errors.replaceChildren();
  errors.hidden = items.length === 0;
  for (const item of items) {
    const row = document.createElement("li");
    row.textContent = `${item.action}: ${item.message}`;
    errors.append(row);
  }
}

function render() {
  list.replaceChildren();
  empty.hidden = store.resources.length > 0;
  clearButton.disabled = store.resources.length === 0;
  for (const note of store.resources) {
    const item = document.createElement("li");
    const heading = document.createElement("h3");
    const slug = document.createElement("p");
    const body = document.createElement("p");
    const remove = document.createElement("button");
    heading.textContent = note.title;
    slug.className = "slug";
    slug.textContent = `/${note.id}`;
    body.textContent = note.body;
    remove.type = "button";
    remove.className = "ghost";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => {
      showErrors(deleteResource(store, note.id).errors);
      render();
    });
    item.append(heading, slug, body, remove);
    list.append(item);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const title = titleCase(data.get("title"));
  const result = fabricateResource(store, {
    id: slugify(title),
    title,
    body: summarize(data.get("body"), 140),
  });
  showErrors(result.errors);
  if (result.ok) form.reset();
  render();
});

clearButton.addEventListener("click", () => {
  showErrors(clearResources(store).errors);
  render();
});

render();
