// The Markdown pages' rendering, on small files: each copied file's page path, the links it
// rewrites (to a copied file's page, relative to the linking page, its fragment kept; to an
// external file's blob at the pinned commit), the links it passes through, and the build failing
// on a relative link it can't place. The front matter is parsed and never rendered, and headings
// carry GitHub's ids, counted per page. The browser tier crawls the built pages themselves.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { pageFile, pageUrl, render } from "../../markdown-pages.ts";
import type { Source } from "../../markdown-pages.ts";

const source: Source = {
  pages: new Set(["README.md", "a.md", "dir/README.md", "dir/b.md"]),
  external: new Set(["LICENSE"]),
  repository: "https://github.com/owner/repo",
  ref: "0123456789abcdef0123456789abcdef01234567",
};

/** The href of each link the body renders, in order. */
const hrefs = (html: string): string[] => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

/** A copied file of front matter and the body. */
const file = (body: string): string => `---\nkey: k\nname: The name\n---\n\n${body}`;

describe("the Markdown pages", () => {
  test("build each file to its page, a README to its directory's index", () => {
    assert.deepEqual(["README.md", "a.md", "dir/README.md", "dir/b.md"].map(pageFile), [
      "index.html",
      "a.html",
      "dir/index.html",
      "dir/b.html",
    ]);
    assert.equal(pageUrl("dir/b.md", "README.md"), "../");
    assert.equal(pageUrl("README.md", "dir/README.md"), "dir/");
    assert.equal(pageUrl("dir/README.md", "dir/README.md"), "./");
    assert.equal(pageUrl("a.md", "dir/b.md"), "dir/b.html");
  });

  test("rewrite each relative link to a copied or external file, the rest passed through", () => {
    const { html } = render(
      "dir/b.md",
      file(
        "[a](../a.md) [b](b.md#x) [i](README.md) [r](../README.md#y) [l](../LICENSE#z) " +
          "[f](#f) [w](https://example.com/c.md) [m](mailto:x@example.com)",
      ),
      source,
    );
    assert.deepEqual(hrefs(html), [
      "../a.html",
      "b.html#x",
      "./",
      "../#y",
      `${source.repository}/blob/${source.ref}/LICENSE#z`,
      "#f",
      "https://example.com/c.md",
      "mailto:x@example.com",
    ]);
  });

  test("fail on a relative link to a file neither copied nor external", () => {
    for (const href of ["c.md", "../dir/c.md#x", "../../a.md", "/a.md", "NOTICE", "a.md?x"]) {
      assert.throws(
        () => render("dir/b.md", file(`[x](${href})`), source),
        /dir\/b\.md links .*neither a copied file nor a listed external one/,
        href,
      );
    }
  });

  test("parse the front matter, never rendering it", () => {
    const { data, html } = render("a.md", file("Body."), source);
    assert.deepEqual(data, { key: "k", name: "The name" });
    assert.equal(html, "<p>Body.</p>\n");
    assert.throws(() => render("a.md", "# No front matter\n", source), /a\.md has no leading/);
    assert.throws(() => render("a.md", "---\nkey: k\n---\n", source), /a\.md's front matter/);
  });

  test("give headings GitHub's ids, counted from none on each page", () => {
    const body = file("# A CLI domain's commands\n\n## Same\n\n## Same\n");
    const ids = (html: string) => [...html.matchAll(/id="([^"]*)"/g)].map((m) => m[1]);
    const want = ["a-cli-domains-commands", "same", "same-1"];
    assert.deepEqual(ids(render("a.md", body, source).html), want);
    assert.deepEqual(ids(render("a.md", body, source).html), want);
  });
});
