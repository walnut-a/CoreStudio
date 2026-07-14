import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { DesktopButton } from "./DesktopButton";
import "./ApplicationSettingsDialog.css";

export type ApplicationSettingsCategory =
  | "image-generation"
  | "codex-integration"
  | "experimental";

export interface ApplicationSettingsDialogProps {
  open: boolean;
  activeCategory: ApplicationSettingsCategory;
  dirty: boolean;
  onCategoryChange: (category: ApplicationSettingsCategory) => void;
  onDiscardChanges: () => void;
  onClose: () => void;
  imageGenerationContent: ReactNode;
  codexIntegrationContent: ReactNode;
  experimentalContent: ReactNode;
}

const SETTINGS_NAV_ITEMS: readonly {
  id: ApplicationSettingsCategory;
  label: string;
}[] = [
  { id: "image-generation", label: "图像生成" },
  { id: "codex-integration", label: "Codex 集成" },
  { id: "experimental", label: "实验性功能" },
];

const ApplicationSettingsLeaveContext = createContext<(action: () => void) => void>(
  (action) => action(),
);

export const useApplicationSettingsLeave = () =>
  useContext(ApplicationSettingsLeaveContext);

export const ApplicationSettingsDialog = ({
  open,
  activeCategory,
  dirty,
  onCategoryChange,
  onDiscardChanges,
  onClose,
  imageGenerationContent,
  codexIntegrationContent,
  experimentalContent,
}: ApplicationSettingsDialogProps) => {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!open) {
      setPendingAction(null);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      if (pendingAction) {
        setPendingAction(null);
      } else if (dirty) {
        setPendingAction(() => onClose);
      } else {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dirty, onClose, open, pendingAction]);

  if (!open) {
    return null;
  }

  const requestAction = (action: () => void) => {
    if (dirty) {
      setPendingAction(() => action);
      return;
    }
    action();
  };

  const content =
    activeCategory === "image-generation"
      ? imageGenerationContent
      : activeCategory === "codex-integration"
        ? codexIntegrationContent
        : experimentalContent;

  return (
    <div className="dialog-backdrop app-settings-backdrop">
      <div
        className="dialog-card dialog-card--application-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-title"
      >
        <header className="app-settings-header">
          <div>
            <span className="dialog-card__eyebrow">设置</span>
            <h2 id="app-settings-title">应用设置</h2>
          </div>
          <DesktopButton
            type="button"
            className="dialog-card__close"
            onClick={() => requestAction(onClose)}
          >
            关闭
          </DesktopButton>
        </header>

        <div className="app-settings-layout">
          <nav className="app-settings-nav" role="tablist" aria-label="设置分类">
            {SETTINGS_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === item.id}
                className="app-settings-nav__item"
                onClick={() => {
                  if (activeCategory !== item.id) {
                    requestAction(() => onCategoryChange(item.id));
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <main className="app-settings-content">
            <ApplicationSettingsLeaveContext.Provider value={requestAction}>
              {content}
            </ApplicationSettingsLeaveContext.Provider>
          </main>
        </div>

        {pendingAction ? (
          <div className="app-settings-confirm-backdrop">
            <section
              className="app-settings-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="app-settings-discard-title"
            >
              <h3 id="app-settings-discard-title">放弃未保存的修改？</h3>
              <p>当前页面的修改还没有保存。</p>
              <div className="app-settings-confirm__actions">
                <DesktopButton type="button" onClick={() => setPendingAction(null)}>
                  继续编辑
                </DesktopButton>
                <DesktopButton
                  type="button"
                  variant="primary"
                  onClick={() => {
                    const action = pendingAction;
                    setPendingAction(null);
                    onDiscardChanges();
                    action();
                  }}
                >
                  放弃修改
                </DesktopButton>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
};
