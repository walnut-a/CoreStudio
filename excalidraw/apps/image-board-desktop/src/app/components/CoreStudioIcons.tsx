import type { ReactNode } from "react";

export const CORE_STUDIO_ICON_STROKE_WIDTH = 1.25;

interface LineIconProps {
  children: ReactNode;
  className?: string;
  size?: number;
}

export const LineIcon = ({
  children,
  className,
  size = 24,
}: LineIconProps) => (
  <svg
    aria-hidden="true"
    focusable="false"
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={CORE_STUDIO_ICON_STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const leftDockIcon = (
  <LineIcon>
    <path d="M6.25 5.75h11.5a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H6.25a1.5 1.5 0 0 1-1.5-1.5v-9.5a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M9.25 5.75v12.5" />
  </LineIcon>
);

export const rightDockIcon = (
  <LineIcon>
    <path d="M6.25 5.75h11.5a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H6.25a1.5 1.5 0 0 1-1.5-1.5v-9.5a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M14.75 5.75v12.5" />
  </LineIcon>
);

export const closeIcon = (
  <LineIcon size={18}>
    <path d="M7.5 7.5 16.5 16.5" />
    <path d="M16.5 7.5 7.5 16.5" />
  </LineIcon>
);

export const generateImageIcon = (
  <LineIcon>
    <path d="M6.25 18.25h11.5a1.5 1.5 0 0 0 1.5-1.5v-7.5a1.5 1.5 0 0 0-1.5-1.5H6.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5Z" />
    <path d="m7.75 15.75 3-3 2.25 2.25 1.25-1.25 2 2" />
    <path d="M14.75 4.75 16 7.25l2.5 1.25L16 9.75l-1.25 2.5-1.25-2.5L11 8.5l2.5-1.25 1.25-2.5Z" />
  </LineIcon>
);

export const agentBridgeIcon = (
  <LineIcon>
    <path d="M8.25 4.75v5" />
    <path d="M15.75 4.75v5" />
    <path d="M6.25 9.75h11.5v2.5a5.75 5.75 0 0 1-11.5 0v-2.5Z" />
    <path d="M12 18v1.25" />
  </LineIcon>
);

export const projectFolderIcon = (
  <LineIcon>
    <path d="M4.75 7.25a1.5 1.5 0 0 1 1.5-1.5h4l1.5 2h6a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H6.25a1.5 1.5 0 0 1-1.5-1.5v-9.5Z" />
    <path d="M4.75 9.75h14.5" />
  </LineIcon>
);

export const recentProjectIcon = (
  <LineIcon>
    <path d="M19.25 12a7.25 7.25 0 1 1-2.12-5.13" />
    <path d="M19.25 5.75v4h-4" />
    <path d="M12 8.25v4l2.5 1.5" />
  </LineIcon>
);

export const revealProjectIcon = (
  <LineIcon>
    <path d="M4.75 8.25a1.5 1.5 0 0 1 1.5-1.5h3.75l1.35 1.75h6.4a1.5 1.5 0 0 1 1.5 1.5v1.25" />
    <path d="M5.25 17.75 7 10.75h12l-1.75 7H5.25Z" />
  </LineIcon>
);

export const copyLinkIcon = (
  <LineIcon>
    <path d="M9.75 8.75 8.5 10a3 3 0 0 0 4.25 4.25l1.25-1.25" />
    <path d="m14.25 15.25 1.25-1.25A3 3 0 0 0 11.25 9.75L10 11" />
    <path d="M8.25 18.25h-1.5a2 2 0 0 1-2-2v-9.5a2 2 0 0 1 2-2h9.5a2 2 0 0 1 2 2v1.5" />
  </LineIcon>
);

export const removeReferenceIcon = (
  <LineIcon size={12}>
    <path d="M7.5 7.5 16.5 16.5" />
    <path d="M16.5 7.5 7.5 16.5" />
  </LineIcon>
);

export const settingsSlidersIcon = (
  <LineIcon>
    <path d="M5 7.5h5.25" />
    <path d="M13.75 7.5H19" />
    <path d="M12 5.75v3.5" />
    <path d="M5 16.5h8.25" />
    <path d="M16.75 16.5H19" />
    <path d="M15 14.75v3.5" />
  </LineIcon>
);

export const promptLibraryIcon = (
  <LineIcon>
    <path d="M7.25 5.25h8.5a1.5 1.5 0 0 1 1.5 1.5v12l-5.25-2.5-5.25 2.5v-12a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M9.5 8.5h5" />
    <path d="M9.5 11.25h4" />
  </LineIcon>
);

export const sendIcon = (
  <LineIcon>
    <path d="M5 11.75 18.25 5.5a.7.7 0 0 1 .95.82l-3.85 12.9a.7.7 0 0 1-1.26.18l-3.05-4.65-4.98-1.72a.7.7 0 0 1-.06-1.28Z" />
    <path d="m11.05 14.7 3.7-3.7" />
  </LineIcon>
);

export const stopIcon = (
  <LineIcon>
    <path d="M8.25 8.25h7.5v7.5h-7.5Z" />
  </LineIcon>
);

export const chevronDownIcon = (className?: string) => (
  <LineIcon className={className} size={18}>
    <path d="m7.25 9 4.75 4.75L16.75 9" />
  </LineIcon>
);
