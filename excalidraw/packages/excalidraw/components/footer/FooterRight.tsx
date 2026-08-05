import { useTunnels } from "../../context/tunnels";

const FooterRight = ({ children }: { children?: React.ReactNode }) => {
  const { FooterRightTunnel } = useTunnels();

  return <FooterRightTunnel.In>{children}</FooterRightTunnel.In>;
};

export default FooterRight;
FooterRight.displayName = "FooterRight";
