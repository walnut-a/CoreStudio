import type { ButtonHTMLAttributes, ReactNode } from "react";

interface DesktopButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  variant?: "default" | "primary";
}

export const DesktopButton = ({
  children,
  className,
  type = "button",
  variant = "default",
  ...rest
}: DesktopButtonProps) => {
  const classes = [
    "excalidraw-button",
    "image-board-button",
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
