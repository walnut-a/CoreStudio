import type { ReactNode } from "react";

interface SideDockProps {
  side: "left" | "right";
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

const leftDockIcon = (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 5h16" />
    <path d="M4 12h10" />
    <path d="M4 19h16" />
    <path d="M17 9l3 3-3 3" />
  </svg>
);

const rightDockIcon = (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    <path d="M15 4v16" />
  </svg>
);

export const SideDock = ({
  side,
  title,
  open,
  onOpenChange,
  children,
}: SideDockProps) => {
  const closeLabel = `关闭${title}`;

  return (
    <section
      className={`side-dock side-dock--${side}`}
      data-testid={`side-dock-${side}`}
      data-open={open ? "true" : "false"}
      aria-label={title}
    >
      <button
        type="button"
        className="side-dock__toggle"
        aria-label={title}
        aria-pressed={open}
        onClick={() => onOpenChange(!open)}
      >
        {side === "left" ? leftDockIcon : rightDockIcon}
      </button>

      {open && (
        <div className="side-dock__panel">
          <header className="side-dock__header">
            <h2>{title}</h2>
            <button
              type="button"
              className="side-dock__close"
              aria-label={closeLabel}
              onClick={() => onOpenChange(false)}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </header>
          <div className="side-dock__body">{children}</div>
        </div>
      )}
    </section>
  );
};
