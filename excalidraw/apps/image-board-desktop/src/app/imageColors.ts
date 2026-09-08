/** Small, renderer-only sRGB utilities. No original-sized pixel buffers. */
const rgbToHex = (rgb: number[]) =>
  `#${rgb
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

export const extractPalette = (pixels: Uint8ClampedArray): string[] => {
  // 4-bit channels keep the histogram bounded to 4096 bins (128 KiB).
  const bins = new Float64Array(4096 * 4);
  const occupied: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const weight = pixels[i + 3] / 255;
    if (weight < 0.05) continue;
    const offset =
      ((pixels[i] >> 4) * 256 +
        (pixels[i + 1] >> 4) * 16 +
        (pixels[i + 2] >> 4)) *
      4;
    if (bins[offset + 3] === 0) occupied.push(offset);
    bins[offset] += pixels[i] * weight;
    bins[offset + 1] += pixels[i + 1] * weight;
    bins[offset + 2] += pixels[i + 2] * weight;
    bins[offset + 3] += weight;
  }
  const selected: number[][] = [];
  occupied.sort((a, b) => bins[b + 3] - bins[a + 3]);
  for (const offset of occupied) {
    const rgb = [0, 1, 2].map((channel) =>
      Math.round(bins[offset + channel] / bins[offset + 3]),
    );
    // Suppress near-duplicate shades without inventing colors to fill six slots.
    if (
      selected.some(
        (color) =>
          color.reduce(
            (sum, value, channel) => sum + (value - rgb[channel]) ** 2,
            0,
          ) <
          48 ** 2,
      )
    )
      continue;
    selected.push(rgb);
    if (selected.length === 6) break;
  }
  return selected.map(rgbToHex);
};

const context = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", {
    colorSpace: "srgb",
    willReadFrequently: true,
  });
  if (!ctx) throw new Error("Canvas unavailable");
  return ctx;
};

const palettes = new WeakMap<HTMLImageElement, string[]>();
export const readImagePalette = (image: HTMLImageElement): string[] => {
  const cached = palettes.get(image);
  if (cached) return cached;
  const scale = Math.min(
    1,
    128 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = context(width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const palette = extractPalette(ctx.getImageData(0, 0, width, height).data);
  palettes.set(image, palette);
  return palette;
};
