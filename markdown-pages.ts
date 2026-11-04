// The Markdown pages: a Vite plugin that renders every Markdown file of one directory, copied
// byte for byte from a source repository at a pinned commit, into an HTML page of the build. Each
// page is a virtual .html input: the plugin loads it, the site's shell filled with the file's
// title and its rendered body, and Vite's own HTML build transforms it as it does a page on disk,
// naming its output by its path under the root. Nothing is written to the working tree.
//
// A file's page is its path with .md turned to .html, except a README.md, which is its
// directory's index.html, so the copied tree's root README.md is the site's index. The leading
// YAML front matter is parsed, never rendered: its name is the page's title. Headings carry
// GitHub's ids (marked-gfm-heading-id), so a fragment written against the source on GitHub
// resolves here. A relative link to a copied file is rewritten to that file's page, relative to
// the linking page, its fragment kept; one to a file listed as external, present in the source
// but not copied, to the file's blob on GitHub at the pinned commit; any other relative link fails
// the build, naming the page and the link, so no link is left to break. A fragment alone, or a
// URL with a scheme, passes through.
//
// Nothing here names a site or a source: a site that copies this module configures it with its
// content directory, its source repository's URL and pinned commit, and its external files.

import { readdirSync, readFileSync } from "node:fs";
import { join, posix, resolve } from "node:path";

import { Marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { normalizePath } from "vite";
import type { Plugin } from "vite";
import { parse } from "yaml";

/** The copied tree and its source, as the plugin is configured. */
export interface Options {
  /** The directory, under the root, holding the copied Markdown files. */
  dir: string;
  /** The source repository's URL, as GitHub serves it: https://github.com/<owner>/<repo>. */
  repository: string;
  /** The full commit the files were copied at, which every blob URL pins. */
  ref: string;
  /** Paths, relative to the copied tree's root, that exist in the source at the commit and aren't
   * copied: a link to one is rewritten to its blob URL. */
  external?: string[];
  /** The shell each page fills, under the root: one <title> and one empty <main></main>. */
  shell?: string;
}

/** What a page's links are placed against: the copied files and the source. */
export interface Source {
  pages: ReadonlySet<string>;
  external: ReadonlySet<string>;
  repository: string;
  ref: string;
}

/** A rendered file: its front matter and its body's HTML. */
export interface Rendered {
  data: Record<string, unknown>;
  html: string;
}

/** The page a copied file builds to, under the root: x.md is x.html, and dir/README.md is
 * dir/index.html. */
export function pageFile(path: string): string {
  if (posix.basename(path) === "README.md") return posix.join(posix.dirname(path), "index.html");
  return path.replace(/\.md$/, ".html");
}

/** The URL of the copied file to's page, relative to the page of the copied file from: a
 * directory's index is its directory, with its trailing slash. */
export function pageUrl(from: string, to: string): string {
  const file = pageFile(to);
  const dir = posix.relative(posix.dirname(pageFile(from)), posix.dirname(file));
  if (posix.basename(file) === "index.html") return dir === "" ? "./" : `${dir}/`;
  return dir === "" ? posix.basename(file) : `${dir}/${posix.basename(file)}`;
}

/** The link href, written in the copied file path, as the page links it; throws on a relative
 * link the source can't place. */
function place(href: string, path: string, source: Source): string {
  if (href.startsWith("#") || /^[a-z][a-z\d+.-]*:/i.test(href)) return href;
  const hash = href.indexOf("#");
  const target = hash < 0 ? href : href.slice(0, hash);
  const fragment = hash < 0 ? "" : href.slice(hash);
  const resolved = posix.normalize(posix.join(posix.dirname(path), target));
  if (!href.startsWith("/") && !resolved.startsWith("../")) {
    if (source.pages.has(resolved)) return pageUrl(path, resolved) + fragment;
    if (source.external.has(resolved)) {
      return `${source.repository}/blob/${source.ref}/${resolved}${fragment}`;
    }
  }
  throw new Error(
    `markdown-pages: ${path} links ${href}, which is neither a copied file nor a listed ` +
      `external one; copy it, or list it external if the source holds it at ${source.ref}`,
  );
}

/** The file's leading front matter, parsed, and its body after it; throws when it has none, or
 * when the front matter's name isn't a string. */
function frontMatter(path: string, text: string): { data: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) throw new Error(`markdown-pages: ${path} has no leading --- front matter`);
  const data: unknown = parse(match[1]);
  if (
    typeof data !== "object" ||
    data === null ||
    typeof (data as { name?: unknown }).name !== "string"
  ) {
    throw new Error(`markdown-pages: ${path}'s front matter has no name`);
  }
  return { data: data as Record<string, unknown>, body: text.slice(match[0].length) };
}

/** Renders the copied file at path, its text given, with its links placed against source. */
export function render(path: string, text: string, source: Source): Rendered {
  const { data, body } = frontMatter(path, text);
  // gfmHeadingId resets its slugger in its preprocess hook on every parse, so each page's ids
  // count their duplicates from none, as GitHub's do.
  const marked = new Marked(gfmHeadingId(), {
    walkTokens(token) {
      if (token.type === "link") token.href = place(token.href, path, source);
    },
  });
  return { data, html: marked.parse(body, { async: false }) };
}

/** Escapes text for an HTML text node. */
const escape = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Fills the shell with a rendered page: its title the front matter's name, its body in <main>. */
function fill(shell: string, { data, html }: Rendered): string {
  // The seam a page's front matter, beyond its name, is rendered into, ahead of its body.
  const main = html;
  return shell
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escape(String(data.name))}</title>`)
    .replace("<main></main>", () => `<main>\n${main}</main>`);
}

/** The plugin: every copied file under options.dir a page of the build, loaded from its id, the
 * page's path under the root. */
export function markdownPages(options: Options): Plugin {
  const shellName = options.shell ?? "index.html";
  /** Each page's id, its absolute path under the root, to its copied file's path. */
  const ids = new Map<string, string>();
  let root = "";
  let source: Source;

  return {
    name: "site:markdown-pages",
    apply: "build",
    config(config) {
      root = normalizePath(resolve(config.root ?? process.cwd()));
      const dir = join(root, options.dir);
      const files = readdirSync(dir, { recursive: true, encoding: "utf8" })
        .map((file) => normalizePath(file))
        .filter((file) => file.endsWith(".md"))
        .sort();
      for (const file of files) ids.set(`${root}/${pageFile(file)}`, file);
      source = {
        pages: new Set(files),
        external: new Set(options.external),
        repository: options.repository,
        ref: options.ref,
      };
      return { build: { rolldownOptions: { input: [...ids.keys()] } } };
    },
    resolveId(id) {
      return ids.has(id) ? id : null;
    },
    load(id) {
      const file = ids.get(id);
      if (file === undefined) return null;
      const shell = readFileSync(join(root, shellName), "utf8");
      for (const [pattern, want] of [
        [/<title>[^<]*<\/title>/g, "one <title>"],
        [/<main><\/main>/g, "one empty <main></main>"],
      ] as const) {
        const found = shell.match(pattern)?.length ?? 0;
        if (found !== 1)
          throw new Error(`markdown-pages: want ${want} in ${shellName}, found ${found}`);
      }
      const text = readFileSync(join(root, options.dir, file), "utf8");
      return fill(shell, render(file, text, source));
    },
  };
}
