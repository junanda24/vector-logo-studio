import { useState } from "react";
import { componentToSVG } from "../lib/vecshapes.js";

export default function ComponentGrid({ components, onRename, onDelete, onToggle, onMerge, hidden, setHidden }) {
  const [mergeMode, setMergeMode] = useState(false);
  const [mergePick, setMergePick] = useState([]);
  if (!components?.length) return null;

  const toggleMergePick = (id) => {
    setMergePick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <div className="glow-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-teal-200">
          🧩 Komponen vektor — {components.length}
        </h2>
        <button
          onClick={() => { setMergeMode(!mergeMode); setMergePick([]); }}
          className={`text-[11px] px-3 py-1.5 rounded-full border font-semibold transition-colors ${mergeMode ? "border-amber-400 text-amber-300 bg-amber-400/10" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
        >
          {mergeMode ? "✓ Selesai pilih" : "🔗 Gabung komponen"}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {mergeMode
          ? "Klik 2+ komponen untuk digabung, lalu tekan tombol Gabung."
          : "Tiap komponen adalah path vektor asli — bukan gambar. Klik untuk rename."}
      </p>
      {mergeMode && mergePick.length >= 2 && (
        <button
          onClick={() => { onMerge(mergePick); setMergePick([]); setMergeMode(false); }}
          className="mb-4 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300"
        >
          🔗 Gabung {mergePick.length} komponen
        </button>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {components.map((c, i) => {
          const isHidden = hidden.has(c.id);
          const picked = mergePick.includes(c.id);
          return (
            <div
              key={c.id}
              onClick={() => mergeMode && toggleMergePick(c.id)}
              className={`relative rounded-xl border bg-slate-900/60 p-2.5 transition-all ${picked ? "border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.25)]" : "border-slate-700/60"} ${mergeMode ? "cursor-pointer" : ""} ${isHidden ? "opacity-40" : ""}`}
            >
              <div
                className="comp-thumb checker rounded-lg aspect-square flex items-center justify-center p-2 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: componentToSVG(c) }}
              />
              <input
                value={c.name}
                onChange={(e) => onRename(c.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full mt-2 bg-transparent text-xs font-semibold text-slate-200 border-b border-transparent hover:border-slate-600 focus:border-teal-400 outline-none px-0.5"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: c.hex }} />
                  <span className="font-mono text-[10px] text-slate-400">{c.hex}</span>
                </span>
                <span className="text-[10px] text-slate-500">{c.paths.length} path</span>
              </div>
              {!mergeMode && (
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setHidden(c.id); }}
                    className="flex-1 text-[10px] py-1 rounded-lg border border-slate-700 text-slate-400 hover:border-slate-500"
                  >
                    {isHidden ? "👁️ Tampil" : "🚫 Sembunyi"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                    className="flex-1 text-[10px] py-1 rounded-lg border border-red-900/60 text-red-400 hover:bg-red-500/10"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              )}
              {picked && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center justify-center">
                  {mergePick.indexOf(c.id) + 1}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
