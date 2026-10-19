import { useEffect, useRef, useState } from "react";
import lottie from "lottie-web";

export default function PreviewPane({ data, loop, setLoop }) {
  const boxRef = useRef(null);
  const animRef = useRef(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!boxRef.current || !data) return;
    const anim = lottie.loadAnimation({
      container: boxRef.current,
      renderer: "svg",
      loop,
      autoplay: true,
      animationData: data,
    });
    animRef.current = anim;
    setPlaying(true);
    const onComplete = () => setPlaying(false);
    anim.addEventListener("complete", onComplete);
    return () => {
      anim.removeEventListener("complete", onComplete);
      anim.destroy();
      animRef.current = null;
    };
  }, [data, loop]);

  const toggle = () => {
    const a = animRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };
  const restart = () => {
    animRef.current?.goToAndPlay(0, true);
    setPlaying(true);
  };

  if (!data) return null;
  return (
    <div className="glow-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-teal-200">▶️ Preview animasi</h2>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={loop}
            onChange={(e) => setLoop(e.target.checked)}
            className="accent-teal-400 w-3.5 h-3.5"
          />
          Loop
        </label>
      </div>
      <div className="checker rounded-xl border border-slate-700/60 aspect-square max-h-[420px] w-full mx-auto overflow-hidden">
        <div ref={boxRef} className="w-full h-full" />
      </div>
      <div className="flex gap-2.5 mt-4">
        <button
          onClick={toggle}
          className="flex-1 py-2.5 rounded-xl bg-teal-400/15 border border-teal-400/40 text-teal-200 text-sm font-semibold hover:bg-teal-400/25 transition-colors"
        >
          {playing ? "⏸️ Jeda" : "▶️ Main"}
        </button>
        <button
          onClick={restart}
          className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          🔁 Ulangi
        </button>
      </div>
    </div>
  );
}
