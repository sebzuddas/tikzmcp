"use client";

import { useState } from "react";
import { Play, Copy, Loader2, Code, Image as ImageIcon } from "lucide-react";

export default function Home() {
  const [code, setCode] = useState<string>("\\draw (0,0) circle (1cm);");
  const [svg, setSvg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSvg(data.svg);
      }
    } catch (e) {
      setError("Failed to generate");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (svg) {
      navigator.clipboard.writeText(svg);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-950 text-zinc-50">
      <header className="flex h-14 items-center justify-between border-b border-zinc-800 px-4 bg-zinc-900">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">
            T
          </div>
          <span>TikZ MCP Previewer</span>
        </div>
        <div className="flex items-center gap-2">
            {/* Additional controls could go here */}
        </div>
      </header>
      
      <main className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Editor */}
        <div className="flex flex-1 flex-col border-r border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Code size={16} />
              <span>TikZ Code Input</span>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Generate
            </button>
          </div>
          <div className="relative flex-1">
            <textarea
              className="absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-sm outline-none placeholder:text-zinc-600 text-zinc-300"
              placeholder="Enter your TikZ code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Pane: Preview */}
        <div className="flex flex-1 flex-col bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} />
              <span>SVG Preview</span>
            </div>
            {svg && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <Copy size={14} />
                Copy SVG
              </button>
            )}
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto bg-zinc-950 p-8 relative">
            {/* Simple Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center gap-2 text-zinc-500 z-10">
                    <Loader2 className="animate-spin" size={32} />
                    <span>Rendering...</span>
                </div>
            ) : error ? (
              <div className="max-w-md rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400 z-10">
                <p className="font-semibold">Error</p>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">{error}</pre>
              </div>
            ) : svg ? (
              <div 
                className="h-full w-full flex items-center justify-center z-10"
                dangerouslySetInnerHTML={{ __html: svg }} 
              />
            ) : (
              <div className="text-zinc-600 z-10">Generated SVG will appear here</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}