/**
 * vecshapes.js — convert traced segments into SVG path data and Lottie shapes.
 *
 * Segments: {type:'L', x1,y1,x2,y2} | {type:'Q', x1,y1,x2,y2,x3,y3}
 * (x1,y1 = start, x2,y2 = end for L / control for Q, x3,y3 = end for Q)
 */

const r2 = (v) => Math.round(v * 100) / 100;

/** Signed area of a polygon (positive = counter-clockwise). */
function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** Anchor points of a segment list (for area computation). */
function anchorsOf(segs) {
  const pts = [[segs[0].x1, segs[0].y1]];
  for (const s of segs) pts.push(s.type === "Q" ? [s.x3, s.y3] : [s.x2, s.y2]);
  return pts;
}

function reverseSegs(segs) {
  const rev = [];
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    if (s.type === "L") rev.push({ type: "L", x1: s.x2, y1: s.y2, x2: s.x1, y2: s.y1 });
    else rev.push({ type: "Q", x1: s.x3, y1: s.y3, x2: s.x2, y2: s.y2, x3: s.x1, y3: s.y1 });
  }
  return rev;
}

/**
 * Force winding: even depth (outer) → CCW (area>0), odd depth (hole) → CW.
 * Needed for Lottie/SVG nonzero fill so holes knock out.
 */
export function fixWinding(segs, depth) {
  const wantCCW = depth % 2 === 0;
  const area = signedArea(anchorsOf(segs));
  const isCCW = area > 0;
  if (wantCCW !== isCCW) return reverseSegs(segs);
  return segs;
}

/** Segments → SVG path `d` string. */
export function segsToD(segs) {
  let d = `M${r2(segs[0].x1)},${r2(segs[0].y1)}`;
  for (const s of segs) {
    if (s.type === "L") d += `L${r2(s.x2)},${r2(s.y2)}`;
    else d += `Q${r2(s.x2)},${r2(s.y2)},${r2(s.x3)},${r2(s.y3)}`;
  }
  return d + "Z";
}

/**
 * Segments → Lottie shape {i,o,v,c}.
 * Q converted to cubic: C1 = S + 2/3(C−S), C2 = E + 2/3(C−E).
 * Tangents are RELATIVE to their anchor (Lottie convention).
 */
export function segsToLottieShape(segs) {
  const v = [], ii = [], oo = [];
  const sx = segs[0].x1, sy = segs[0].y1;
  v.push([r2(sx), r2(sy)]); ii.push([0, 0]); oo.push([0, 0]);
  let px = sx, py = sy;
  for (const s of segs) {
    const ex = s.type === "Q" ? s.x3 : s.x2;
    const ey = s.type === "Q" ? s.y3 : s.y2;
    if (s.type === "Q") {
      const cx = s.x2, cy = s.y2;
      const c1x = px + (2 / 3) * (cx - px), c1y = py + (2 / 3) * (cy - py);
      const c2x = ex + (2 / 3) * (cx - ex), c2y = ey + (2 / 3) * (cy - ey);
      oo[oo.length - 1] = [r2(c1x - px), r2(c1y - py)];
      v.push([r2(ex), r2(ey)]);
      ii.push([r2(c2x - ex), r2(c2y - ey)]);
      oo.push([0, 0]);
    } else {
      v.push([r2(ex), r2(ey)]);
      ii.push([0, 0]);
      oo.push([0, 0]);
    }
    px = ex; py = ey;
  }
  // drop closing duplicate
  const n = v.length;
  if (n > 1 && Math.abs(v[n - 1][0] - v[0][0]) < 0.01 && Math.abs(v[n - 1][1] - v[0][1]) < 0.01) {
    v.pop(); ii.pop(); oo.pop();
  }
  return { i: ii, o: oo, v, c: true };
}

/** All paths of a component → array of Lottie shapes (winding fixed, local coords). */
export function componentToLottieShapes(comp) {
  return comp.paths.map((p) => {
    const fixed = fixWinding(p.segs, p.depth);
    // to local coords (subtract component origin)
    const local = fixed.map((s) => {
      const o = { type: s.type, x1: r2(s.x1 - comp.x0), y1: r2(s.y1 - comp.y0) };
      if (s.type === "Q") { o.x2 = r2(s.x2 - comp.x0); o.y2 = r2(s.y2 - comp.y0); o.x3 = r2(s.x3 - comp.x0); o.y3 = r2(s.y3 - comp.y0); }
      else { o.x2 = r2(s.x2 - comp.x0); o.y2 = r2(s.y2 - comp.y0); }
      return o;
    });
    return segsToLottieShape(local);
  });
}

/** Component → standalone SVG string (for thumbnails & export). */
export function componentToSVG(comp, forExport = false) {
  const ds = comp.paths
    .map((p) => {
      // offset to local coords for standalone use
      const local = p.segs.map((s) => {
        const o = { type: s.type, x1: s.x1 - comp.x0, y1: s.y1 - comp.y0 };
        if (s.type === "Q") { o.x2 = s.x2 - comp.x0; o.y2 = s.y2 - comp.y0; o.x3 = s.x3 - comp.x0; o.y3 = s.y3 - comp.y0; }
        else { o.x2 = s.x2 - comp.x0; o.y2 = s.y2 - comp.y0; }
        return o;
      });
      return `<path d="${segsToD(local)}"/>`;
    })
    .join("");
  const fillRule = ` fill-rule="evenodd"`;
  if (forExport) {
    return `<g id="${comp.id}" fill="${comp.hex}"${fillRule}>${ds}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${comp.w} ${comp.h}"><g fill="${comp.hex}"${fillRule}>${ds}</g></svg>`;
}

/** All components → one recreated vector SVG (design-identical, paths at original positions). */
export function componentsToSVG(components, W, H) {
  const placed = components
    .map((c) => {
      const ds = c.paths.map((p) => `<path d="${segsToD(p.segs)}"/>`).join("");
      return `<g id="${c.id}" fill="${c.hex}" fill-rule="evenodd">${ds}</g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${placed}</svg>`;
}

export function downloadSVG(svgString, filename) {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
