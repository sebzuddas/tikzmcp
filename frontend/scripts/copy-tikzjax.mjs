// Copies the TikZJax runtime (TeX compiled to WebAssembly) into public/ so it is
// served from the same origin as the app — its Web Worker can't load cross-origin.
import { cpSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const src = join(dirname(require.resolve("@drgrice1/tikzjax/package.json")), "dist");
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "tikzjax");

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true, filter: (p) => !p.endsWith(".map") });
console.log(`Copied TikZJax runtime to ${dest}`);
