import { spawn } from "child_process";
import { resolve } from "path";

const serverPath = resolve(__dirname, "src/index.ts");
const child = spawn("npx", ["tsx", serverPath], {
  stdio: ["pipe", "pipe", "inherit"],
});

let buffer = "";

child.stdout.on("data", (data) => {
  const str = data.toString();
  buffer += str;
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      handleMessage(msg);
    } catch (e) {
      console.error("Failed to parse:", line);
    }
  }
});

let id = 0;
function send(method: string, params: any) {
  const msg = { jsonrpc: "2.0", id: id++, method, params };
  const str = JSON.stringify(msg) + "\n";
  child.stdin.write(str);
}

function handleMessage(msg: any) {
  if (msg.id === 0) {
    console.log("Initialized!");
    // List tools
    send("tools/list", {});
  } else if (msg.id === 1) {
    console.log("Tools listed:", msg.result);
    // Call render_tikz
    send("tools/call", {
      name: "render_tikz",
      arguments: {
        code: "\\begin{tikzpicture}\\draw[red, thick] (0,0) circle (1);\\end{tikzpicture}"
      }
    });
  } else if (msg.id === 2) {
    if (msg.error) {
        console.error("Error calling tool:", msg.error);
    } else {
        console.log("Render success!");
        const content = msg.result.content[0].text;
        if (content.startsWith("<?xml")) {
            console.log("SVG generated (starts with XML tag)");
        } else {
            console.log("Unexpected output:", content.slice(0, 50));
        }
    }
    process.exit(0);
  }
}

// Start sequence
send("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "test-client", version: "1.0.0" },
});
