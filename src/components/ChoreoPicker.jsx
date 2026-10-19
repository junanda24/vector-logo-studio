import { CHOREOS } from "../lib/choreo.js";

function Slider({ label, value, min, max, step, unit, onChange }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-300">{label}</span>
        <span className="text-teal-300 font-mono">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        style={{ "--fill": `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

export default function ChoreoPicker({ choreoId, setChoreoId, params, setParams, size, setSize }) {
  return (
    <div className="glow-card rounded-2xl p-5">
      <h2 className="font-semibold text-teal-200 mb-1">✨ Koreografi animasi</h2>
      <p className="text-xs text-slate-500 mb-4">
        Template gerak kreatif yang disusun dari item-item logomu sendiri.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {CHOREOS.map((c) => (
          <button
            key={c.id}
            onClick={() => setChoreoId(c.id)}
            className={`choreo-card text-left rounded-xl border border-slate-700/70 bg-slate-900/60 p-3.5 ${choreoId === c.id ? "active" : ""}`}
          >
            <div className="font-semibold text-sm text-slate-100 mb-1">{c.name}</div>
            <div className="text-[11px] leading-relaxed text-slate-400">{c.desc}</div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
        <Slider label="Durasi tiap item" value={params.dur} min={0.5} max={1.8} step={0.05} unit=" dtk" onChange={(v) => setParams({ ...params, dur: v })} />
        <Slider label="Jeda antar item" value={params.stagger} min={0.03} max={0.5} step={0.01} unit=" dtk" onChange={(v) => setParams({ ...params, stagger: v })} />
        <Slider label="Tahan di akhir" value={params.hold} min={0.3} max={2} step={0.1} unit=" dtk" onChange={(v) => setParams({ ...params, hold: v })} />
      </div>
      <div className="flex items-center gap-3 mt-4 text-xs">
        <span className="text-slate-400">Ukuran canvas:</span>
        {[512, 1024].map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`px-3 py-1.5 rounded-lg border font-mono ${size === s ? "border-teal-400 text-teal-300 bg-teal-400/10" : "border-slate-700 text-slate-400"}`}
          >
            {s}×{s}
          </button>
        ))}
      </div>
    </div>
  );
}
