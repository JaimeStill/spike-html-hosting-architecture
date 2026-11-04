# spike-html-hosting-architecture

spike-html-hosting-architecture is the architecture stand-in's Pages project site in
spike-html-hosting. Its build renders the architecture repository's pages from their Markdown. This
context records only working knowledge the code does not express.

- `content/` holds byte-for-byte copies of the architecture repository's 29 front-matter pages at
  8706d04, and `content.json` records the repository, the commit, and each file's git blob hash.
  STANDARDS.md records this exception to the per-file provenance line.
- This site owns the content renderer, `markdown-pages.ts`, and its tests,
  `test/unit/markdown-pages.test.ts` and `test/unit/content.test.ts`. It also owns the files it
  adapted from spike-html-hosting to build Markdown pages: `index.html`, `vite.config.ts`,
  `mise.toml`, `tsconfig.json`, and `test/browser/site.test.ts`. spike-html-hosting-sqlate copies
  all of them, so a change here is copied there by hand.
- This site owns the site layout, `site.css`. spike-html-hosting-sqlate and spike-html-hosting
  copy it unchanged, so a change here is copied to both by hand.
- spike-html-hosting owns the remaining build, check, and deploy files, and this site copies them
  unchanged: a change there is copied here by hand.
- The planned `template` task moves the shared files into a site SDK released by tag.
