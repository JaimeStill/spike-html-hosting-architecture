# spike-html-hosting-architecture

spike-html-hosting-architecture is the architecture stand-in's Pages project site in
spike-html-hosting. Its build renders the architecture repository's pages from their Markdown. This
context records only working knowledge the code does not express.

- `content/` holds byte-for-byte copies of the architecture repository's 29 front-matter pages at
  8706d04, and `content.json` records the repository, the commit, and each file's git blob hash.
  STANDARDS.md records this exception to the per-file provenance line.
- The shared files come from spike-html-hosting-sdk by tag. The site was scaffolded at v0.1.0, pins
  v0.3.1, and keeps pace by bumping the tag, in `package.json` and both workflows' `uses:` lines;
  v0.3.1's shell loads spike-html-hosting-components, pinned at the tag the template names, v0.2.2.
  The renderer, the stylesheet, the shell and browser checks, the capture run, the content check,
  the ESLint, Prettier, and tsconfig bases, and the currency bin are the SDK's exports; the
  template's files, each marked `From|Adapted from spike-html-hosting-sdk (<tag>): template/<path>`,
  its tag the release whose content the file carries, are the site's own copies to take again when a
  release's CHANGELOG names them.
- The site adapts three template files: `index.html`, its title and text this site's;
  `vite.config.ts`, its `external` the source's LICENSE, which the copied README links; and
  `.gitignore`, with marathon's working files.
- The browser test runs the SDK's palette check, `highlightsEachPalette`, on the index, which
  holds highlighted code.
