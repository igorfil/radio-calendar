/** Canvas-backed rim light: brightest where the edge faces the light (top-left) or its reflection (bottom-right). */
const LIGHT = { x: -0.6, y: -0.8 };

export function rimLightImage(path: string, width: number, height: number, blurPx: number): string {
  const W = Math.max(1, Math.ceil(width));
  const H = Math.max(1, Math.ceil(height));
  const mask = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const mctx = mask.getContext("2d");
  const blurred = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const bctx = blurred.getContext("2d", { willReadFrequently: true });
  if (!mctx || !bctx) return "";
  mctx.fillStyle = "#fff";
  mctx.fill(new Path2D(path));
  bctx.filter = `blur(${blurPx}px)`;
  bctx.drawImage(mask, 0, 0);
  const src = bctx.getImageData(0, 0, W, H).data;
  const alpha = (x: number, y: number) =>
    src[(Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))) * 4 + 3] ?? 0;
  const grads = Array.from({ length: W * H }, (_, i) => {
    const x = i % W, y = (i / W) | 0;
    return [alpha(x + 1, y) - alpha(x - 1, y), alpha(x, y + 1) - alpha(x, y - 1)] as const;
  });
  const max = grads.reduce((m, [gx, gy]) => Math.max(m, Math.hypot(gx, gy)), 1);
  const out = bctx.createImageData(W, H);
  grads.forEach(([gx, gy], i) => {
    const mag = Math.hypot(gx, gy);
    const facing = mag ? Math.abs((-gx * LIGHT.x - gy * LIGHT.y) / mag) : 0;
    const a = Math.pow(mag / max, 1.3) * (0.18 + 0.82 * Math.pow(facing, 2.2));
    out.data.set([255, 255, 255, Math.round(a * 255)], i * 4);
  });
  bctx.putImageData(out, 0, 0);
  return blurred.toDataURL();
}
