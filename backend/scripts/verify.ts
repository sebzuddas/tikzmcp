/**
 * End-to-end check: starts the MCP server over stdio, lists tools, and renders a diagram.
 * Run with `pnpm verify`. Exits non-zero on failure.
 *
 * Set TIKZMCP_CMD to test a different server command, e.g. the Docker image:
 *   TIKZMCP_CMD="docker run -i --rm tikzmcp" pnpm verify
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { buildDocument } from "../src/render.js";

const serverPath = fileURLToPath(new URL("../src/index.ts", import.meta.url));

function hasTex() {
  try {
    execFileSync("latex", ["--version"], { stdio: "ignore" });
    execFileSync("dvisvgm", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok   ${msg}`);
}

// buildDocument wrapping rules
assert(buildDocument("\\draw (0,0) -- (1,1);").includes("\\begin{tikzpicture}\n\\draw"), "bare commands get wrapped");
assert(!buildDocument("\\tikz \\draw (0,0) -- (1,1);").includes("\\begin{tikzpicture}"), "inline \\tikz is not wrapped");
assert(
  /\\usetikzlibrary\{mindmap\}\n\\begin\{document\}/.test(buildDocument("\\usetikzlibrary{mindmap}\n\\draw (0,0);")),
  "\\usetikzlibrary is hoisted into the preamble",
);
const full = "\\documentclass{article}\\begin{document}x\\end{document}";
assert(buildDocument(full) === full, "full documents pass through untouched");

const custom = process.env.TIKZMCP_CMD?.trim().split(/\s+/);
const [command, ...args] = custom ?? [process.execPath, "--import", "tsx", serverPath];
const client = new Client({ name: "tikzmcp-verify", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command, args }));

const { tools } = await client.listTools();
assert(tools.some((t) => t.name === "render_tikz"), "server lists render_tikz");

const result = (await client.callTool({
  name: "render_tikz",
  arguments: { code: "\\draw[red, thick] (0,0) circle (1);" },
})) as { content: { type: string; text: string }[]; isError?: boolean };
const text = result.content[0]?.text ?? "";

if (custom || hasTex()) {
  assert(!result.isError && text.includes("<svg"), "render_tikz returns an SVG");
  const bad = (await client.callTool({ name: "render_tikz", arguments: { code: "\\draw (0,0) -- \\nope;" } })) as typeof result;
  assert(bad.isError && bad.content[0].text.includes("Undefined control sequence"), "LaTeX errors are reported cleanly");
} else {
  assert(result.isError && text.includes("not found on PATH"), "missing TeX gives a helpful error");
  console.log("skip SVG rendering checks (latex/dvisvgm not installed)");
}

await client.close();
console.log("All checks passed.");
