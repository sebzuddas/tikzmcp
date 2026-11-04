# Project State

_Last updated: 2026-11-04_

- [x] MCP server (`backend/`): `render_tikz` tool via `latex` + `dvisvgm`, with timeouts, sandboxed TeX file access, concise error messages, optional `output_path`
- [x] Web previewer (`frontend/`): static Next.js export, renders in the browser with TikZJax (TeX → WebAssembly), deploys to GitHub Pages
- [x] Docker image packaging the MCP server with TeX Live
- [x] CI: lint, build, and end-to-end MCP verification against the Docker image
