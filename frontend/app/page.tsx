"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Code, Copy, Download, Image as ImageIcon, Loader2, Minus, Play, Plus } from "lucide-react";
import { EXAMPLES } from "@/lib/examples";
import { renderTikz, toStandaloneSvg } from "@/lib/tikzjax";

const ZOOM_STEPS = [1, 1.5, 2, 3, 4];

export default function Home() {
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [status, setStatus] = useState<"idle" | "rendering" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const busy = useRef(false);

  const applyZoom = useCallback((svg: SVGSVGElement | null, zoom: number) => {
    if (!svg) return;
    const width = parseFloat(svg.getAttribute("width") ?? "");
    if (width) svg.style.width = `${width * zoom}pt`;
  }, []);

  const handleRender = useCallback(async () => {
    if (busy.current || !outputRef.current) return;
    busy.current = true;
    setStatus("rendering");
    setError(null);
    try {
      const svg = await renderTikz(outputRef.current, code);
      svgRef.current = svg;
      applyZoom(svg, ZOOM_STEPS[zoomIndex]);
      setStatus("done");
    } catch (e) {
      svgRef.current = null;
      outputRef.current?.replaceChildren();
      setError((e as Error).message);
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }, [code, zoomIndex, applyZoom]);

  // Render the initial example once on load.
  const didInitialRender = useRef(false);
  useEffect(() => {
    if (didInitialRender.current) return;
    didInitialRender.current = true;
    handleRender();
  }, [handleRender]);

  useEffect(() => applyZoom(svgRef.current, ZOOM_STEPS[zoomIndex]), [zoomIndex, applyZoom]);

  const handleCopy = async () => {
    if (!svgRef.current) return;
    await navigator.clipboard.writeText(await toStandaloneSvg(svgRef.current));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = async () => {
    if (!svgRef.current) return;
    const blob = new Blob([await toStandaloneSvg(svgRef.current)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "diagram.svg" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasSvg = status === "done";
  const button =
    "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50";

  return (
    <div className="flex h-dvh w-full flex-col bg-zinc-950 text-zinc-50">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900 px-4">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 font-bold text-white">T</div>
          <span>TikZ Previewer</span>
        </div>
        <a
          href="https://github.com/sebzuddas/tikzmcp"
          className="text-sm text-zinc-400 hover:text-zinc-200"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </header>

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Editor */}
        <section className="flex min-h-[40%] flex-1 flex-col border-zinc-800 bg-zinc-900/50 md:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Code size={16} />
              <select
                aria-label="Load an example"
                className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                value=""
                onChange={(e) => {
                  const ex = EXAMPLES.find((x) => x.name === e.target.value);
                  if (ex) setCode(ex.code);
                }}
              >
                <option value="" disabled>
                  Examples…
                </option>
                {EXAMPLES.map((ex) => (
                  <option key={ex.name}>{ex.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRender}
              disabled={status === "rendering"}
              title="Render (Ctrl/⌘ + Enter)"
              className={`${button} bg-blue-600 text-white hover:bg-blue-500`}
            >
              {status === "rendering" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Render
            </button>
          </div>
          <textarea
            className="flex-1 resize-none bg-transparent p-4 font-mono text-sm text-zinc-300 outline-none placeholder:text-zinc-600"
            placeholder="Enter TikZ code…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleRender();
              }
            }}
            spellCheck={false}
            aria-label="TikZ code"
          />
        </section>

        {/* Preview */}
        <section className="flex min-h-[40%] flex-1 flex-col bg-zinc-950">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} />
              <span>Preview</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                aria-label="Zoom out"
                onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
                disabled={zoomIndex === 0}
                className={`${button} border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}
              >
                <Minus size={14} />
              </button>
              <span className="w-9 text-center text-xs tabular-nums">{ZOOM_STEPS[zoomIndex]}×</span>
              <button
                aria-label="Zoom in"
                onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
                disabled={zoomIndex === ZOOM_STEPS.length - 1}
                className={`${button} border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}
              >
                <Plus size={14} />
              </button>
              <button
                onClick={handleCopy}
                disabled={!hasSvg}
                className={`${button} ml-2 border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy SVG"}
              </button>
              <button
                onClick={handleDownload}
                disabled={!hasSvg}
                aria-label="Download SVG"
                className={`${button} border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}
              >
                <Download size={14} />
              </button>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-auto p-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }}
            />

            {/* TikZJax output is inserted here imperatively; React never renders children into it. */}
            <div
              ref={outputRef}
              className={`tikz-output relative z-10 max-w-full rounded-lg bg-white p-6 text-black shadow-lg ${hasSvg ? "" : "hidden"}`}
            />

            {status === "rendering" && (
              <div className="z-10 flex flex-col items-center gap-2 text-center text-sm text-zinc-500">
                <Loader2 className="animate-spin" size={32} />
                <span>Running TeX in your browser…</span>
                <span className="text-xs text-zinc-600">The first render downloads the TeX engine (~7 MB).</span>
              </div>
            )}
            {status === "error" && error && (
              <div className="z-10 max-w-lg rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
                <p className="font-semibold">Couldn&apos;t render</p>
                <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap">{error}</pre>
              </div>
            )}
            {status === "idle" && <div className="z-10 text-zinc-600">Your diagram will appear here</div>}
          </div>
        </section>
      </main>
    </div>
  );
}
