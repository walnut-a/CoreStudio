export interface ProjectViewHandleBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CreateProjectViewHandleLifecycleInput {
  isHostDestroyed(): boolean;
  isContentsDestroyed(): boolean;
  attachView(): void;
  detachView(): void;
  setVisible(visible: boolean): void;
  focusContents(): void;
  setBounds(bounds: ProjectViewHandleBounds): void;
  closeContents(): void;
}

export const createProjectViewHandleLifecycle = ({
  isHostDestroyed,
  isContentsDestroyed,
  attachView,
  detachView,
  setVisible,
  focusContents,
  setBounds: applyBounds,
  closeContents,
}: CreateProjectViewHandleLifecycleInput) => {
  let attached = false;
  let destroyed = false;

  const attach = () => {
    if (
      attached ||
      destroyed ||
      isHostDestroyed() ||
      isContentsDestroyed()
    ) {
      return;
    }
    attachView();
    attached = true;
    setVisible(true);
  };

  const detach = () => {
    if (destroyed) {
      return;
    }
    if (attached && !isHostDestroyed()) {
      detachView();
    }
    attached = false;
    if (!isContentsDestroyed()) {
      setVisible(false);
    }
  };

  const focus = () => {
    if (!destroyed && !isContentsDestroyed()) {
      focusContents();
    }
  };

  const setBounds = (bounds: ProjectViewHandleBounds) => {
    if (
      !destroyed &&
      !isHostDestroyed() &&
      !isContentsDestroyed()
    ) {
      applyBounds(bounds);
    }
  };

  const destroy = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    if (attached && !isHostDestroyed()) {
      detachView();
    }
    attached = false;
    if (!isContentsDestroyed()) {
      closeContents();
    }
  };

  return {
    attach,
    detach,
    focus,
    setBounds,
    destroy,
  };
};
