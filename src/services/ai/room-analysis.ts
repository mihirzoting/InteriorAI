import type { DetectedColor, ObjectDetector, RoomAnalysis, RoomAnalyzer } from "./types";

const NAMED: { name: string; rgb: [number, number, number] }[] = [
  { name: "white", rgb: [240, 238, 234] },
  { name: "cream", rgb: [232, 220, 196] },
  { name: "beige", rgb: [200, 180, 150] },
  { name: "natural", rgb: [184, 148, 104] },
  { name: "brown", rgb: [110, 72, 45] },
  { name: "terracotta", rgb: [180, 90, 60] },
  { name: "red", rgb: [160, 40, 40] },
  { name: "pink", rgb: [214, 160, 160] },
  { name: "gold", rgb: [196, 160, 70] },
  { name: "green", rgb: [70, 110, 70] },
  { name: "blue", rgb: [70, 100, 150] },
  { name: "grey", rgb: [140, 140, 140] },
  { name: "black", rgb: [30, 30, 30] },
];

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export function nameColor(r: number, g: number, b: number): string {
  let best = NAMED[0]!;
  let bestD = Infinity;
  for (const c of NAMED) {
    const d = (c.rgb[0] - r) ** 2 * 0.3 + (c.rgb[1] - g) ** 2 * 0.59 + (c.rgb[2] - b) ** 2 * 0.11;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.name;
}

async function loadPixels(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 160 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, width: bitmap.width, height: bitmap.height };
}

/** k-means over sampled pixels → dominant palette. */
function kmeans(pixels: number[][], k: number): { c: number[]; n: number }[] {
  let centers = Array.from({ length: k }, (_, i) => pixels[Math.floor((i / k) * pixels.length)]!.slice());
  let counts: number[] = [];
  for (let iter = 0; iter < 10; iter++) {
    const sums = centers.map(() => [0, 0, 0]);
    counts = centers.map(() => 0);
    for (const p of pixels) {
      let bi = 0;
      let bd = Infinity;
      centers.forEach((c, i) => {
        const d = (c[0]! - p[0]!) ** 2 + (c[1]! - p[1]!) ** 2 + (c[2]! - p[2]!) ** 2;
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      const s = sums[bi]!;
      s[0] = s[0]! + p[0]!;
      s[1] = s[1]! + p[1]!;
      s[2] = s[2]! + p[2]!;
      counts[bi] = counts[bi]! + 1;
    }
    centers = centers.map((c, i) => (counts[i] ? sums[i]!.map((s) => s / counts[i]!) : c));
  }
  return centers.map((c, i) => ({ c, n: counts[i] ?? 0 })).filter((x) => x.n > 0);
}

/** Pixel-statistics analyzer: real measurements of the uploaded photo, computed in the browser. */
export class PixelRoomAnalyzer implements RoomAnalyzer {
  readonly id = "pixel-statistics-v1";
  constructor(private detector: ObjectDetector | null = null) {}

  async analyze(image: Blob): Promise<RoomAnalysis> {
    const { data, width, height } = await loadPixels(image);
    const pixels: number[][] = [];
    let lum = 0, lumSq = 0, warm = 0, sat = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
      pixels.push([r, g, b]);
      const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      lum += l;
      lumSq += l * l;
      warm += (r - b) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      sat += max === 0 ? 0 : (max - min) / max;
      n++;
    }
    const brightness = lum / n;
    const contrast = Math.min(1, Math.sqrt(Math.max(0, lumSq / n - brightness ** 2)) * 3);
    const warmth = Math.max(-1, Math.min(1, (warm / n) * 4));
    const saturation = sat / n;

    const clusters = kmeans(pixels, 6).sort((a, b) => b.n - a.n);
    const palette: DetectedColor[] = clusters.map(({ c, n: cnt }) => ({
      hex: toHex(c[0]!, c[1]!, c[2]!),
      name: nameColor(c[0]!, c[1]!, c[2]!),
      share: cnt / pixels.length,
    }));

    const objects = this.detector ? await this.detector.detect(image) : [];
    const ratio = width / height;
    return {
      version: 1,
      analyzedAt: new Date().toISOString(),
      width,
      height,
      orientation: ratio > 1.1 ? "landscape" : ratio < 0.9 ? "portrait" : "square",
      palette,
      brightness,
      warmth,
      saturation,
      contrast,
      lighting: brightness < 0.35 ? "dim" : brightness > 0.65 ? "bright" : "balanced",
      tone: warmth > 0.12 ? "warm" : warmth < -0.05 ? "cool" : "neutral",
      objects,
      providers: { colors: this.id, objects: this.detector?.id ?? null, embeddings: null },
    };
  }
}

/** Swap in an external detector here when one is connected. */
export const roomAnalyzer: RoomAnalyzer = new PixelRoomAnalyzer(null);
