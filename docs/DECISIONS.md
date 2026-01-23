# Decisions

- **Architecture**: Monorepo-like structure with `frontend` (Next.js) and `backend` (Node.js MCP server).
- **Integration**: Frontend spawns backend process via `child_process.spawn` and communicates via stdio (MCP protocol).
- **Containerization**: Single Dockerfile building both and running Next.js (which spawns backend). Debian-based image used for LaTeX support.
- **User Input**: Currently accepts direct TikZ code. LLM integration (NL -> TikZ) is skipped due to lack of API keys/specs, but UI is ready for it.
- **Styling**: Tailwind CSS with a dark mode/IDE-like aesthetic.
