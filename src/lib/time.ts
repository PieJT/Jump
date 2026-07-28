export function formatTime(seconds: number): string {
  const s = Math.floor(seconds || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
