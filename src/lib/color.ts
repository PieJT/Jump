export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Loads a thumbnail and averages a small down-sampled canvas to get a
 * representative "ambient" color. Resolves to null if the image can't
 * be read (e.g. tainted canvas from CORS) rather than throwing.
 */
export function extractDominantColor(url: string): Promise<RGB | null> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        resolve({
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count),
        });
      } catch {
        // Canvas tainted by CORS — ambient stays at its default.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
