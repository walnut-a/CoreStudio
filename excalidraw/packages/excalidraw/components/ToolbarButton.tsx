import { useTunnels } from "../context/tunnels";

import { ToolButton } from "./ToolButton";

import type { JSX, MouseEvent } from "react";

type ToolbarButtonProps = {
  icon?: JSX.Element;
  "aria-label": string;
  title?: string;
  selected?: boolean;
  "data-testid"?: string;
  onClick?: (event: MouseEvent) => void;
};

export const ToolbarButton = ({
  icon,
  "aria-label": ariaLabel,
  title,
  selected = false,
  "data-testid": dataTestId,
  onClick,
}: ToolbarButtonProps) => {
  const { ToolbarToolsTunnel } = useTunnels();

  return (
    <ToolbarToolsTunnel.In>
      <ToolButton
        className="Shape"
        type="button"
        icon={icon}
        title={title ?? ariaLabel}
        aria-label={ariaLabel}
        selected={selected}
        data-testid={dataTestId}
        onClick={onClick}
      />
    </ToolbarToolsTunnel.In>
  );
};

ToolbarButton.displayName = "ToolbarButton";
