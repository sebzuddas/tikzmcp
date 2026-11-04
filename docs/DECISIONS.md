# Decisions

## 2026-01-22: Tech Stack
- TypeScript with ESM (NodeNext).
- @modelcontextprotocol/sdk for MCP implementation.
- pnpm as the package manager (single workspace lockfile at the repo root).
- tsx for development execution.

## 2026-11-04: Split rendering — browser for the web app, real TeX for MCP
- The web previewer no longer spawns the MCP server. It renders with
  [TikZJax](https://github.com/drgrice1/tikzjax) (TeX compiled to WebAssembly), so it is a
  fully static site that can be hosted on GitHub Pages with no server.
- TikZJax's worker must be same-origin, so its runtime is copied from `node_modules` into
  `frontend/public/tikzjax/` at build time rather than loaded from a CDN.
- Trade-off: TikZJax ships a fixed set of packages (tikz + all TikZ libraries, pgfplots,
  tikz-cd, tikz-3dplot, amsmath, …). Anything else (e.g. circuitikz, chemfig) needs the MCP
  server with a full TeX installation.
- The MCP server stays a local stdio process. It uses `execFile` (no shell), per-step
  timeouts, `-no-shell-escape`, and kpathsea `openin_any/openout_any=p` so TeX can't read or
  write outside its temp directory.
- The Dockerfile now packages only the MCP server + TeX Live, for users without LaTeX.
