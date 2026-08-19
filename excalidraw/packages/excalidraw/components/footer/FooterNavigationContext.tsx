import { createContext, useContext } from "react";

export interface FooterNavigationControls {
  zoomControlsExpanded: boolean;
  setZoomControlsExpanded: (expanded: boolean) => void;
}

interface FooterNavigationContextValue extends FooterNavigationControls {
  setCompactZoomControlsEnabled: (enabled: boolean) => void;
}

export const FooterNavigationContext =
  createContext<FooterNavigationContextValue | null>(null);

export const useFooterNavigationControls = () => {
  const controls = useContext(FooterNavigationContext);
  if (!controls) {
    throw new Error(
      "FooterNavigation must be rendered inside the Excalidraw footer",
    );
  }
  return controls;
};
