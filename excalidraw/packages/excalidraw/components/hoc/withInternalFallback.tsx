import React, { useLayoutEffect } from "react";

import { useTunnels } from "../../context/tunnels";
import { atom } from "../../editor-jotai";

export const withInternalFallback = <P,>(
  componentName: string,
  Component: React.FC<P>,
) => {
  const renderAtom = atom(0);

  const WrapperComponent: React.FC<
    P & {
      __fallback?: boolean;
    }
  > = (props) => {
    const {
      tunnelsJotai: { useAtom },
    } = useTunnels();
    const [counter, setCounter] = useAtom(renderAtom);

    useLayoutEffect(() => {
      setCounter((current) => current + 1);
      return () => {
        setCounter((current) => Math.max(0, current - 1));
      };
    }, [setCounter]);

    // The atom is scoped to the current Excalidraw instance by its tunnel
    // store. Read its live value so a fallback that mounted first is removed
    // when a host component arrives later (for example through React.lazy).
    if (counter > 1 && props.__fallback) {
      return null;
    }

    return <Component {...props} />;
  };

  WrapperComponent.displayName = componentName;

  return WrapperComponent;
};
