import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  findErrorPages,
  isErrorPage,
  recodeErrorPage,
  recodeTree,
} from "../scripts/recode-error-pages.mjs";

test("recognizes error page file names", () => {
  assert.equal(isErrorPage("web/404.html"), true);
  assert.equal(isErrorPage("web/500.HTML"), true);
  assert.equal(isErrorPage("web/error-offline.html"), true);
  assert.equal(isErrorPage("web/index.html"), false);
  assert.equal(isErrorPage("notes/400-notes.md"), false);
});

test("strips inline scripts and javascript URLs, then adds the module once", () => {
  const dirty = `<!DOCTYPE html>
<html><body data-code="404" data-message="Missing">
<script>eval("bad")</script>
<a href="javascript:alert(1)" onclick="void 0">x</a>
</body></html>`;

  const once = recodeErrorPage(dirty);
  assert.match(once, /<script type="module" src="\.\/error-page\.js"><\/script>/);
  assert.doesNotMatch(once, /<script(?![^>]*type="module")/i);
  assert.doesNotMatch(once, /eval\(/);
  assert.doesNotMatch(once, /javascript:/i);
  assert.doesNotMatch(once, /onclick=/i);
  assert.equal(recodeErrorPage(once), once);
});

test("finds error pages under a tree and rewrites only those files", () => {
  const root = mkdtempSync(path.join(tmpdir(), "error-pages-"));
  try {
    writeFileSync(
      path.join(root, "404.html"),
      "<html><body><script>inline()</script></body></html>\n",
    );
    writeFileSync(path.join(root, "index.html"), "<html><body>board</body></html>\n");

    const found = findErrorPages(root).map((file) => path.basename(file));
    assert.deepEqual(found, ["404.html"]);

    const first = recodeTree(root);
    assert.equal(first.length, 1);
    assert.equal(first[0].changed, true);
    const written = readFileSync(path.join(root, "404.html"), "utf8");
    assert.match(written, /error-page\.js/);
    assert.equal(readFileSync(path.join(root, "index.html"), "utf8"), "<html><body>board</body></html>\n");

    const second = recodeTree(root);
    assert.equal(second[0].changed, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
