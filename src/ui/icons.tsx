import type { ReactNode, SVGProps } from 'react';

type IconProps = { size?: number; filled?: boolean } & Omit<SVGProps<SVGSVGElement>, 'ref'>;

function make(paths: (filled: boolean) => ReactNode) {
  return function Icon({ size = 24, filled = false, ...rest }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        {...rest}
      >
        {paths(filled)}
      </svg>
    );
  };
}

export const IconHome = make((f) => (
  <path d="M3.5 10.8 12 3.6l8.5 7.2V19a1.6 1.6 0 0 1-1.6 1.6H15v-5.8H9v5.8H5.1A1.6 1.6 0 0 1 3.5 19z" fill={f ? 'currentColor' : 'none'} />
));

export const IconFocus = make((f) => (
  <>
    <circle cx="12" cy="13.5" r="7.5" fill={f ? 'currentColor' : 'none'} />
    <path d="M12 13.5V9.8" stroke={f ? '#fff' : 'currentColor'} />
    <path d="M10 2.8h4M12 2.8v3.2M18.6 6.4l1.4-1.4" />
  </>
));

export const IconBook = make((f) => (
  <>
    <path d="M4.5 5.2A2.2 2.2 0 0 1 6.7 3H19v15.2H6.7a2.2 2.2 0 0 0-2.2 2.2z" fill={f ? 'currentColor' : 'none'} />
    <path d="M4.5 20.4V5.2M19 18.2V21H6.7" />
    {f && <path d="M9 7.5h6" stroke="#fff" />}
  </>
));

export const IconBag = make((f) => (
  <>
    <path d="M4.8 8.2h14.4l-1.1 11.3a1.6 1.6 0 0 1-1.6 1.5H7.5a1.6 1.6 0 0 1-1.6-1.5z" fill={f ? 'currentColor' : 'none'} />
    <path d="M8.8 10.5V6.8a3.2 3.2 0 0 1 6.4 0v3.7" />
  </>
));

export const IconPlus = make(() => <path d="M12 5v14M5 12h14" />);
export const IconClose = make(() => <path d="M6 6l12 12M18 6 6 18" />);
export const IconCheck = make(() => <path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IconUndo = make(() => (
  <>
    <path d="M9 7 4.5 11.5 9 16" />
    <path d="M5 11.5h9a5 5 0 0 1 0 10h-2" />
  </>
));
export const IconBrush = make(() => (
  <>
    <path d="M14.5 4.5 19.5 9.5 11 18l-5-5z" />
    <path d="M6 13c-2 0-3 1.5-3 3.5S2 20.5 2 20.5s3.5.5 5.5-1.5S9 16 9 16" />
  </>
));
export const IconMoon = make((f) => <path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z" fill={f ? 'currentColor' : 'none'} />);
export const IconSun = make(() => (
  <>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </>
));
export const IconSound = make((f) => (
  <>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill={f ? 'currentColor' : 'none'} />
    {f ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5M21 9.5l-5 5" />}
  </>
));
export const IconTrash = make(() => (
  <>
    <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13" />
  </>
));
export const IconRotate = make(() => (
  <>
    <rect x="3" y="8" width="12" height="13" rx="2.2" />
    <path d="M13 3.5a7.5 7.5 0 0 1 7.5 7.5M18.5 9l2 2 2-2" />
  </>
));
export const IconPause = make(() => <path d="M8.5 5.5v13M15.5 5.5v13" strokeWidth={3} />);
export const IconPlay = make(() => <path d="M8 5.2v13.6L19 12z" fill="currentColor" />);
export const IconStop = make(() => <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" />);
export const IconChevron = make(() => <path d="m9 5 7 7-7 7" />);
export const IconBox = make(() => (
  <>
    <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z" />
    <path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" />
  </>
));
export const IconSparkle = make((f) => (
  <path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5zM18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z" fill={f ? 'currentColor' : 'none'} />
));

/** コイン。色付きで描く */
export function Coin({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12.8" r="9.5" fill="#e48a12" />
      <circle cx="12" cy="11.6" r="9.5" fill="#ffc24b" />
      <circle cx="12" cy="11.6" r="6.6" fill="none" stroke="#f39a1d" strokeWidth="1.8" />
      <path d="M9.4 8.6c1.4-1.2 4-1 4.8.5" stroke="#fff3c9" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Star({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M12 2.8l2.7 5.9 6.4.7-4.8 4.3 1.4 6.3L12 16.8 6.3 20l1.4-6.3L2.9 9.4l6.4-.7z" fill="#8fa8ff" stroke="#5b78f0" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
