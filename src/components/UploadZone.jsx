import { useRef, useState } from "react";

export default function UploadZone({ onFile, busy }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const pick = (f) => {
    if (f && onFile) onFile(f);
  };

  return (
    <div
      onClick={() => !busy && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) pick(f);
      }}
      className={`relative rounded-2xl border-2 border-dashed border-slate-700 glow-card p-10 text-center cursor-pointer transition-colors ${drag ? "drop-active" : ""} ${busy ? "opacity-60 pointer-events-none" : ""}`}
    >
      {busy && <div className="scan-line" />}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,.svg"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <div className="text-5xl mb-4">🎨</div>
      <div className="text-lg font-semibold text-teal-200">
        {busy ? "Membedah logo…" : "Tarik & letakkan logo di sini"}
      </div>
      <div className="text-sm text-slate-400 mt-2">
        atau klik untuk pilih file — PNG, JPG, atau SVG (SVG = hasil pecahan paling rapi)
      </div>
      <div className="text-xs text-slate-500 mt-3">
        Logo dipecah otomatis per elemen → tiap elemen dianimasikan sendiri-sendiri
      </div>
    </div>
  );
}
