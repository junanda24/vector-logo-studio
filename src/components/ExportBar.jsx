import { useState } from "react";
import { downloadJson } from "../lib/shapelottie.js";
import { componentsToSVG, downloadSVG } from "../lib/vecshapes.js";

export default function ExportBar({ data, svgString, fileName, choreoName, vectorLayerCount }) {
  const [copied, setCopied] = useState(false);
  if (!data) return null;

  const json = JSON.stringify(data);
  const kb = (new Blob([json]).size / 1024).toFixed(1);
  const frames = data.op - data.ip;
  const dur = (frames / data.fr).toFixed(2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="glow-card rounded-2xl p-5">
      <h2 className="font-semibold text-teal-200 mb-3">📦 Export</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 text-center">
        {[
          [`${data.layers.length}`, "shape layer"],
          [`${frames} fr`, `${dur} dtk`],
          [`${vectorLayerCount} path`, "vektor"],
          [`${kb} KB`, "ukuran JSON"],
        ].map(([a, b]) => (
          <div key={b} className="rounded-xl bg-slate-900/70 border border-slate-700/60 py-2.5">
            <div className="font-mono text-sm text-teal-300">{a}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{b}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          onClick={() => downloadSVG(svgString, `${fileName || "logo"}-vector.svg`)}
          className="py-3 rounded-xl bg-violet-400/15 border border-violet-400/40 text-violet-200 text-sm font-bold hover:bg-violet-400/25 transition-colors"
        >
          △ Download SVG vektor
        </button>
        <button
          onClick={() => downloadJson(data, `${fileName || "logo"}-${choreoName || "anim"}.json`)}
          className="btn-primary py-3 rounded-xl bg-teal-400 text-slate-950 text-sm font-bold hover:bg-teal-300 transition-colors"
        >
          ⬇️ Download Lottie .json
        </button>
      </div>
      <button
        onClick={copy}
        className="w-full mt-2.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition-colors"
      >
        {copied ? "✅ JSON tersalin!" : "📋 Copy JSON"}
      </button>
      <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
        Lottie berisi <span className="text-teal-300">shape layer vektor asli</span> — bukan gambar.
        Tajam di resolusi berapa pun, ukuran file kecil.
      </p>
    </div>
  );
}
