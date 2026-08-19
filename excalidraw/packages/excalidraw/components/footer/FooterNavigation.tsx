import { useTunnels } from "../../context/tunnels";
import type { ExcalidrawImperativeAPI } from "../../types";
import { useExcalidrawAPI } from "../App";

type FooterNavigationChildren =
  | React.ReactNode
  | ((api: ExcalidrawImperativeAPI | null) => React.ReactNode);

const FooterNavigationContent = ({
  children,
}: {
  children?: FooterNavigationChildren;
}) => {
  const api = useExcalidrawAPI();
  return typeof children === "function" ? children(api) : children;
};

const FooterNavigation = ({
  children,
}: {
  children?: FooterNavigationChildren;
}) => {
  const { FooterNavigationTunnel } = useTunnels();

  return (
    <FooterNavigationTunnel.In>
      <FooterNavigationContent>{children}</FooterNavigationContent>
    </FooterNavigationTunnel.In>
  );
};

export default FooterNavigation;
FooterNavigation.displayName = "FooterNavigation";
