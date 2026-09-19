// Inline stroke icons from the design reference. All are decorative
// (aria-hidden); the controls that use them carry their own text or label.

type IconProps = { className?: string };

const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function MarkIcon({ className }: IconProps) {
  return (
    <svg {...stroke} strokeWidth={2} className={className}>
      <rect x="3" y="4" width="18" height="7" rx="1.5" />
      <path d="M3 15h10" />
      <path d="M3 19h6" />
      <path d="m18 15 3 3-3 3" />
    </svg>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg {...stroke} strokeWidth={1.7} className={className}>
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...stroke} strokeWidth={2.2} className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function FrameIcon({ className }: IconProps) {
  return (
    <svg {...stroke} strokeWidth={2} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg {...stroke} strokeWidth={1.9} className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...stroke} strokeWidth={2.4} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...stroke} strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.2v.3" />
    </svg>
  );
}

export function CodeIcon({ className }: IconProps) {
  return (
    <svg {...stroke} strokeWidth={1.8} className={className}>
      <path d="m8 8-4 4 4 4" />
      <path d="m16 8 4 4-4 4" />
      <path d="m13.5 5-3 14" />
    </svg>
  );
}

export function GitHubIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}
