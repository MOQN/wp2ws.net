# Web Page to Web Space Docs

This repository hosts a Docsify-based course site for Web Page to Web Space.
It is adapted from an earlier ml5-oriented structure, while preserving the existing functional behavior and plugin setup.

## Base reference

- https://github.com/MOQN/IMA-Web-Page-To-Web-Space

## What changed

- Replaced legacy ml5-focused text content with Web Page to Web Space course content.
- Kept docs functionality intact: Docsify routing, sidebar loading, search, copy-code, custom plugins, and dismissible banner.

## Tech stack

- Docsify
- docsify-tabs
- docsify search plugin
- docsify-copy-code
- Custom plugins in docs/js/custom-plugins.js

## Run locally

1. Install dependencies.
2. Serve the docs folder.

```bash
npm install
npm run docs
```

If your scripts differ, you can also use:

```bash
npx docsify-cli serve docs
```

## Project entry

- docs/index.html: Docsify entry and global config
- docs/sidebar.md: Navigation structure
- docs/README.md: Home page content
- docs/js/: Existing functional scripts

## Notes

This repository intentionally keeps prior architecture patterns to minimize migration risk while enabling fast content iteration.

