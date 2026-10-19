/**
 * choreo.js — creative choreographies built from the logo's own items.
 *
 * Each choreography receives the decomposed items + their canvas layout and
 * returns per-item transform keyframes. Because every item flies/lands on its
 * own path with stagger, the same template looks custom for every logo.
 */
import { kf, EASE } from "./shapelottie.js";

const F = (fps, sec) => Math.round(sec * fps);

function finalize(moves, fps, holdSec) {
  let end = 1;
  for (const m of moves)
    for (const prop of ["o", "r", "p", "s"])
      for (const k of m[prop] || []) end = Math.max(end, k.t);
  const holdF = F(fps, holdSec);
  for (const m of moves)
    for (const prop of ["o", "r", "p", "s"]) {
      const list = m[prop];
      if (list && list.length) {
        const last = list[list.length - 1];
        list.push(kf(end + holdF, last.s)); // freeze final pose through the hold
      }
    }
  return { moves, totalFrames: end + holdF + 1 };
}

const rakit = {
  id: "rakit",
  name: "Rakit",
  desc: "Tiap item terbang dari luar mengikuti arah posisinya, lalu nempel jadi logo.",
  build(items, layout, o) {
    const { fps, size, staggerF, moveF } = o;
    const moves = items.map((it, i) => {
      const L = layout[i];
      const d = i * staggerF;
      const dx = it.ncx - 0.5, dy = it.ncy - 0.5;
      const m = Math.hypot(dx, dy) || 0.5;
      const dist = size * 0.62;
      const land = d + moveF;
      return {
        o: [kf(d, 0), kf(d + moveF * 0.5, 100, EASE.out)],
        r: [kf(d, -120), kf(land, 0, EASE.outBack)],
        p: [
          kf(d, [L.fx + (dx / m) * dist, L.fy + (dy / m) * dist]),
          kf(land, [L.fx, L.fy], EASE.out),
        ],
        s: [kf(d, [0, 0]), kf(land, [L.fscale, L.fscale], EASE.outBack)],
      };
    });
    return finalize(moves, fps, o.holdSec);
  },
};

const kaskade = {
  id: "kaskade",
  name: "Kaskade",
  desc: "Item jatuh satu per satu dari atas dengan pantulan kecil.",
  build(items, layout, o) {
    const { fps, size, staggerF, moveF } = o;
    const moves = items.map((it, i) => {
      const L = layout[i];
      const d = i * staggerF;
      const land = d + moveF;
      const b1 = land + F(fps, 0.14);
      const b2 = land + F(fps, 0.28);
      return {
        o: [kf(d, 0), kf(d + F(fps, 0.18), 100, EASE.out)],
        r: [
          kf(d, (i % 2 === 0 ? -14 : 14)),
          kf(land, 0, EASE.out),
          kf(b2, 0),
        ],
        p: [
          kf(d, [L.fx, -size * 0.3]),
          kf(land, [L.fx, L.fy], EASE.in),
          kf(b1, [L.fx, L.fy - size * 0.07], EASE.out),
          kf(b2, [L.fx, L.fy], EASE.inOut),
        ],
        s: [
          kf(d, [L.fscale, L.fscale]),
          kf(land, [L.fscale * 1.12, L.fscale * 0.88], EASE.out),
          kf(b2, [L.fscale, L.fscale], EASE.inOut),
        ],
      };
    });
    return finalize(moves, fps, o.holdSec);
  },
};

const ledak = {
  id: "ledak",
  name: "Ledakan",
  desc: "Semua item mulai dari satu titik di tengah, lalu meledak ke posisinya.",
  build(items, layout, o) {
    const { fps, size, staggerF, moveF } = o;
    const moves = items.map((it, i) => {
      const L = layout[i];
      const d = i * staggerF * 0.6;
      const land = d + moveF;
      return {
        o: [kf(0, 0), kf(d + F(fps, 0.12), 100, EASE.out)],
        r: [kf(d, i % 2 ? 100 : -100), kf(land, 0, EASE.out)],
        p: [kf(d, [size / 2, size / 2]), kf(land, [L.fx, L.fy], EASE.outExpo)],
        s: [kf(d, [0, 0]), kf(land, [L.fscale, L.fscale], EASE.outBack)],
      };
    });
    return finalize(moves, fps, o.holdSec);
  },
};

const gelombang = {
  id: "gelombang",
  name: "Gelombang",
  desc: "Item naik dari bawah mengikuti gelombang, satu per satu.",
  build(items, layout, o) {
    const { fps, size, staggerF, moveF } = o;
    const moves = items.map((it, i) => {
      const L = layout[i];
      const d = i * staggerF;
      const mid = d + moveF * 0.55;
      const land = d + moveF;
      const amp = size * 0.1;
      return {
        o: [kf(d, 0), kf(d + F(fps, 0.25), 100, EASE.out)],
        r: [kf(d, 0), kf(land, 0)],
        p: [
          kf(d, [L.fx, L.fy + size * 0.45]),
          kf(mid, [L.fx, L.fy - amp], EASE.out),
          kf(land, [L.fx, L.fy], EASE.inOut),
        ],
        s: [
          kf(d, [L.fscale * 0.55, L.fscale * 0.55]),
          kf(land, [L.fscale, L.fscale], EASE.outBack),
        ],
      };
    });
    return finalize(moves, fps, o.holdSec);
  },
};

const pusaran = {
  id: "pusaran",
  name: "Pusaran",
  desc: "Item berputar 360° sambil spiral masuk ke tempatnya.",
  build(items, layout, o) {
    const { fps, size, staggerF, moveF } = o;
    const moves = items.map((it, i) => {
      const L = layout[i];
      const d = i * staggerF;
      const mid = d + moveF * 0.55;
      const land = d + moveF;
      return {
        o: [kf(d, 0), kf(d + F(fps, 0.15), 100, EASE.out)],
        r: [kf(d, -360), kf(land, 0, EASE.out)],
        p: [
          kf(d, [L.fx + size * 0.32, L.fy - size * 0.32]),
          kf(mid, [L.fx - size * 0.09, L.fy + size * 0.09], EASE.out),
          kf(land, [L.fx, L.fy], EASE.inOut),
        ],
        s: [kf(d, [0, 0]), kf(land, [L.fscale, L.fscale], EASE.out)],
      };
    });
    return finalize(moves, fps, o.holdSec);
  },
};

export const CHOREOS = [rakit, kaskade, ledak, gelombang, pusaran];

export function getChoreo(id) {
  return CHOREOS.find((c) => c.id === id) || CHOREOS[0];
}
