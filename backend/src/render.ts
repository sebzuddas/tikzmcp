import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Max wall-clock time for each of `latex` and `dvisvgm`. */
const STEP_TIMEOUT_MS = 30_000;

const DEFAULT_PREAMBLE = String.raw`\documentclass[tikz,border=2mm]{standalone}
\usepackage{amsmath,amssymb}
\usepackage{pgfplots}
\pgfplotsset{compat=1.18}
\usetikzlibrary{arrows.meta,calc,positioning,shapes.geometric}`;

export class RenderError extends Error {}

/**
 * Turn whatever the user gave us into a complete LaTeX document.
 *
 * Accepted inputs:
 *  - a full document (contains `\documentclass`) — used verbatim
 *  - one or more `tikzpicture` environments (or inline `\tikz` commands)
 *  - bare TikZ commands like `\draw (0,0) circle (1);` — wrapped in a tikzpicture
 *
 * `\usepackage` / `\usetikzlibrary` lines anywhere in a fragment are hoisted
 * into the preamble, and a `\begin{document}…\end{document}` wrapper is stripped.
 */
export function buildDocument(code: string): string {
  if (/\\documentclass\b/.test(code)) return code;

  const preamble: string[] = [];
  const body = code
    .replace(/^\s*\\(?:usepackage|usetikzlibrary|usepgfplotslibrary)\b(?:\[[^\]]*\])?\{[^}]*\}.*$/gm, (line) => {
      preamble.push(line.trim());
      return "";
    })
    .replace(/\\begin\{document\}|\\end\{document\}/g, "")
    .trim();

  if (!body) throw new RenderError("No TikZ code to render.");

  const needsWrapper = !/\\begin\{(?:tikzpicture|tikzcd)\}|\\tikz\b/.test(body);
  const content = needsWrapper ? `\\begin{tikzpicture}\n${body}\n\\end{tikzpicture}` : body;

  return [DEFAULT_PREAMBLE, ...preamble, "\\begin{document}", content, "\\end{document}", ""].join("\n");
}

/** Pull the useful part ("! Undefined control sequence." + context) out of a TeX log. */
export function summarizeTexLog(log: string): string {
  const lines = log.split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("!")) continue;
    out.push(lines[i]);
    // TeX prints context lines until the "l.<n>" line that shows where it stopped.
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      out.push(lines[j]);
      if (/^l\.\d+/.test(lines[j])) break;
    }
    if (out.length > 40) break;
  }
  return out.length ? out.join("\n") : lines.slice(-30).join("\n");
}

async function run(cmd: string, args: string[], cwd: string) {
  try {
    await execFileAsync(cmd, args, {
      cwd,
      timeout: STEP_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      // Keep TeX from reading or writing outside the temp dir (kpathsea "paranoid" mode).
      env: { ...process.env, openin_any: "p", openout_any: "p" },
    });
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { killed?: boolean; signal?: string };
    if (err.code === "ENOENT") {
      throw new RenderError(
        `\`${cmd}\` was not found on PATH. Install a TeX distribution that provides latex and dvisvgm ` +
          `(e.g. TeX Live or MacTeX), or run the server with the Docker image.`,
      );
    }
    if (err.killed || err.signal === "SIGTERM") {
      throw new RenderError(`\`${cmd}\` timed out after ${STEP_TIMEOUT_MS / 1000}s.`);
    }
    throw err;
  }
}

/** Compile TikZ code to an SVG string using `latex` + `dvisvgm`. */
export async function renderTikz(code: string): Promise<string> {
  const tex = buildDocument(code);
  const dir = await mkdtemp(join(tmpdir(), "tikzmcp-"));
  try {
    await writeFile(join(dir, "diagram.tex"), tex);

    try {
      await run("latex", ["-interaction=nonstopmode", "-halt-on-error", "-no-shell-escape", "diagram.tex"], dir);
    } catch (e) {
      if (e instanceof RenderError) throw e;
      const log = await readFile(join(dir, "diagram.log"), "utf8").catch(() => "");
      throw new RenderError(`LaTeX compilation failed:\n${summarizeTexLog(log) || (e as Error).message}`);
    }

    try {
      // --no-fonts converts glyphs to paths so the SVG renders identically everywhere.
      await run("dvisvgm", ["--no-fonts", "-o", "diagram.svg", "diagram.dvi"], dir);
    } catch (e) {
      if (e instanceof RenderError) throw e;
      throw new RenderError(`dvisvgm failed: ${(e as Error).message}`);
    }

    return await readFile(join(dir, "diagram.svg"), "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
