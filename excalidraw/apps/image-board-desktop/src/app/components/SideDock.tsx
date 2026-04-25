import type { ReactNode } from "react";

import { closeIcon, leftDockIcon, rightDockIcon } from "./CoreStudioIcons";

interface SideDockProps {
  side: "left" | "right";
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

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
              {closeIcon}
            </button>
          </header>
          <div className="side-dock__body">{children}</div>
        </div>
      )}
    </section>
  );
};
