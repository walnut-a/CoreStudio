import clsx from "clsx";

import { useTunnels } from "../context/tunnels";

import { IconButton } from "./IconButton";

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
      <IconButton
        className={clsx("Shape", {
          "ToolIcon_type_toggle ToolIcon--checked": selected,
        })}
        type="button"
        icon={icon}
        title={title ?? ariaLabel}
        aria-label={ariaLabel}
        data-testid={dataTestId}
        onClick={onClick}
      />
    </ToolbarToolsTunnel.In>
  );
};

ToolbarButton.displayName = "ToolbarButton";
