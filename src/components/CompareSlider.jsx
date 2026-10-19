import { useRef, useState, useEffect } from "react";
import { componentsToSVG } from "../lib/vecshapes.js";

/** Before/after proof: original raster vs recreated vector — must look identical. */
export default function CompareSlider({ originalUrl, components, W, H, hidden }) {
  const wrapRef = useRef(null);
  const [pos, setPos] = useState(50);
  const [vecUrl, setVecUrl] = useState("");

  const visible = components.filter((c) => !hidden.has(c.id));
  useEffect(() => {
    if (!visible.length) { setVecUrl(""); return; }
    const svg = componentsToSVG(visible, W, H);
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    setVecUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [components, hidden, W, H]);

  if (!originalUrl || !vecUrl) return null;

  const onMove = (clientX) => {
    const r = wrapRef.current.getBoundingClientRect();
    setPos(Math.min(98, Math.max(2, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div className="glow-card rounded-2xl p-5">
      <h2 className="font-semibold text-teal-200 mb-1">⚖️ Bukti fidelitas — desain tak berubah</h2>
      <p className="text-xs text-slate-500 mb-4">
        Geser untuk bandingkan: kiri = raster asli, kanan = hasil vektor. Harus terlihat identik.
      </p>
      <div
        ref={wrapRef}
        className="compare-wrap checker rounded-xl border border-slate-700/60 aspect-[2/1] max-h-[320px] w-full cursor-ew-resize"
        onMouseDown={(e) => {
          onMove(e.clientX);
          const mv = (ev) => onMove(ev.clientX);
          const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
          window.addEventListener("mousemove", mv);
          window.addEventListener("mouseup", up);
        }}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
      >
        <img src={originalUrl} alt="asli" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
        <img
          src={vecUrl}
          alt="vektor"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
          draggable={false}
        />
        <div className="compare-handle" style={{ left: `${pos}%` }}>
          <div className="compare-knob">⇔</div>
        </div>
        <div className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded bg-black/70 text-slate-300">ASLI</div>
        <div className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded bg-black/70 text-teal-300">VEKTOR</div>
      </div>
    </div>
  );
}
