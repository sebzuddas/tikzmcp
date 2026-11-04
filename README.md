# tikzmcp

Render [TikZ](https://tikz.dev) diagrams to SVG. The repo has two parts:

- **An MCP server** that lets AI assistants (Claude Desktop, Claude Code, Cursor, …) compile TikZ into SVG with a real LaTeX installation.
- **A web previewer**: write TikZ on the left and see the diagram on the right. It runs TeX in your browser via WebAssembly, so it needs no server and is hosted on GitHub Pages.

**Live previewer:** https://sebzuddas.github.io/tikzmcp/

```
tikzmcp/
├── backend/    MCP server (Node, stdio). Shells out to latex + dvisvgm
├── frontend/   Next.js static site. Renders in the browser with TikZJax
├── Dockerfile  MCP server bundled with TeX Live
└── docs/       State, decisions, backlog
```

## Web previewer

The previewer is a static site. When you click **Render**, it loads [TikZJax](https://github.com/drgrice1/tikzjax) (TeX compiled to WebAssembly) and compiles your code in the browser. The first render downloads about 7 MB. After that, diagrams are cached in IndexedDB.

- Accepts a `tikzpicture`, bare commands like `\draw (0,0) circle (1);` (wrapped for you), a `tikzcd` diagram, or a full LaTeX document.
- `\usepackage{…}` and `\usetikzlibrary{…}` lines are picked up automatically.
- **Copy SVG** and **Download** produce a standalone SVG with the fonts it uses embedded.
- Press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> to render.

**What's available in the browser:** TikZ with every TikZ library, `pgfplots`, `tikz-cd`, `tikz-3dplot`, `amsmath`, `amssymb`, `array`, `etoolbox`, `xparse`, `ifthen`, and `hf-tikz`. Other packages (for example `circuitikz` or `chemfig`) need the MCP server with a full TeX install.

### Run it locally

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

### Deploy to GitHub Pages

The workflow in [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) builds and deploys on every push to `main`. To turn it on once:

1. Open the repo on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main`, or run the workflow by hand from the **Actions** tab.

The workflow sets the base path to `/<repo-name>` automatically, or to the root for a `<user>.github.io` repo. If you use a custom domain, set `NEXT_PUBLIC_BASE_PATH` to an empty string in the workflow.

To build the static site yourself:

```bash
NEXT_PUBLIC_BASE_PATH=/tikzmcp pnpm --filter frontend build   # output in frontend/out/
```

## MCP server

### `render_tikz`

Compiles TikZ with `latex` + `dvisvgm` and returns the SVG as text.

| Argument      | Type   | Description |
|---------------|--------|-------------|
| `code`        | string | TikZ code. Accepts a `tikzpicture`, bare TikZ commands, or a full LaTeX document. |
| `output_path` | string | Optional. Writes the SVG to this path and returns a short confirmation instead of the SVG text. |

The server preloads `tikz`, `pgfplots` (`compat=1.18`), `amsmath`, `amssymb`, and the `arrows.meta`, `calc`, `positioning`, and `shapes.geometric` libraries. Any `\usepackage`/`\usetikzlibrary` lines in `code` are moved into the preamble. When compilation fails, the tool returns TeX's error message and the line it stopped on.

TeX runs with shell escape disabled, a 30-second timeout per step, and file access restricted to its temporary directory.

### Option A: run with Docker (no LaTeX install needed)

```bash
docker build -t tikzmcp .
```

```json
{
  "mcpServers": {
    "tikz": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "tikzmcp"]
    }
  }
}
```

With Docker, `output_path` refers to a path inside the container. To write files to your machine, mount a directory (for example `-v "$PWD:/work"`) and pass paths under `/work`.

### Option B: run with a local TeX installation

You need `latex` and `dvisvgm` on your `PATH`. TeX Live, MacTeX, and MiKTeX all include both. On Debian/Ubuntu:

```bash
sudo apt install texlive-latex-extra texlive-pictures dvisvgm
```

Then build the server:

```bash
pnpm install
pnpm --filter tikzmcp-backend build
```

```json
{
  "mcpServers": {
    "tikz": {
      "command": "node",
      "args": ["/absolute/path/to/tikzmcp/backend/dist/index.js"]
    }
  }
}
```

For Claude Code, run `claude mcp add tikz -- node /absolute/path/to/tikzmcp/backend/dist/index.js`.

## Development

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Start the web previewer dev server |
| `pnpm build` | Build the MCP server and the static site |
| `pnpm lint` | Lint the frontend |
| `pnpm verify` | Start the MCP server, list its tools, and render a test diagram (SVG checks are skipped if TeX isn't installed) |
| `TIKZMCP_CMD="docker run -i --rm tikzmcp" pnpm verify` | Run the same checks against the Docker image |

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) lints, builds, and runs `verify` against the Docker image on every push and pull request.

## Credits

In-browser rendering uses [TikZJax](https://github.com/drgrice1/tikzjax) by Jim Fowler and Glenn Rice (GPL-3.0-or-later). Its runtime is copied into the built site unmodified.
