import { useMemo, useState } from "react";
import UploadZone from "./components/UploadZone.jsx";
import AnalysisPanel from "./components/AnalysisPanel.jsx";
import ComponentGrid from "./components/ComponentGrid.jsx";
import CompareSlider from "./components/CompareSlider.jsx";
import ChoreoPicker from "./components/ChoreoPicker.jsx";
import PreviewPane from "./components/PreviewPane.jsx";
import ExportBar from "./components/ExportBar.jsx";
import { analyzeLogo, vectorizeComponents } from "./lib/vectorize.js";
import { buildShapeLottie, layoutComponents } from "./lib/shapelottie.js";
import { getChoreo } from "./lib/choreo.js";
import { componentsToSVG } from "./lib/vecshapes.js";

const FPS = 60;

// Demo: render SVG → PNG → full vectorization pipeline
const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <circle cx="200" cy="180" r="90" fill="#5eead4"/>
  <circle cx="200" cy="180" r="38" fill="#0b0f18"/>
  <rect x="60" y="300" width="280" height="26" rx="13" fill="#a78bfa"/>
  <polygon points="330,60 360,110 300,110" fill="#f472b6"/>
</svg>`;

function svgToPngFile(svg, name) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 800; c.height = 800;
      c.getContext("2d").drawImage(img, 0, 0, 800, 800);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(new File([b], name, { type: "image/png" })) : reject(new Error("blob"))), "image/png");
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function App() {
  const [analysis, setAnalysis] = useState(null);
  const [components, setComponents] = useState([]);
  const [hidden, setHidden] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState("");
  const [numColors, setNumColors] = useState(8);
  const [precision, setPrecision] = useState(3);
  const [choreoId, setChoreoId] = useState("rakit");
  const [params, setParams] = useState({ dur: 0.9, stagger: 0.12, hold: 0.8 });
  const [size, setSize] = useState(512);
  const [loop, setLoop] = useState(true);

  const reset = () => {
    setAnalysis(null); setComponents([]); setHidden(new Set()); setError("");
  };

  const handleFile = async (file) => {
    if (!file) return;
    reset();
    setBusy(true); setBusyLabel("Membaca logo…");
    try {
      const a = await analyzeLogo(file);
      setAnalysis(a);
    } catch {
      setError("Gagal membaca file — coba PNG/JPG/SVG lain.");
    } finally {
      setBusy(false); setBusyLabel("");
    }
  };

  const handleSample = async () => {
    setBusy(true); setBusyLabel("Menyiapkan contoh…");
    try {
      const f = await svgToPngFile(SAMPLE_SVG, "contoh-logo.png");
      await handleFile(f);
    } catch {
      setError("Gagal menyiapkan contoh.");
      setBusy(false); setBusyLabel("");
    }
  };

  const handleVectorize = async () => {
    if (!analysis) return;
    setBusy(true); setBusyLabel("Menelusuri vektor per komponen…");
    setError("");
    try {
      // let UI breathe
      await new Promise((r) => setTimeout(r, 30));
      const comps = vectorizeComponents(analysis, { numColors, precision });
      setComponents(comps);
      setHidden(new Set());
    } catch (e) {
      setError(e.message === "no-components" ? "Tidak ada komponen terdeteksi — coba naikkan jumlah warna." : "Gagal divektorisasi — coba file lain.");
    } finally {
      setBusy(false); setBusyLabel("");
    }
  };

  const visibleComps = useMemo(() => components.filter((c) => !hidden.has(c.id)), [components, hidden]);

  const renameComp = (id, name) => setComponents((cs) => cs.map((c) => (c.id === id ? { ...c, name } : c)));
  const deleteComp = (id) => setComponents((cs) => cs.filter((c) => c.id !== id));
  const toggleHidden = (id) =>
    setHidden((h) => { const n = new Set(h); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const mergeComps = (ids) => {
    setComponents((cs) => {
      const picked = cs.filter((c) => ids.includes(c.id));
      if (picked.length < 2) return cs;
      const base = { ...picked[0] };
      base.paths = picked.flatMap((c) => c.paths);
      base.name = picked.map((c) => c.name).join(" + ");
      base.area = picked.reduce((a, c) => a + c.area, 0);
      const rest = cs.filter((c) => !ids.includes(c.id));
      const idx = cs.indexOf(picked[0]);
      rest.splice(Math.min(idx, rest.length), 0, base);
      return rest;
    });
  };

  const lottieData = useMemo(() => {
    if (!visibleComps.length || !analysis) return null;
    const choreo = getChoreo(choreoId);
    const layout = layoutComponents(visibleComps, analysis.W, analysis.H, size);
    const { moves } = choreo.build(visibleComps, layout, {
      fps: FPS, size,
      staggerF: Math.round(params.stagger * FPS),
      moveF: Math.round(params.dur * FPS),
      holdSec: params.hold,
    });
    return buildShapeLottie({ components: visibleComps, moves, size, fps: FPS, name: `${analysis.fileName}-${choreoId}` });
  }, [visibleComps, analysis, choreoId, params, size]);

  const svgString = useMemo(() => {
    if (!visibleComps.length || !analysis) return "";
    return componentsToSVG(visibleComps, analysis.W, analysis.H);
  }, [visibleComps, analysis]);

  const totalPaths = useMemo(() => visibleComps.reduce((a, c) => a + c.paths.length, 0), [visibleComps]);

  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto px-5 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-violet-500 flex items-center justify-center text-xl">△</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Vector<span className="text-teal-300">Logo</span> Studio
          </h1>
          <span className="text-[10px] px-2 py-1 rounded-full bg-violet-400/15 border border-violet-400/40 text-violet-300 font-mono">VECTOR EDITION</span>
        </div>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
          Upload logo → dibaca &amp; dipecah per komponen → di-<span className="text-teal-300">trace jadi vektor asli</span> (desain 100% sama) → dianimasikan → export <span className="text-teal-300 font-mono">SVG</span> + <span className="text-teal-300 font-mono">Lottie</span>.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-5 pb-16 space-y-5">
        <UploadZone onFile={handleFile} busy={busy} />
        {busy && busyLabel && <div className="text-sm text-teal-300 text-center -mt-2">{busyLabel}</div>}

        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">Belum ada logo? Coba contoh (raster → full pipeline vektor):</span>
          <button
            disabled={busy}
            onClick={handleSample}
            className="px-3.5 py-1.5 rounded-full border border-violet-400/40 text-violet-300 text-xs font-semibold hover:bg-violet-400/10 transition-colors disabled:opacity-50"
          >
            ✨ Contoh logo
          </button>
          {analysis && (
            <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2">
              mulai ulang
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm px-4 py-3">{error}</div>
        )}

        {analysis && (
          <>
            <AnalysisPanel analysis={analysis} />
            {!components.length && (
              <div className="glow-card rounded-2xl p-5">
                <h2 className="font-semibold text-teal-200 mb-3">⚙️ Pengaturan vektorisai</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-5">
                  <label className="block">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300">Jumlah warna</span>
                      <span className="text-teal-300 font-mono">{numColors}</span>
                    </div>
                    <input type="range" min={2} max={16} step={1} value={numColors}
                      style={{ "--fill": `${((numColors - 2) / 14) * 100}%` }}
                      onChange={(e) => setNumColors(Number(e.target.value))} className="w-full" />
                    <div className="text-[11px] text-slate-500 mt-1">Tiap warna = calon komponen. Logo flat biasanya 2–8.</div>
                  </label>
                  <label className="block">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300">Presisi trace</span>
                      <span className="text-teal-300 font-mono">{["", "Rendah", "Sedang", "Maksimal"][precision]}</span>
                    </div>
                    <input type="range" min={1} max={3} step={1} value={precision}
                      style={{ "--fill": `${((precision - 1) / 2) * 100}%` }}
                      onChange={(e) => setPrecision(Number(e.target.value))} className="w-full" />
                    <div className="text-[11px] text-slate-500 mt-1">Maksimal = geometri paling setia ke aslinya.</div>
                  </label>
                </div>
                <button
                  onClick={handleVectorize}
                  disabled={busy}
                  className="btn-primary w-full sm:w-auto px-8 py-3 rounded-xl bg-teal-400 text-slate-950 text-sm font-bold hover:bg-teal-300 transition-colors disabled:opacity-50"
                >
                  △ Vektorisasi jadi komponen
                </button>
              </div>
            )}
          </>
        )}

        {!!components.length && (
          <>
            <ComponentGrid
              components={components}
              onRename={renameComp}
              onDelete={deleteComp}
              onToggle={toggleHidden}
              onMerge={mergeComps}
              hidden={hidden}
              setHidden={toggleHidden}
            />
            <CompareSlider
              originalUrl={analysis.previewUrl}
              components={components}
              W={analysis.W} H={analysis.H}
              hidden={hidden}
            />
            <ChoreoPicker
              choreoId={choreoId} setChoreoId={setChoreoId}
              params={params} setParams={setParams}
              size={size} setSize={setSize}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <PreviewPane data={lottieData} loop={loop} setLoop={setLoop} />
              <ExportBar
                data={lottieData}
                svgString={svgString}
                fileName={analysis.fileName}
                choreoName={choreoId}
                vectorLayerCount={totalPaths}
              />
            </div>
          </>
        )}

        {!analysis && !busy && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {[
              ["🔍", "Benar-benar dibaca", "Dimensi, transparansi, background & palet warna terdeteksi otomatis sebelum diproses."],
              ["△", "Vektor asli per komponen", "Tiap komponen di-trace jadi path SVG beneran — scalable tak terbatas, desain 100% sama."],
              ["✨", "Animasi + export ganda", "Koreografi per komponen → Lottie shape-layer vektor + file SVG hasil recreate."],
            ].map(([icon, title, desc]) => (
              <div key={title} className="glow-card rounded-2xl p-5">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="font-semibold text-sm mb-1">{title}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-600">
        VectorLogo Studio — bedah logo jadi vektor, tanpa mengubah desain sedikit pun.
      </footer>
    </div>
  );
}
