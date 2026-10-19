export default function AnalysisPanel({ analysis }) {
  if (!analysis) return null;
  const { W, H, bgType, palette, bg } = analysis;
  return (
    <div className="glow-card rounded-2xl p-5">
      <h2 className="font-semibold text-teal-200 mb-1">🔍 Hasil pembacaan logo</h2>
      <p className="text-xs text-slate-500 mb-4">Ini yang terbaca dari file logomu sebelum divektorisasi.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 text-center">
        {[
          [`${W}×${H}`, "dimensi px"],
          [bgType, "background"],
          [`${palette.length}`, "warna terdeteksi"],
          [analysis.hasAlpha ? "ya" : "tidak", "transparansi"],
        ].map(([a, b]) => (
          <div key={b} className="rounded-xl bg-slate-900/70 border border-slate-700/60 py-2.5">
            <div className="font-mono text-sm text-teal-300">{a}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{b}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-400 mb-2">Palet warna dominan:</div>
      <div className="flex flex-wrap gap-2">
        {palette.slice(0, 12).map((c) => (
          <div
            key={c.hex}
            title={`${c.hex} — ${c.pct.toFixed(1)}%`}
            className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-slate-900/70 border border-slate-700/60"
          >
            <span
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ background: c.hex }}
            />
            <span className="font-mono text-[11px] text-slate-300">{c.hex}</span>
            <span className="text-[10px] text-slate-500">{c.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
      {bg && (
        <div className="text-[11px] text-slate-500 mt-3">
          Background solid terdeteksi — dikecualikan dari komponen.
        </div>
      )}
    </div>
  );
}
