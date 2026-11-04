#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RenderError, renderTikz } from "./render.js";

const server = new McpServer({ name: "tikzmcp", version: "1.1.0" });

server.registerTool(
  "render_tikz",
  {
    title: "Render TikZ",
    description:
      "Compile TikZ code with LaTeX and return the diagram as an SVG string. " +
      "Accepts a tikzpicture environment, bare TikZ commands (wrapped automatically), " +
      "or a full LaTeX document. tikz, pgfplots, amsmath and the arrows.meta, calc, " +
      "positioning and shapes.geometric libraries are preloaded; extra \\usepackage or " +
      "\\usetikzlibrary lines in the code are moved into the preamble.",
    inputSchema: {
      code: z
        .string()
        .min(1)
        .describe("TikZ code, e.g. \\begin{tikzpicture} \\draw (0,0) circle (1); \\end{tikzpicture}"),
      output_path: z
        .string()
        .optional()
        .describe("If set, write the SVG to this file path and return only a confirmation instead of the SVG text."),
    },
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
  async ({ code, output_path }) => {
    try {
      const svg = await renderTikz(code);
      if (output_path) {
        const path = resolve(output_path);
        await writeFile(path, svg);
        return { content: [{ type: "text", text: `Wrote SVG (${svg.length} bytes) to ${path}` }] };
      }
      return { content: [{ type: "text", text: svg }] };
    } catch (e) {
      const message = e instanceof RenderError ? e.message : `Unexpected error: ${(e as Error).message}`;
      return { content: [{ type: "text", text: message }], isError: true };
    }
  },
);

await server.connect(new StdioServerTransport());
console.error("tikzmcp server running on stdio");
