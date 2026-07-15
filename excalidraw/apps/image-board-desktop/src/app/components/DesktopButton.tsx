import type { ButtonHTMLAttributes, ReactNode } from "react";

import "./DesktopButton.css";

interface DesktopButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  size?: "small" | "medium";
  variant?: "default" | "primary";
}

export const DesktopButton = ({
  children,
  className,
  size = "medium",
  type = "button",
  variant = "default",
  ...rest
}: DesktopButtonProps) => {
  const classes = [
    "excalidraw-button",
    "image-board-button",
    size !== "medium" ? `image-board-button--${size}` : "",
    variant !== "default" ? `image-board-button--${variant}` : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button {...rest} type={type} className={classes}>
      {children}
    </button>
  );
};
