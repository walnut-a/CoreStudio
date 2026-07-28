import { useEffect, useState } from "react";

import type { DesktopAppInfo } from "../../shared/desktopBridgeTypes";
import { maybeGetDesktopBridge } from "../desktopBridge";

import "./RuntimeIdentityBadge.css";

interface RuntimeIdentityBadgeProps {
  loadAppInfo?: () => Promise<
    Pick<DesktopAppInfo, "name" | "version"> & {
      runtimeIdentity?: Pick<
        NonNullable<DesktopAppInfo["runtimeIdentity"]>,
        "instanceKind" | "runtimeLabel" | "buildId"
      >;
    }
  >;
}

export const RuntimeIdentityBadge = ({
  loadAppInfo,
}: RuntimeIdentityBadgeProps) => {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const loader =
      loadAppInfo ?? maybeGetDesktopBridge()?.loadAppInfo?.bind(null);
    if (!loader) {
      return;
    }
    void loader()
      .then((appInfo) => {
        const identity = appInfo.runtimeIdentity;
        if (disposed) {
          return;
        }
        const showBadge =
          identity &&
          identity.instanceKind !== "production" &&
          identity.instanceKind !== "qa";
        setLabel(
          showBadge ? `${identity.runtimeLabel} · ${identity.buildId}` : null,
        );
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, [loadAppInfo]);

  return label ? (
    <div
      className="runtime-identity-badge"
      data-testid="runtime-identity-badge"
    >
      {label}
    </div>
  ) : null;
};
