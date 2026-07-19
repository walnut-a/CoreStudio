import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { DesktopButton } from "./DesktopButton";
import { copy } from "../copy";
import "./ApplicationSettingsDialog.css";

export type ApplicationSettingsCategory =
  | "general"
  | "image-generation"
  | "codex-integration"
  | "about";

export interface ApplicationSettingsDialogProps {
  open: boolean;
  activeCategory: ApplicationSettingsCategory;
  dirty: boolean;
  onCategoryChange: (category: ApplicationSettingsCategory) => void;
  onDiscardChanges: () => void;
  onClose: () => void;
  generalContent: ReactNode;
  imageGenerationContent: ReactNode;
  codexIntegrationContent: ReactNode;
  aboutContent: ReactNode;
}

const ApplicationSettingsLeaveContext = createContext<
  (action: () => void) => void
>((action) => action());

export const useApplicationSettingsLeave = () =>
  useContext(ApplicationSettingsLeaveContext);

export const ApplicationSettingsDialog = ({
  open,
  activeCategory,
  dirty,
  onCategoryChange,
  onDiscardChanges,
  onClose,
  generalContent,
  imageGenerationContent,
  codexIntegrationContent,
  aboutContent,
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

  const settingsNavItems: readonly {
    id: ApplicationSettingsCategory;
    label: string;
  }[] = [
    { id: "general", label: copy.applicationSettings.general },
    {
      id: "image-generation",
      label: copy.applicationSettings.imageGeneration,
    },
    {
      id: "codex-integration",
      label: copy.applicationSettings.codexIntegration,
    },
    { id: "about", label: copy.applicationSettings.about },
  ];

  const content =
    activeCategory === "general"
      ? generalContent
      : activeCategory === "image-generation"
      ? imageGenerationContent
      : activeCategory === "codex-integration"
      ? codexIntegrationContent
      : aboutContent;

  return (
    <div className="dialog-backdrop app-settings-backdrop">
      <div
        className="dialog-card dialog-card--application-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-title"
      >
        <header className="app-settings-header">
          <h2 id="app-settings-title">{copy.applicationSettings.title}</h2>
          <DesktopButton
            type="button"
            size="small"
            className="dialog-card__close"
            onClick={() => requestAction(onClose)}
          >
            {copy.applicationSettings.close}
          </DesktopButton>
        </header>

        <div className="app-settings-layout">
          <nav
            className="app-settings-nav"
            role="tablist"
            aria-label={copy.applicationSettings.categoriesLabel}
          >
            {settingsNavItems.map((item) => (
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
              <h3 id="app-settings-discard-title">
                {copy.applicationSettings.discardTitle}
              </h3>
              <p>{copy.applicationSettings.discardDescription}</p>
              <div className="app-settings-confirm__actions">
                <DesktopButton
                  type="button"
                  onClick={() => setPendingAction(null)}
                >
                  {copy.applicationSettings.continueEditing}
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
                  {copy.applicationSettings.discardChanges}
                </DesktopButton>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
};
