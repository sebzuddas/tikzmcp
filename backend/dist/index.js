#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const zod_1 = require("zod");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
const server = new index_js_1.Server({
    name: "tikz-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Helper to convert Zod schema to JSON Schema
function zodToJsonSchema(schema) {
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
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "render_tikz",
                description: "Render TiKz code to SVG",
                inputSchema: zodToJsonSchema(zod_1.z.object({
                    code: zod_1.z.string().describe("The TiKz code to render. Do NOT include documentclass or document environment wrapper, just the tikzpicture or content."),
                })),
            },
        ],
    };
});
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    if (request.params.name === "render_tikz") {
        // @ts-ignore
        const { code } = request.params.arguments;
        const dir = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "tikz-"));
        const texFile = (0, node_path_1.join)(dir, "diagram.tex");
        const dviFile = (0, node_path_1.join)(dir, "diagram.dvi");
        const svgFile = (0, node_path_1.join)(dir, "diagram.svg");
        const fullTex = `
\\documentclass[tikz, border=2mm]{standalone}
\\usepackage{tikz}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\begin{document}
\\begin{tikzpicture}
${code}
\\end{tikzpicture}
\\end{document}
    `;
        try {
            await (0, promises_1.writeFile)(texFile, fullTex);
            // Run latex
            try {
                await execAsync(`latex -interaction=nonstopmode -output-directory="${dir}" "${texFile}"`);
            }
            catch (e) {
                // latex might exit with error but still produce log
                let log = "";
                try {
                    log = await (0, promises_1.readFile)((0, node_path_1.join)(dir, "diagram.log"), "utf8");
                }
                catch { }
                throw new Error(`LaTeX compilation failed: ${e.message}\nLog:\n${log}`);
            }
            // Run dvisvgm
            // -n: no fonts (convert text to paths)
            await execAsync(`dvisvgm -n -o "${svgFile}" "${dviFile}"`);
            const svgContent = await (0, promises_1.readFile)(svgFile, "utf8");
            return {
                content: [
                    {
                        type: "text",
                        text: svgContent,
                        mimeType: "image/svg+xml",
                    },
                ],
            };
        }
        catch (error) {
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
        }
        finally {
            await (0, promises_1.rm)(dir, { recursive: true, force: true });
        }
    }
    throw new Error(`Tool not found: ${request.params.name}`);
});
async function run() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("TiKz MCP Server running on stdio");
}
run();
