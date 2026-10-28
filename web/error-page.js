/**
 * Shared behavior for static error documents (404, 500, and similarly named pages).
 * The page sets data-code and data-message on <body>. This module fills the
 * visible code, message, and document title, and points the home link at the board.
 */

const body = document.body;
const code = (body?.dataset.code || "").trim();
const message = (body?.dataset.message || "Something went wrong.").trim();

const codeNode = document.querySelector("[data-error-code]");
const messageNode = document.querySelector("[data-error-message]");
const home = document.querySelector("[data-error-home]");

if (codeNode && code) codeNode.textContent = code;
if (messageNode) messageNode.textContent = message;

if (code) {
  document.title = `${code} ${message}`;
} else if (message) {
  document.title = message;
}

if (home && !home.getAttribute("href")) {
  home.setAttribute("href", "./");
}
