import { slugify, summarize, titleCase } from "../lib/textkit.js";

const form = document.querySelector("#note-form");
const list = document.querySelector("#notes");
const empty = document.querySelector("#empty");
const notes = [];

function render() {
  list.replaceChildren();
  empty.hidden = notes.length > 0;
  for (const note of notes) {
    const item = document.createElement("li");
    const heading = document.createElement("h3");
    const slug = document.createElement("p");
    const body = document.createElement("p");
    heading.textContent = note.title;
    slug.className = "slug";
    slug.textContent = note.slug;
    body.textContent = note.body;
    item.append(heading, slug, body);
    list.append(item);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const title = titleCase(data.get("title"));
  if (!title) return;
  notes.unshift({
    title,
    slug: `/${slugify(title) || "note"}`,
    body: summarize(data.get("body"), 140),
  });
  form.reset();
  render();
});

render();
