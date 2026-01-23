#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const server = new Server(
  {
    name: "tikzmcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper to convert Zod schema to JSON Schema
function zodToJsonSchema(schema: z.ZodType): any {
  // Basic implementation for this specific case
  // In a real app, use zod-to-json-schema package
  return {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The TiKz code to render. Do NOT include documentclass or document environment wrapper, just the tikzpicture or content."
      }
    },
    required: ["code"]
  };
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "render_tikz",
        description: "Render TiKz code to SVG",
        inputSchema: zodToJsonSchema(
          z.object({
            code: z.string().describe("The TiKz code to render. Do NOT include documentclass or document environment wrapper, just the tikzpicture or content."),
          })
        ),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "render_tikz") {
    const { code } = request.params.arguments as { code: string };

    const dir = await mkdtemp(join(tmpdir(), "tikz-"));
    const texFile = join(dir, "diagram.tex");
    const dviFile = join(dir, "diagram.dvi");
    const svgFile = join(dir, "diagram.svg");

    const fullTex = `
\\documentclass[tikz, border=2mm]{standalone}
\\usepackage{tikz}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\begin{document}
${code}
\\end{document}
    `;

    try {
      await writeFile(texFile, fullTex);

      // Run latex
      try {
          await execAsync(`latex -interaction=nonstopmode -output-directory=\"${dir}\" \"${texFile}\"`);
      } catch (e: any) {
          // latex might exit with error but still produce log
          let log = "";
          try {
             log = await readFile(join(dir, "diagram.log"), "utf8");
          } catch {}
          throw new Error(`LaTeX compilation failed: ${e.message}\nLog:\n${log}`);
      }

      // Run dvisvgm
      // -n: no fonts (convert text to paths)
      await execAsync(`dvisvgm -n -o \"${svgFile}\" \"${dviFile}\"`);

      const svgContent = await readFile(svgFile, "utf8");

      return {
        content: [
          {
            type: "text",
            text: svgContent,
            mimeType: "image/svg+xml",
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error rendering TiKz: ${error.message}`,
            isError: true,
          },
        ],
        isError: true,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TiKz MCP Server running on stdio");
}

run();