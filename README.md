# TikZ MCP Server

An MCP server that renders TiKz diagrams to SVG.

## Prerequisites

You must have a working TeX installation with `latex` and `dvisvgm` in your PATH.
- `latex` (usually part of TeX Live or MiKTeX)
- `dvisvgm`

## Installation

```bash
pnpm install
```

## Usage

### Building

```bash
pnpm build
```

### Running

To run the server with an MCP client (like Claude Desktop or an IDE):

```json
{
  "mcpServers": {
    "tikz": {
      "command": "node",
      "args": ["/path/to/tikzmcp/dist/index.js"]
    }
  }
}
```

Or using `tsx` for development:

```json
{
  "mcpServers": {
    "tikz": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/tikzmcp/src/index.ts"]
    }
  }
}
```

## Tools

### `render_tikz`

Renders TiKz code to an SVG string.

- **Input**: `code` (string) - The TiKz code (content of the `document` environment).
- **Output**: SVG content.

**Example Input:**
```latex
\begin{tikzpicture}
  \draw[red, thick] (0,0) circle (1);
\end{tikzpicture}
```
