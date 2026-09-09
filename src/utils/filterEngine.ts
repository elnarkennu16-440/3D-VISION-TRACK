import { FilterType } from '../types';

export const FILTER_LIST: { id: FilterType; label: string; description: string }[] = [
  { id: 'dual-tone', label: 'DUAL-TONE', description: 'Cyberpunk cyan & hot pink gradient map' },
  { id: 'thermal', label: 'THERMAL', description: 'Infrared heat map (Blue to Yellow to Red)' },
  { id: 'sketch', label: 'SKETCH', description: 'Inverted pencil sketch drawing' },
  { id: 'pixelate', label: 'PIXELATE', description: '8-bit retro mosaic pixelation' },
  { id: 'glitch', label: 'GLITCH', description: 'RGB chromatic shift & CRT scanlines' },
  { id: 'invert', label: 'INVERT', description: 'Negative color inversion' },
  { id: 'red-channel', label: 'RED-CHANNEL', description: 'Night-vision crimson matrix' },
  { id: 'edge', label: 'EDGE', description: 'Glowing neon edge detection on dark canvas' },
  { id: 'blur', label: 'BLUR', description: 'Frosted glass Gaussian blur' },
  { id: 'cartoon', label: 'CARTOON', description: 'Quantized posterized colors with ink lines' },
  { id: 'rainbow-wave', label: 'RAINBOW-WAVE', description: 'Psychedelic animated spectrum wave' },
  { id: 'normal', label: 'NORMAL', description: 'Original camera pass-through' },
];

/**
 * Applies a visual filter to an ImageData object directly on an HTML5 canvas.
 */
export function applyFilterToImageData(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filterName: FilterType,
  tick: number = 0
) {
  if (filterName === 'normal') return;

  if (filterName === 'blur') {
    // Fast Canvas blur
    ctx.filter = 'blur(10px)';
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = 'none';
    return;
  }

  if (filterName === 'pixelate') {
    const pixelSize = 14;
    const tempCanvas = document.createElement('canvas');
    const smallW = Math.max(1, Math.floor(width / pixelSize));
    const smallH = Math.max(1, Math.floor(height / pixelSize));
    tempCanvas.width = smallW;
    tempCanvas.height = smallH;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(ctx.canvas, 0, 0, smallW, smallH);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    return;
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  if (filterName === 'invert') {
    for (let i = 0; i < len; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
  } else if (filterName === 'red-channel') {
    for (let i = 0; i < len; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = Math.min(255, lum * 1.5 + 20); // High red
      data[i + 1] = lum * 0.15;
      data[i + 2] = lum * 0.2;
    }
  } else if (filterName === 'sketch') {
    // Pencil sketch algorithm: grayscale -> invert -> contrast division
    for (let i = 0; i < len; i += 4) {
      const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
      // High contrast edge sketch
      const val = lum < 110 ? Math.max(0, lum - 35) : Math.min(255, lum + 60);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  } else if (filterName === 'thermal') {
    // Thermal JET colormap
    for (let i = 0; i < len; i += 4) {
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      let r = 0, g = 0, b = 0;

      if (lum < 0.25) {
        b = Math.floor(255 * (lum / 0.25));
      } else if (lum < 0.5) {
        b = 255;
        g = Math.floor(255 * ((lum - 0.25) / 0.25));
      } else if (lum < 0.75) {
        r = Math.floor(255 * ((lum - 0.5) / 0.25));
        g = 255;
        b = Math.floor(255 * (1 - (lum - 0.5) / 0.25));
      } else {
        r = 255;
        g = Math.floor(255 * (1 - (lum - 0.75) / 0.25));
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  } else if (filterName === 'dual-tone') {
    // Cyan (#00E5FF) to Hot Pink (#FF1493)
    for (let i = 0; i < len; i += 4) {
      const t = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      // Color1: (0, 229, 255) | Color2: (255, 20, 147)
      data[i] = Math.floor(t * 0 + (1 - t) * 255);
      data[i + 1] = Math.floor(t * 229 + (1 - t) * 20);
      data[i + 2] = Math.floor(t * 255 + (1 - t) * 147);
    }
  } else if (filterName === 'cartoon') {
    // Posterized 4-level color quantization + outline threshold
    for (let i = 0; i < len; i += 4) {
      data[i] = Math.floor(data[i] / 64) * 64 + 32;
      data[i + 1] = Math.floor(data[i + 1] / 64) * 64 + 32;
      data[i + 2] = Math.floor(data[i + 2] / 64) * 64 + 32;
    }
  } else if (filterName === 'rainbow-wave') {
    // Dynamic animated spectrum cycle
    const shift = (tick * 4) % 360;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const hue = (x * 0.4 + y * 0.4 + shift) % 360;
        const [r, g, b] = hslToRgb(hue / 360, 0.9, 0.5);
        data[idx] = Math.floor(data[idx] * 0.35 + r * 0.65);
        data[idx + 1] = Math.floor(data[idx + 1] * 0.35 + g * 0.65);
        data[idx + 2] = Math.floor(data[idx + 2] * 0.35 + b * 0.65);
      }
    }
  } else if (filterName === 'glitch') {
    // Chromatic split offset + scanline darkening
    const offset = Math.floor(Math.sin(tick * 0.2) * 12) + 8;
    for (let y = 0; y < height; y++) {
      const isScanline = y % 4 === 0;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const offsetIdx = (y * width + Math.min(width - 1, x + offset)) * 4;
        // Shift blue from right
        data[idx + 2] = data[offsetIdx + 2];
        if (isScanline) {
          data[idx] = Math.max(0, data[idx] - 30);
          data[idx + 1] = Math.max(0, data[idx + 1] - 30);
          data[idx + 2] = Math.max(0, data[idx + 2] - 30);
        }
      }
    }
  } else if (filterName === 'edge') {
    // Glowing neon cyan / gold edge filter
    const copy = new Uint8ClampedArray(data);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const left = (y * width + (x - 1)) * 4;
        const right = (y * width + (x + 1)) * 4;
        const up = ((y - 1) * width + x) * 4;
        const down = ((y + 1) * width + x) * 4;

        const lumC = 0.299 * copy[idx] + 0.587 * copy[idx + 1] + 0.114 * copy[idx + 2];
        const lumL = 0.299 * copy[left] + 0.587 * copy[left + 1] + 0.114 * copy[left + 2];
        const lumR = 0.299 * copy[right] + 0.587 * copy[right + 1] + 0.114 * copy[right + 2];
        const lumU = 0.299 * copy[up] + 0.587 * copy[up + 1] + 0.114 * copy[up + 2];
        const lumD = 0.299 * copy[down] + 0.587 * copy[down + 1] + 0.114 * copy[down + 2];

        const diff = Math.abs(lumR - lumL) + Math.abs(lumD - lumU);
        if (diff > 45) {
          data[idx] = 80;
          data[idx + 1] = 240;
          data[idx + 2] = 255;
        } else {
          data[idx] = 12;
          data[idx + 1] = 12;
          data[idx + 2] = 18;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue2rgb(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
