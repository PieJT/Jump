import type { SVGProps } from "react";

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function QueueIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M3 6h11M3 12h11M3 18h6" />
      <path d="M17 8v10l4-3.2v-3.6z" />
    </svg>
  );
}

export function WorkerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3-3.5 3.5zM2 22l3.5-3.5" />
    </svg>
  );
}

export function AccountIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6" strokeLinecap="round" />
    </svg>
  );
}

export function PrevIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
  );
}

export function NextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16 6h2v12h-2zM6 6v12l8.5-6z" />
    </svg>
  );
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}

export function LibraryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M4 4v16M4 4l7 2v14l-7-2z" />
      <path d="M14 6h6M14 11h6M14 16h4" strokeLinecap="round" />
    </svg>
  );
}

export function HeartIcon({ filled, ...props }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <path d="M12 20.5s-7.5-4.6-10-9.3C.4 8 1.7 4.5 5 3.4c2-.7 4.1 0 5.5 1.8L12 6.8l1.5-1.6c1.4-1.8 3.5-2.5 5.5-1.8 3.3 1.1 4.6 4.6 3 7.8-2.5 4.7-10 9.3-10 9.3z" />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function MoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

export function BackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} {...props}>
      <path d="M4 12.5 9.2 18 20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayNextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M3 6h18M3 12h13M3 18h9M18 11l4 4-4 4M22 15h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AddToQueueIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M3 6h18M3 12h13M3 18h9M16 18h6M19 15v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShuffleIcon({ active, ...props }: SVGProps<SVGSVGElement> & { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "var(--accent)" : "currentColor"}
      strokeWidth={2}
      {...props}
    >
      <path d="M16 3h5v5M4 20l7-7m5 7h5v-5M4 4l16 16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RepeatIcon({ mode, ...props }: SVGProps<SVGSVGElement> & { mode?: "none" | "one" | "all" }) {
  const isActive = mode !== "none";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={isActive ? "var(--accent)" : "currentColor"}
      strokeWidth={2}
      {...props}
      style={{ position: "relative", ...props.style }}
    >
      <path d="M17 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
      {mode === "one" && (
        <text
          x="12"
          y="15"
          fontSize="8"
          fontWeight="bold"
          fill="var(--accent)"
          textAnchor="middle"
          stroke="none"
        >
          1
        </text>
      )}
    </svg>
  );
}

export function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}