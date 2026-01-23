# Decisions

## 2026-01-22: Tech Stack
- TypeScript with ESM (NodeNext).
- @modelcontextprotocol/sdk for MCP implementation.
- pnpm as the package manager.
- tsx for development execution.

## Architecture
- Monorepo-like structure with `frontend` (Next.js) and `backend` (Node.js MCP server).
- Frontend spawns backend process via `child_process.spawn` and communicates via stdio (MCP protocol).
- Single Dockerfile building both and running Next.js (which spawns backend). Debian-based image used for LaTeX support.