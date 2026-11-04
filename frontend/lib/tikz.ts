/**
 * Converts free-form TikZ input into what TikZJax expects: a document body plus
 * the packages / libraries to load (TikZJax only fetches TeX files for packages
 * declared through data attributes, so they can't just live in the source).
 *
 * Mirrors backend/src/render.ts#buildDocument so the same input works in both.
 */

/** Packages bundled with @drgrice1/tikzjax (see its dist/tex_files). */
export const BROWSER_PACKAGES = [
  "amsbsy", "amsfonts", "amsgen", "amsmath", "amsopn", "amssymb", "amstext",
  "array", "etoolbox", "hf-tikz", "ifthen", "pgfplots", "tikz-3dplot", "tikz-cd", "xparse",
];

/** Already loaded by the TikZJax core, so `\usepackage{…}` for them is a no-op. */
const PRELOADED = new Set(["tikz", "pgf", "xcolor", "graphicx", "standalone"]);

const DEFAULT_LIBRARIES = ["arrows.meta", "calc", "positioning", "shapes.geometric"];

export type PreparedTikz = {
  body: string;
  texPackages: Record<string, string>;
  tikzLibraries: string[];
  addToPreamble: string;
  /** Packages the browser renderer can't load; rendering will fail if non-empty. */
  unsupported: string[];
};

const USEPACKAGE = /\\usepackage\s*(?:\[([^\]]*)\])?\s*\{([^}]*)\}/g;
const USETIKZLIBRARY = /\\usetikzlibrary\s*\{([^}]*)\}/g;

export function prepareTikz(code: string): PreparedTikz {
  const texPackages: Record<string, string> = { amsmath: "", amssymb: "" };
  const tikzLibraries = new Set(DEFAULT_LIBRARIES);
  const unsupported: string[] = [];
  const extraPreamble: string[] = [];

  const takeDeclarations = (src: string) =>
    src
      .replace(USEPACKAGE, (_, opts: string | undefined, names: string) => {
        for (const name of names.split(",").map((s) => s.trim()).filter(Boolean)) {
          if (PRELOADED.has(name)) continue;
          if (BROWSER_PACKAGES.includes(name)) texPackages[name] = opts ?? "";
          else unsupported.push(name);
        }
        return "";
      })
      .replace(USETIKZLIBRARY, (_, libs: string) => {
        libs.split(",").map((s) => s.trim()).filter(Boolean).forEach((l) => tikzLibraries.add(l));
        return "";
      });

  let body: string;
  const docMatch = code.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (docMatch) {
    // Full document: keep any other preamble lines (\newcommand, \pgfplotsset, …).
    const preamble = takeDeclarations(code.slice(0, docMatch.index))
      .replace(/\\documentclass\s*(?:\[[^\]]*\])?\s*\{[^}]*\}/, "")
      .trim();
    if (preamble) extraPreamble.push(preamble);
    body = takeDeclarations(docMatch[1]).trim();
  } else {
    body = takeDeclarations(code).trim();
  }

  const usesPgfplots = "pgfplots" in texPackages || /\\begin\{(?:semilog[xy]|loglog)?axis\}|\\addplot/.test(body);
  if (usesPgfplots) {
    texPackages.pgfplots = texPackages.pgfplots ?? "";
    if (!/\\pgfplotsset\{[^}]*compat/.test(code)) extraPreamble.push("\\pgfplotsset{compat=1.18}");
  }

  if (body && !/\\begin\{tikzpicture\}|\\tikz\b|\\begin\{tikzcd\}/.test(body)) {
    body = `\\begin{tikzpicture}\n${body}\n\\end{tikzpicture}`;
  }

  return {
    body,
    texPackages,
    tikzLibraries: [...tikzLibraries],
    addToPreamble: extraPreamble.join("\n"),
    unsupported,
  };
}

/** Pull "! Error message" lines and their context out of TeX console output. */
export function summarizeTexLog(log: string): string {
  const lines = log.split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < lines.length && out.length < 40; i++) {
    if (!lines[i].startsWith("!")) continue;
    out.push(lines[i]);
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      out.push(lines[j]);
      if (/^l\.\d+/.test(lines[j])) break;
    }
  }
  return out.join("\n");
}
