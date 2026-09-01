import { createContext, useContext, useState, type ReactNode } from "react";

import { DesktopButton } from "./DesktopButton";
import { useModalFocus } from "./useModalFocus";
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
  updateAvailable?: boolean;
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
  updateAvailable = false,
  onCategoryChange,
  onDiscardChanges,
  onClose,
  generalContent,
  imageGenerationContent,
  codexIntegrationContent,
  aboutContent,
}: ApplicationSettingsDialogProps) => {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const dialogRef = useModalFocus<HTMLDivElement>({
    open,
    onEscape: () => {
      if (dirty) {
        setPendingAction(() => onClose);
      } else {
        onClose();
      }
    },
  });
  const confirmDialogRef = useModalFocus<HTMLElement>({
    open: Boolean(pendingAction),
    onEscape: () => setPendingAction(null),
  });

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
  const activeTabId = `app-settings-tab-${activeCategory}`;
  const activePanelId = `app-settings-panel-${activeCategory}`;

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const { key } = event;
    if (
      key !== "ArrowLeft" &&
      key !== "ArrowRight" &&
      key !== "Home" &&
      key !== "End"
    ) {
      return;
    }
    event.preventDefault();
    const targetIndex =
      key === "Home"
        ? 0
        : key === "End"
        ? settingsNavItems.length - 1
        : (currentIndex +
            (key === "ArrowRight" ? 1 : -1) +
            settingsNavItems.length) %
          settingsNavItems.length;
    const target = settingsNavItems[targetIndex]!;
    document.getElementById(`app-settings-tab-${target.id}`)?.focus();
    if (target.id !== activeCategory) {
      requestAction(() => onCategoryChange(target.id));
    }
  };

  return (
    <div className="dialog-backdrop app-settings-backdrop">
      <div
        ref={dialogRef}
        className="dialog-card dialog-card--application-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-title"
        data-corestudio-modal="true"
        tabIndex={-1}
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
            {settingsNavItems.map((item, index) => (
              <button
                key={item.id}
                id={`app-settings-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={activeCategory === item.id}
                aria-controls={`app-settings-panel-${item.id}`}
                tabIndex={activeCategory === item.id ? 0 : -1}
                className="app-settings-nav__item"
                aria-label={
                  item.id === "about" && updateAvailable
                    ? `${item.label}，${copy.applicationSettings.aboutPage.update.indicator}`
                    : item.label
                }
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                onClick={() => {
                  if (activeCategory !== item.id) {
                    requestAction(() => onCategoryChange(item.id));
                  }
                }}
              >
                <span>{item.label}</span>
                {item.id === "about" && updateAvailable ? (
                  <span
                    className="settings-update-indicator"
                    data-testid="application-settings-update-indicator"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            ))}
          </nav>
          <main
            id={activePanelId}
            className="app-settings-content"
            role="tabpanel"
            aria-labelledby={activeTabId}
            tabIndex={-1}
          >
            <ApplicationSettingsLeaveContext.Provider value={requestAction}>
              {content}
            </ApplicationSettingsLeaveContext.Provider>
          </main>
        </div>

        {pendingAction ? (
          <div className="app-settings-confirm-backdrop">
            <section
              ref={confirmDialogRef}
              className="app-settings-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="app-settings-discard-title"
              data-corestudio-modal="true"
              tabIndex={-1}
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
