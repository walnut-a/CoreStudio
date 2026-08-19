import { useLayoutEffect } from "react";

import { useTunnels } from "../../context/tunnels";
import type { ExcalidrawImperativeAPI } from "../../types";
import { useExcalidrawAPI } from "../App";
import {
  useFooterNavigationControls,
  type FooterNavigationControls,
} from "./FooterNavigationContext";

export type { FooterNavigationControls } from "./FooterNavigationContext";

type FooterNavigationChildren =
  | React.ReactNode
  | ((
      api: ExcalidrawImperativeAPI | null,
      controls: FooterNavigationControls,
    ) => React.ReactNode);

const FooterNavigationContent = ({
  children,
  collapseZoomControls,
}: {
  children?: FooterNavigationChildren;
  collapseZoomControls: boolean;
}) => {
  const api = useExcalidrawAPI();
  const controls = useFooterNavigationControls();
  const { setCompactZoomControlsEnabled, setZoomControlsExpanded } = controls;

  useLayoutEffect(() => {
    if (!collapseZoomControls) {
      return;
    }
    setCompactZoomControlsEnabled(true);
    return () => {
      setCompactZoomControlsEnabled(false);
      setZoomControlsExpanded(false);
    };
  }, [
    collapseZoomControls,
    setCompactZoomControlsEnabled,
    setZoomControlsExpanded,
  ]);

  return typeof children === "function" ? children(api, controls) : children;
};

const FooterNavigation = ({
  children,
  collapseZoomControls = false,
}: {
  children?: FooterNavigationChildren;
  collapseZoomControls?: boolean;
}) => {
  const { FooterNavigationTunnel, FooterZoomControlTunnel } = useTunnels();
  const NavigationTunnel = collapseZoomControls
    ? FooterZoomControlTunnel
    : FooterNavigationTunnel;

  return (
    <NavigationTunnel.In>
      <FooterNavigationContent collapseZoomControls={collapseZoomControls}>
        {children}
      </FooterNavigationContent>
    </NavigationTunnel.In>
  );
};

export default FooterNavigation;
FooterNavigation.displayName = "FooterNavigation";
