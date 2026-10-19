/**
 * vectorize.js — TRUE vectorization pipeline ("bedah per komponen, jadi vektor asli").
 *
 * 1. analyzeLogo(file)      → smart ingest: dims, transparency, bg, palette
 * 2. vectorizeComponents()   → per color → connected components → trace each
 *                              component's flat mask with ImageTracerJS →
 *                              true SVG vector paths (NOT png blobs)
 *
 * Design fidelity: colors sampled from the original, geometry traced at
 * full resolution. Nothing about the design is altered.
 */
import ImageTracer from "imagetracerjs";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img-load"));
    img.src = src;
  });
}

function canvasOf(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/** Phase 1 — read the logo. Returns analysis object. */
export async function analyzeLogo(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const W = Math.max(8, Math.round(img.width * scale));
    const H = Math.max(8, Math.round(img.height * scale));
    const c = canvasOf(W, H);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    const imageData = ctx.getImageData(0, 0, W, H);
    const d = imageData.data;

    let hasAlpha = false;
    for (let i = 3; i < d.length; i += 64) {
      if (d[i] < 250) { hasAlpha = true; break; }
    }

    // background detection (for non-transparent): most common corner color
    let bg = null;
    if (!hasAlpha) {
      const key = (i) => `${d[i * 4] >> 4},${d[(i * 4 + 1)] >> 4},${d[(i * 4 + 2)] >> 4}`;
      const votes = {};
      const corner = (x0, y0) => {
        for (let y = y0; y < Math.min(H, y0 + 10); y++)
          for (let x = x0; x < Math.min(W, x0 + 10); x++) {
            const k = key(y * W + x);
            votes[k] = (votes[k] || 0) + 1;
          }
      };
      corner(0, 0); corner(W - 10, 0); corner(0, H - 10); corner(W - 10, H - 10);
      const top = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] > 200) {
        const [r, g, b] = top[0].split(",").map((v) => Number(v) * 16 + 8);
        bg = { r, g, b };
      }
    }

    // palette histogram (12-bit) over opaque, non-bg pixels
    const hist = new Map();
    const isBg = (r, g, b) =>
      bg && Math.abs(r - bg.r) < 24 && Math.abs(g - bg.g) < 24 && Math.abs(b - bg.b) < 24;
    for (let i = 0; i < W * H; i++) {
      if (d[i * 4 + 3] < 128) continue;
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      if (isBg(r, g, b)) continue;
      const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      let e = hist.get(k);
      if (!e) { e = { r: 0, g: 0, b: 0, n: 0 }; hist.set(k, e); }
      e.r += r; e.g += g; e.b += b; e.n++;
    }
    const total = [...hist.values()].reduce((a, e) => a + e.n, 0) || 1;
    const palette = [...hist.entries()]
      .map(([k, e]) => ({
        key: k,
        r: Math.round(e.r / e.n), g: Math.round(e.g / e.n), b: Math.round(e.b / e.n),
        count: e.n, pct: (e.n / total) * 100,
        hex: rgbToHex(e.r / e.n, e.g / e.n, e.b / e.n),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      fileName: file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "logo",
      W, H, hasAlpha, bg,
      bgType: hasAlpha ? "transparan" : bg ? "solid" : "penuh",
      palette, imageData,
      previewUrl: c.toDataURL("image/png"),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Assign each pixel to nearest palette color (or -1 for transparent/bg). */
function buildLabelMap(analysis, numColors) {
  const { W, H, imageData, palette, bg, hasAlpha } = analysis;
  const d = imageData.data;
  const pal = palette.slice(0, numColors);
  const isBg = (r, g, b) =>
    !hasAlpha && bg && Math.abs(r - bg.r) < 32 && Math.abs(g - bg.g) < 32 && Math.abs(b - bg.b) < 32;
  const map = new Int16Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (d[i * 4 + 3] < 128) { map[i] = -1; continue; }
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    if (isBg(r, g, b)) { map[i] = -1; continue; }
    let best = 0, bd = Infinity;
    for (let p = 0; p < pal.length; p++) {
      const dr = r - pal[p].r, dg = g - pal[p].g, db = b - pal[p].b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bd) { bd = dist; best = p; }
    }
    map[i] = best;
  }
  return { map, pal };
}

/**
 * Phase 2 — vectorize. Returns components with TRUE vector paths.
 * Component: { id, name, color:{r,g,b}, hex, w,h, x0,y0, paths:[{segs,depth}], cx,cy (0..1), area }
 * Path coords are in SOURCE pixels.
 */
export function vectorizeComponents(analysis, { numColors = 8, precision = 3 } = {}) {
  const { W, H } = analysis;
  const { map, pal } = buildLabelMap(analysis, numColors);
  if (!pal.length) throw new Error("no-colors");

  // union-find labeling → roots per pixel
  const labels = new Int32Array(W * H);
  const parent = [0];
  const find = (x) => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    while (parent[x] !== r) { const nx = parent[x]; parent[x] = r; x = nx; }
    return r;
  };
  let next = 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, ci = map[i];
      if (ci < 0) continue;
      const left = x > 0 && map[i - 1] === ci ? labels[i - 1] : 0;
      const up = y > 0 && map[i - W] === ci ? labels[i - W] : 0;
      if (!left && !up) { parent[next] = next; labels[i] = next++; }
      else if (left && up && left !== up) {
        const a = find(left), b = find(up);
        parent[Math.max(a, b)] = Math.min(a, b);
        labels[i] = Math.min(a, b);
      } else labels[i] = left || up;
    }
  }
  const roots = new Int32Array(W * H);
  for (let i = 0; i < W * H; i++) if (map[i] >= 0) roots[i] = find(labels[i]);

  const compMap = new Map();
  for (let i = 0; i < W * H; i++) {
    if (map[i] < 0) continue;
    const r = roots[i];
    let cc = compMap.get(r);
    if (!cc) {
      cc = { root: r, colorIdx: map[i], x0: W, y0: H, x1: -1, y1: -1, n: 0, sx: 0, sy: 0 };
      compMap.set(r, cc);
    }
    const x = i % W, y = (i / W) | 0;
    if (x < cc.x0) cc.x0 = x;
    if (x > cc.x1) cc.x1 = x;
    if (y < cc.y0) cc.y0 = y;
    if (y > cc.y1) cc.y1 = y;
    cc.n++; cc.sx += x; cc.sy += y;
  }
  const comps = [...compMap.values()]
    .filter((cc) => cc.n > W * H * 0.0008)
    .sort((a, b) => b.n - a.n)
    .slice(0, 16)
    .map((cc, idx) => ({ ...cc, idx, color: pal[cc.colorIdx] }));

  const workScale = Math.max(W, H) < 250 ? 3 : Math.max(W, H) < 500 ? 2 : 1;
  const prec = { 1: { ltres: 8, qtres: 8 }, 2: { ltres: 4, qtres: 4 }, 3: { ltres: 1, qtres: 1 } }[precision] || { ltres: 1, qtres: 1 };

  const out = [];
  for (const comp of comps) {
    const { x0, y0, x1, y1, root, color } = comp;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const S = workScale;
    const sw = w * S, sh = h * S;
    const data = new Uint8ClampedArray(sw * sh * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gi = (y0 + y) * W + (x0 + x);
        if (map[gi] !== comp.colorIdx || roots[gi] !== root) continue;
        for (let dy = 0; dy < S; dy++) {
          for (let dx = 0; dx < S; dx++) {
            const o = ((y * S + dy) * sw + (x * S + dx)) * 4;
            data[o] = color.r; data[o + 1] = color.g; data[o + 2] = color.b; data[o + 3] = 255;
          }
        }
      }
    }
    let td;
    try {
      td = ImageTracer.imagedataToTracedata(
        { width: sw, height: sh, data },
        { numberofcolors: 2, colorquantcycles: 3, mincolorratio: 0, pathomit: 0, ltres: prec.ltres, qtres: prec.qtres, scale: 1 }
      );
    } catch { continue; }
    let layer = null;
    for (let li = 0; li < td.layers.length; li++) {
      const pc = td.palette[li];
      if (pc.a > 128 && td.layers[li].length > 0) { layer = td.layers[li]; break; }
    }
    if (!layer) continue;

    // flatten paths with hole depth; coords back to source scale, offset by crop origin
    const paths = [];
    const seen = new Set();
    const pushPath = (p, depth) => {
      if (seen.has(p)) return;
      seen.add(p);
      const segs = p.segments.map((s) => {
        const o = { type: s.type, x1: s.x1 / S + x0, y1: s.y1 / S + y0 };
        if (s.type === "Q") { o.x2 = s.x2 / S + x0; o.y2 = s.y2 / S + y0; o.x3 = s.x3 / S + x0; o.y3 = s.y3 / S + y0; }
        else { o.x2 = s.x2 / S + x0; o.y2 = s.y2 / S + y0; }
        return o;
      });
      paths.push({ segs, depth });
    };
    const walk = (pi, depth) => {
      const p = layer[pi];
      pushPath(p, depth);
      for (const hi of p.holechildren || []) walk(hi, depth + 1);
    };
    layer.forEach((p, pi) => { if (!p.isholepath) walk(pi, 0); });

    if (!paths.length) continue;
    out.push({
      id: `comp-${out.length}`,
      name: `Komponen ${out.length + 1}`,
      color: { r: color.r, g: color.g, b: color.b },
      hex: rgbToHex(color.r, color.g, color.b),
      w, h, x0, y0,
      paths,
      cx: comp.sx / comp.n / W,
      cy: comp.sy / comp.n / H,
      ncx: comp.sx / comp.n / W,
      ncy: comp.sy / comp.n / H,
      area: comp.n,
    });
  }
  if (!out.length) throw new Error("no-components");
  return out;
}
