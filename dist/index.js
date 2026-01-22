import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
const server = new Server({
    name: "tikzmcp",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
/**
 * List available tools.
 * Each tool corresponds to a function that can be called by the LLM.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "render_tikz",
                description: "Render a TiKz snippet to an image or PDF",
                inputSchema: {
                    type: "object",
                    properties: {
                        code: {
                            type: "string",
                            description: "The TiKz code to render (without the document wrapper if possible)",
                        },
                    },
                    required: ["code"],
                },
            },
        ],
    };
});
/**
 * Handle tool calls.
 * This is where the actual logic for each tool resides.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "render_tikz") {
        // Placeholder for TiKz rendering logic
        return {
            content: [
                {
                    type: "text",
                    text: "TiKz rendering logic will be implemented here.",
                },
            ],
        };
    }
    throw new Error(`Tool not found: ${request.params.name}`);
});
/**
 * Start the server using stdio transport.
 * This allows the server to communicate with the MCP client (like Gemini or Claude).
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("TiKz MCP server running on stdio");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
