import { useCallback, useEffect, useState } from "react";

import type {
  DesktopAppUpdateAvailability,
  DesktopAppUpdateManualState,
} from "../shared/appUpdate";
import type { DesktopBridgeApi } from "../shared/desktopBridgeTypes";

export const useAppUpdate = (bridge: DesktopBridgeApi | null) => {
  const [availability, setAvailability] =
    useState<DesktopAppUpdateAvailability | null>(null);
  const [manualState, setManualState] = useState<DesktopAppUpdateManualState>({
    status: "idle",
  });

  useEffect(() => {
    let active = true;
    void bridge
      ?.loadAppUpdateAvailability?.()
      .then((nextAvailability) => {
        if (active) {
          setAvailability(nextAvailability);
        }
      })
      .catch(() => undefined);
    const unsubscribe = bridge?.onAppUpdateAvailabilityChanged?.(
      (nextAvailability) => {
        if (active) {
          setAvailability(nextAvailability);
        }
      },
    );
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [bridge]);

  const checkManually = useCallback(async () => {
    if (!bridge?.checkForAppUpdates) {
      setManualState({
        status: "failure",
        failure: { code: "unsupported" },
      });
      return;
    }
    setManualState({ status: "checking" });
    try {
      const response = await bridge.checkForAppUpdates();
      if (!response.ok) {
        setManualState({ status: "failure", failure: response.failure });
        return;
      }
      setAvailability(response.result.availability);
      setManualState({ status: "complete", result: response.result });
    } catch {
      setManualState({
        status: "failure",
        failure: { code: "unknown" },
      });
    }
  }, [bridge]);

  const resetTransientManualState = useCallback(() => {
    setManualState((current) =>
      current.status === "complete" &&
      (current.result.status === "update-available" ||
        current.result.status === "update-requires-newer-system")
        ? current
        : { status: "idle" },
    );
  }, []);

  return {
    availability,
    manualState,
    checkManually,
    resetTransientManualState,
  };
};
