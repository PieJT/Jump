const AURORA_HUES = ["--aurora-a", "--aurora-b", "--aurora-c", "--aurora-d", "--aurora-e"];
const ANGLES = [125, 140, 155, 110, 165];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Deterministic two-tone aurora gradient for a given seed string (e.g. a
 * playlist title or artist name). Same seed always produces the same
 * gradient, so tiles stay stable across renders without needing artwork.
 */
export function auroraGradient(seed: string): string {
  const h = hashStr(seed);
  const c1 = AURORA_HUES[h % AURORA_HUES.length];
  const c2 = AURORA_HUES[(h + 2) % AURORA_HUES.length]; // offset avoids picking the same hue twice
  const angle = ANGLES[h % ANGLES.length];
  return `linear-gradient(${angle}deg, var(${c1}), var(${c2}))`;
}