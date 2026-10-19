/**
 * shapelottie.js — build Lottie JSON with TRUE VECTOR shape layers.
 *
 * Reuses the hard-won kf()/EASE correctness from v1:
 *  - s ALWAYS an array, EVERY keyframe carries i/o easing.
 */
import { componentToLottieShapes } from "./vecshapes.js";

export const EASE = {
  out: { o: [0.215, 0.61], i: [0.355, 1] },
  outBack: { o: [0.34, 1.56], i: [0.64, 1] },
  outExpo: { o: [0.16, 1], i: [0.3, 1] },
  inOut: { o: [0.645, 0.045], i: [0.355, 1] },
  in: { o: [0.55, 0.055], i: [0.675, 0.19] },
  snap: { o: [0.85, 0], i: [0.15, 1] },
};

const LINEAR = { o: [0.25, 0.25], i: [0.75, 0.75] };

export function kf(t, s, ease = LINEAR) {
  const arr = Array.isArray(s) ? s : [s];
  const dims = arr.length;
  const k = { t: Math.round(t), s: arr };
  k.i = { x: Array(dims).fill(ease.i[0]), y: Array(dims).fill(ease.i[1]) };
  k.o = { x: Array(dims).fill(ease.o[0]), y: Array(dims).fill(ease.o[1]) };
  return k;
}

/** Fit source rect into square canvas; per-component final center. */
export function layoutComponents(components, srcW, srcH, size) {
  const fit = Math.min(size / srcW, size / srcH);
  const ox = (size - srcW * fit) / 2;
  const oy = (size - srcH * fit) / 2;
  return components.map((c) => ({
    fx: ox + c.cx * srcW * fit,
    fy: oy + c.cy * srcH * fit,
    fscale: fit * 100,
  }));
}

export function buildShapeLottie({ components, moves, size = 512, fps = 60, name = "logo-animation" }) {
  let total = 1;
  for (const m of moves)
    for (const prop of ["o", "r", "p", "s"])
      for (const k of m[prop] || []) total = Math.max(total, k.t + 1);

  // precompute shapes once
  const shapesPerComp = components.map(componentToLottieShapes);

  return {
    v: "5.7.4",
    fr: fps,
    ip: 0,
    op: total,
    w: size,
    h: size,
    nm: name,
    ddd: 0,
    assets: [],
    layers: components.map((c, i) => {
      const shapes = shapesPerComp[i];
      const [cr, cg, cb] = [c.color.r / 255, c.color.g / 255, c.color.b / 255];
      return {
        ddd: 0,
        ind: i + 1,
        ty: 4,
        nm: c.name,
        sr: 1,
        ks: {
          o: { a: 1, k: moves[i].o },
          r: { a: 1, k: moves[i].r },
          p: { a: 1, k: moves[i].p },
          a: { a: 0, k: [c.w / 2, c.h / 2, 0] },
          s: { a: 1, k: moves[i].s },
        },
        shapes: [
          {
            ty: "gr",
            nm: "paths",
            it: [
              ...shapes.map((sh, si) => ({ ty: "sh", nm: `p${si}`, ks: { a: 0, k: sh } })),
              { ty: "fl", nm: "fill", c: { a: 0, k: [cr, cg, cb, 1] }, o: { a: 0, k: 100 } },
              {
                ty: "tr", nm: "transform",
                p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 },
              },
            ],
          },
        ],
        ao: 0,
        ip: 0,
        op: total,
        st: 0,
        bm: 0,
      };
    }),
    markers: [],
  };
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
