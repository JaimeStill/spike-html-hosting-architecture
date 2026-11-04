# spike-html-hosting-architecture

spike-html-hosting-architecture is the architecture stand-in's Pages project site in
spike-html-hosting. It is planned to render the architecture repository's pages, pinned with
provenance, from their Markdown at build. Its build, check, and deploy files are copied from
spike-html-hosting, which owns them: a change there is copied here by hand. Apart from provenance
lines, this site differs from the root only in package.json's `name`, which sets the Vite base,
and `index.html`'s text. This context records only working knowledge the code does not express.
