import { prepareTikz, summarizeTexLog } from "./tikz";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const TIKZJAX_URL = `${BASE_PATH}/tikzjax`;

const RENDER_TIMEOUT_MS = 90_000;

export class TikzRenderError extends Error {}

/**
 * Render TikZ code into `container` using TikZJax.
 *
 * TikZJax watches the DOM for `<script type="text/tikz">` elements and swaps each one
 * for an SVG (or, on failure, a broken `<img>`). We insert such a script into a
 * container React doesn't manage, then wait for one of those outcomes.
 */
export function renderTikz(container: HTMLElement, code: string): Promise<SVGSVGElement> {
  const prepared = prepareTikz(code);
  if (!prepared.body) return Promise.reject(new TikzRenderError("Nothing to render."));
  if (prepared.unsupported.length) {
    return Promise.reject(
      new TikzRenderError(
        `The in-browser renderer doesn't include: ${prepared.unsupported.join(", ")}.\n\n` +
          `Remove the \\usepackage line, or render it with the MCP server and a full TeX installation.`,
      ),
    );
  }

  const script = document.createElement("script");
  script.type = "text/tikz";
  script.textContent = prepared.body;
  script.dataset.texPackages = JSON.stringify(prepared.texPackages);
  script.dataset.tikzLibraries = prepared.tikzLibraries.join(",");
  if (prepared.addToPreamble) script.dataset.addToPreamble = prepared.addToPreamble;
  script.dataset.showConsole = "true"; // so we can capture the TeX log for error messages
  script.dataset.width = "120";
  script.dataset.height = "120";

  // TikZJax forwards TeX's output to console.log; tee it while this render runs.
  const log: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    if (typeof args[0] === "string") log.push(args.join(" "));
    else originalLog(...args);
  };

  return new Promise<SVGSVGElement>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      console.log = originalLog;
      observer.disconnect();
      container.removeEventListener("tikzjax-load-finished", onDone);
      clearTimeout(timer);
      fn();
    };

    const onDone = (e: Event) => finish(() => resolve(e.target as SVGSVGElement));

    const observer = new MutationObserver(() => {
      const img = container.querySelector("img");
      if (!img) return;
      img.remove();
      const summary = summarizeTexLog(log.join("\n"));
      finish(() => reject(new TikzRenderError(summary || "TeX failed to compile this diagram.")));
    });

    const timer = setTimeout(
      () => finish(() => reject(new TikzRenderError(`Rendering timed out after ${RENDER_TIMEOUT_MS / 1000}s.`))),
      RENDER_TIMEOUT_MS,
    );

    container.addEventListener("tikzjax-load-finished", onDone);
    observer.observe(container, { childList: true, subtree: true });
    container.replaceChildren(script);
  });
}

/**
 * Serialize a TikZJax SVG into a standalone file. Text in TikZJax output relies on
 * Computer Modern web fonts from fonts.css, so embed the ones used as data URIs.
 */
export async function toStandaloneSvg(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.removeAttribute("style");

  const families = new Set<string>();
  clone.querySelectorAll("[font-family]").forEach((el) => families.add(el.getAttribute("font-family")!));

  const faces = await Promise.all(
    [...families].map(async (family) => {
      try {
        const res = await fetch(`${TIKZJAX_URL}/fonts/${encodeURIComponent(family)}.woff2`);
        if (!res.ok) return "";
        const bytes = new Uint8Array(await res.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        return `@font-face{font-family:${family};src:url(data:font/woff2;base64,${btoa(binary)}) format("woff2");}`;
      } catch {
        return "";
      }
    }),
  );

  const css = faces.filter(Boolean).join("\n");
  if (css) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    clone.prepend(style);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}\n`;
}
