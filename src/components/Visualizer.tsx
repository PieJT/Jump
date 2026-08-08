import { useEffect, useRef } from "react";

interface VisualizerProps {
  trackId: string;
  currentTime: number;
  isPlaying: boolean;
  /** Number of bars around the ring. */
  barCount?: number;
}

// Deterministic hash so each track gets a stable-but-different "personality"
// (bar phase offsets / speeds) without needing real audio data.
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return h;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Visualizer({ trackId, currentTime, isPlaying, barCount = 48 }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  // Per-bar seeded randomness, regenerated only when the track changes.
  const seedsRef = useRef<{ phase: number; speed: number; weight: number }[]>([]);
  useEffect(() => {
    const rand = mulberry32(hashString(trackId));
    seedsRef.current = Array.from({ length: barCount }, () => ({
      phase: rand() * Math.PI * 2,
      speed: 1.4 + rand() * 2.2,
      weight: 0.55 + rand() * 0.45,
    }));
  }, [trackId, barCount]);

  // Smoothly-animated amplitude envelope so pausing eases the bars down
  // rather than snapping them flat.
  const envelopeRef = useRef(0);
  // currentTime drives the phase directly (so it's always seek-accurate);
  // this ref just lets the animation keep ticking smoothly between the
  // sparser progress updates coming from the player.
  const displayTimeRef = useRef(currentTime);
  useEffect(() => {
    displayTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastFrameTs = performance.now();

    const draw = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastFrameTs) / 1000);
      lastFrameTs = ts;

      if (isPlaying) displayTimeRef.current += dt;

      const targetEnvelope = isPlaying ? 1 : 0;
      envelopeRef.current += (targetEnvelope - envelopeRef.current) * Math.min(1, dt * 4);

      const dpr = window.devicePixelRatio || 1;
      const size = canvas.clientWidth;
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const innerRadius = size * 0.42;
      const maxBarLength = size * 0.1;

      const rootStyle = getComputedStyle(document.documentElement);
      const glow = rootStyle.getPropertyValue("--glow-1").trim() || "120,170,255";

      const t = displayTimeRef.current;
      const seeds = seedsRef.current;
      const envelope = envelopeRef.current;

      for (let i = 0; i < barCount; i++) {
        const seed = seeds[i] ?? { phase: 0, speed: 2, weight: 0.7 };
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;

        // Layered sine waves for a less mechanical, less "single sine wave"
        // feel — combines a slow envelope-ish wave with a faster ripple.
        const wave =
          0.55 * Math.sin(t * seed.speed + seed.phase) +
          0.3 * Math.sin(t * seed.speed * 2.3 + seed.phase * 1.7) +
          0.15 * Math.sin(t * seed.speed * 0.6 + seed.phase * 0.4);

        const amplitude = Math.max(0.06, (wave * 0.5 + 0.5) * seed.weight) * envelope;
        const barLength = maxBarLength * amplitude;

        const x1 = cx + Math.cos(angle) * innerRadius;
        const y1 = cy + Math.sin(angle) * innerRadius;
        const x2 = cx + Math.cos(angle) * (innerRadius + barLength);
        const y2 = cy + Math.sin(angle) * (innerRadius + barLength);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(2, (size / barCount) * 0.35);
        ctx.strokeStyle = `rgba(${glow}, ${0.25 + amplitude * 0.65})`;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, barCount]);

  return <canvas ref={canvasRef} className="npf-visualizer" aria-hidden="true" />;
}