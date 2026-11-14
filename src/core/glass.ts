import type { GlassTint } from "./color";

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Visual parameters of the glass; light and dark themes differ only in these numbers. */
export interface GlassLook {
  readonly tint: number;
  readonly core: number;
  readonly edgeTint: number;
  readonly milky: number;
  readonly frost: number;
  readonly bezel: number;
  readonly blur: number;
  readonly saturate: number;
  readonly brightness: number;
  readonly rim: number;
  readonly cast: number;
  readonly contact: number;
  readonly corner: number;
  readonly bevel: number;
  readonly bevelColor: string;
  readonly bevelLight: number;
  readonly outline: number;
  readonly scratches: number;
  readonly pits: number;
  readonly lampGlow: boolean;
}

export const LIGHT_LOOK: GlassLook = {
  tint: 0.24, core: 0.2, edgeTint: 0.28, milky: 0.03, frost: 0.04, bezel: 5, blur: 0.45, saturate: 1.15,
  brightness: 0.92, rim: 0.97, cast: 0.24, contact: 0.35, corner: 4, bevel: 2.2, bevelColor: "#fff",
  bevelLight: 1, outline: 0.55, scratches: 2, pits: 3, lampGlow: false,
};

// Lights off: more body color, and most of the white rim and sheen gives way to warm lamp light.
export const DARK_LOOK: GlassLook = {
  ...LIGHT_LOOK, tint: 0.34, core: 0.26, rim: 0.2, cast: 0.22, contact: 0.6, saturate: 1.2, brightness: 0.9,
  bevelLight: 0.4, bevelColor: "#ffd9a8", outline: 0.35, lampGlow: true,
};

/** Park–Miller PRNG so each piece's tint and wear are stable across renders. */
export function seeded(seed: number): () => number {
  let s = Math.floor(Math.abs(seed)) % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const hash = (str: string): number => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

const fx = (v: number): string => v.toFixed(1);

interface Segment {
  readonly len: number;
  readonly at: (u: number) => Point & { readonly nx: number; readonly ny: number };
}

function roundedRectSegments(w: number, h: number, radius: number): readonly Segment[] {
  const r = Math.min(radius, w / 2, h / 2);
  const line = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number): Segment => ({
    len: Math.hypot(x1 - x0, y1 - y0),
    at: u => ({ x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u, nx, ny }),
  });
  const arc = (cx: number, cy: number, a0: number): Segment => ({
    len: (r * Math.PI) / 2,
    at: u => {
      const a = a0 + (u * Math.PI) / 2;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) };
    },
  });
  return [
    line(r, 0, w - r, 0, 0, -1), arc(w - r, r, -Math.PI / 2),
    line(w, r, w, h - r, 1, 0), arc(w - r, h - r, 0),
    line(w - r, h, r, h, 0, 1), arc(r, h - r, Math.PI / 2),
    line(0, h - r, 0, r, -1, 0), arc(r, r, Math.PI),
  ];
}

/** Outline of a domino slab, inset half a pixel so the stroke stays inside its time span. */
export function slabOutline(w: number, h: number, corner: number): readonly Point[] {
  const segments = roundedRectSegments(w, h, Math.min(corner, w / 2 - 1, h / 2 - 1));
  const total = segments.reduce((sum, seg) => sum + seg.len, 0);
  const n = Math.max(60, Math.min(400, Math.round((2 * (w + h)) / 2.5)));
  return Array.from({ length: n }, (_, i) => {
    const target = (i / n) * total;
    const { seg, offset } = segments.reduce<{ seg: Segment | null; offset: number }>(
      (acc, s) => (acc.seg ? acc : acc.offset + s.len >= target ? { seg: s, offset: acc.offset } : { seg: null, offset: acc.offset + s.len }),
      { seg: null, offset: 0 },
    );
    const s = seg ?? segments[segments.length - 1]!;
    const pt = s.at(s.len ? Math.max(0, Math.min(1, (target - offset) / s.len)) : 0);
    return { x: pt.x - pt.nx * 0.5, y: pt.y - pt.ny * 0.5 };
  });
}

/** Closed Catmull–Rom spline through `pts`, as an SVG path. */
export function smoothPath(pts: readonly Point[], ox = 0, oy = 0): string {
  const n = pts.length;
  const p = (i: number): Point => pts[(i + n) % n]!;
  const curves = pts.map((_, i) => {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    return `C${fx(c1.x + ox)},${fx(c1.y + oy)} ${fx(c2.x + ox)},${fx(c2.y + oy)} ${fx(p2.x + ox)},${fx(p2.y + oy)}`;
  });
  return `M${fx(p(0).x + ox)},${fx(p(0).y + oy)} ${curves.join(" ")} Z`;
}

export function weatheringSvg(w: number, h: number, rnd: () => number, look: GlassLook): string {
  const scratches = Array.from({ length: look.scratches }, () => {
    const x = rnd() * w, y = rnd() * h, len = 6 + rnd() * 26, a = rnd() * Math.PI;
    const bend = (rnd() - 0.5) * 6;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    return `<path d="M${fx(x)},${fx(y)} Q${fx((x + x2) / 2 + bend)},${fx((y + y2) / 2 - bend)} ${fx(x2)},${fx(y2)}" stroke="#fff" stroke-width="${fx(0.4 + rnd() * 0.5)}" stroke-opacity="${fx(0.12 + rnd() * 0.22)}" fill="none"/>`;
  });
  const pits = Array.from({ length: look.pits }, () => {
    const nearEdge = rnd() < 0.6;
    const x = nearEdge ? (rnd() < 0.5 ? rnd() * 12 : w - rnd() * 12) : rnd() * w;
    return `<circle cx="${fx(x)}" cy="${fx(rnd() * h)}" r="${fx(0.5 + rnd() * 1.1)}" fill="#fff" fill-opacity="${fx(0.25 + rnd() * 0.35)}"/>`;
  });
  return scratches.join("") + pits.join("");
}

export interface GlassSvgInput {
  readonly id: string;
  readonly path: string;
  /** Data URL of the specular rim image, sized to the piece plus `rimPad` on every side. */
  readonly rim: string;
  readonly rimPad: number;
  readonly w: number;
  readonly h: number;
  readonly tint: GlassTint;
  readonly look: GlassLook;
  readonly weathering: string;
}

const glowGradient = (id: string, x1: number, x2: number) => `
  <linearGradient id="${id}" x1="${x1}" y1="0" x2="${x2}" y2="0">
    <stop offset="0" stop-color="#ffc47e" stop-opacity=".42"/>
    <stop offset=".18" stop-color="#ffb862" stop-opacity=".08"/>
    <stop offset=".4" stop-color="#ffb862" stop-opacity="0"/>
  </linearGradient>`;

/** Layered SVG for one piece: shadow outside the slab, then body, depth, wear, lamp light, bevel and rim. */
export function glassSvg({ id, path: d, rim, rimPad, w, h, tint: c, look: st, weathering }: GlassSvgInput): string {
  const lamp = st.lampGlow;
  return `
    <defs>
      <clipPath id="${id}-clip"><path d="${d}"/></clipPath>
      <mask id="${id}-outside" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${w + 80}" height="${h + 80}">
        <rect x="-40" y="-40" width="${w + 80}" height="${h + 80}" fill="#fff"/><path d="${d}" fill="#000"/>
      </mask>
      <radialGradient id="${id}-core" cx=".5" cy=".55" r=".62">
        <stop offset="0" stop-color="${c.core}" stop-opacity="1"/>
        <stop offset=".7" stop-color="${c.core}" stop-opacity=".35"/>
        <stop offset="1" stop-color="${c.core}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-bevel" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="${h}">
        <stop offset="0" stop-color="${st.bevelColor}" stop-opacity="${0.85 * st.bevelLight}"/>
        <stop offset=".3" stop-color="${st.bevelColor}" stop-opacity="${0.35 * st.bevelLight}"/>
        <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
        <stop offset=".75" stop-color="#000" stop-opacity=".18"/>
        <stop offset="1" stop-color="#000" stop-opacity=".45"/>
      </linearGradient>
      <linearGradient id="${id}-sheen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".22"/>
        <stop offset=".35" stop-color="#fff" stop-opacity="0"/>
        <stop offset="1" stop-color="#fff" stop-opacity=".06"/>
      </linearGradient>
      ${lamp ? `${glowGradient(`${id}-glowL`, 0, 1)}${glowGradient(`${id}-glowR`, 1, 0)}
      <linearGradient id="${id}-glowT" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffd29a" stop-opacity=".32"/>
        <stop offset=".22" stop-color="#ffc47e" stop-opacity="0"/>
      </linearGradient>` : ""}
    </defs>
    <g mask="url(#${id}-outside)">
      <path d="${d}" transform="translate(1.5 3)" fill="#000" opacity="${st.contact}" filter="url(#rc-b2)"/>
      <g class="cast">
        <path d="${d}" fill="#000" opacity="${st.cast}" filter="url(#rc-b6)"/>
        <path d="${d}" fill="${c.core}" opacity="${st.cast * 1.2}" filter="url(#rc-b4)"/>
      </g>
    </g>
    ${lamp ? `<path class="halo-l" d="${d}" transform="translate(-3 -1)" fill="#ffb862" filter="url(#rc-b4)"/>
      <path class="halo-r" d="${d}" transform="translate(3 -1)" fill="#ffb862" filter="url(#rc-b4)"/>` : ""}
    <path d="${d}" fill="${c.base}" fill-opacity="${st.tint}"/>
    <g clip-path="url(#${id}-clip)">
      <rect width="${w}" height="${h}" fill="url(#${id}-core)" opacity="${st.core}"/>
      <path d="${d}" fill="none" stroke="${c.core}" stroke-width="${st.bezel * 1.4}" opacity="${st.edgeTint}" filter="url(#rc-b4)"/>
      <path d="${d}" fill="none" stroke="#fff" stroke-width="16" opacity="${st.milky}" filter="url(#rc-b6)"/>
      <rect width="${w}" height="${h}" filter="url(#rc-frost)" opacity="${st.frost}"/>
      <rect width="${w}" height="${h}" fill="url(#${id}-sheen)"/>
      ${weathering}
      ${lamp ? `<rect class="glow-l" width="${w}" height="${h}" fill="url(#${id}-glowL)"/>
        <rect class="glow-r" width="${w}" height="${h}" fill="url(#${id}-glowR)"/>
        <rect class="glow-t" width="${w}" height="${h}" fill="url(#${id}-glowT)"/>` : ""}
      <path d="${d}" fill="none" stroke="url(#${id}-bevel)" stroke-width="${st.bevel * 2}"/>
      <image href="${rim}" x="${-rimPad}" y="${-rimPad}" width="${w + rimPad * 2}" height="${h + rimPad * 2}" opacity="${st.rim}" preserveAspectRatio="none"/>
    </g>
    <path d="${d}" fill="none" stroke="${c.core}" stroke-opacity="${st.outline}" stroke-width=".8"/>`;
}

/** Shared SVG filters referenced by every piece. */
export const SHARED_DEFS = `
  <svg class="defs" aria-hidden="true" color-interpolation-filters="sRGB">
    <filter id="rc-frost" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves="2" seed="3" result="fine"/>
      <feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="2" seed="11" result="coarse"/>
      <feColorMatrix in="fine" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.8 -.62" result="speck"/>
      <feColorMatrix in="coarse" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.4 -.75" result="patch"/>
      <feComposite in="speck" in2="patch" operator="arithmetic" k1=".9" k2=".3" k3="0" k4="0" result="pits"/>
      <feComponentTransfer in="patch" result="haze"><feFuncA type="linear" slope=".28"/></feComponentTransfer>
      <feMerge><feMergeNode in="haze"/><feMergeNode in="pits"/></feMerge>
    </filter>
    <filter id="rc-b2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
    <filter id="rc-b4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="rc-b6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  </svg>`;
