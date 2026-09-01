import type { DesktopAppInfo } from "../../shared/desktopBridgeTypes";
import type {
  DesktopAppUpdateAvailability,
  DesktopAppUpdateInfo,
  DesktopAppUpdateManualState,
} from "../../shared/appUpdate";
import type { OpenSourceDependency } from "../aboutMetadata";
import { copy, DESKTOP_LANG_CODE } from "../copy";
import { DesktopButton } from "./DesktopButton";

export interface AboutSettingsSectionProps {
  appInfo: DesktopAppInfo | null;
  repositoryUrl: string;
  dependencies: readonly OpenSourceDependency[];
  updateAvailability?: DesktopAppUpdateAvailability | null;
  manualUpdateState?: DesktopAppUpdateManualState;
  onCheckForUpdates?: () => void;
  onOpenExternal: (url: string) => void;
}

export const AboutSettingsSection = ({
  appInfo,
  repositoryUrl,
  dependencies,
  updateAvailability = null,
  manualUpdateState = { status: "idle" },
  onCheckForUpdates,
  onOpenExternal,
}: AboutSettingsSectionProps) => {
  const updateCopy = copy.applicationSettings.aboutPage.update;
  const checking = manualUpdateState.status === "checking";
  const hasUnreviewedUpdate = Boolean(updateAvailability?.hasUnreviewedUpdate);
  const checkLabel = checking ? updateCopy.checking : updateCopy.check;
  const checkAccessibleLabel = hasUnreviewedUpdate
    ? `${checkLabel}，${updateCopy.indicator}`
    : checkLabel;
  const getSummary = (info: DesktopAppUpdateInfo) =>
    info.summary[DESKTOP_LANG_CODE] ?? info.summary.en ?? [];

  return (
    <section className="settings-page settings-about-page">
      <header className="settings-page__header">
        <div>
          <h3>{copy.applicationSettings.about}</h3>
          <p>{copy.about.description}</p>
        </div>
      </header>

      <dl className="settings-about-summary">
        <div>
          <dt>{copy.applicationSettings.aboutPage.version}</dt>
          <dd>{appInfo?.version ?? copy.about.versionUnknown}</dd>
        </div>
        <div>
          <dt>{copy.applicationSettings.aboutPage.repository}</dt>
          <dd>
            <button
              type="button"
              className="settings-about-link"
              onClick={() => onOpenExternal(repositoryUrl)}
            >
              {repositoryUrl}
            </button>
          </dd>
        </div>
      </dl>

      {onCheckForUpdates ? (
        <section
          className="settings-about-update"
          aria-labelledby="app-update-title"
        >
          <div className="settings-about-update__header">
            <div>
              <h4 id="app-update-title">{updateCopy.title}</h4>
              <p>{updateCopy.description}</p>
            </div>
            <DesktopButton
              type="button"
              size="small"
              disabled={checking}
              aria-label={checkAccessibleLabel}
              onClick={onCheckForUpdates}
            >
              <span>{checkLabel}</span>
              {hasUnreviewedUpdate ? (
                <span
                  className="settings-update-indicator"
                  aria-hidden="true"
                />
              ) : null}
            </DesktopButton>
          </div>

          {manualUpdateState.status === "complete" ? (
            <div className="settings-about-update__result" aria-live="polite">
              {manualUpdateState.result.status === "up-to-date" ? (
                <strong>{updateCopy.upToDate}</strong>
              ) : (
                <>
                  <strong>
                    {manualUpdateState.result.status === "update-available"
                      ? updateCopy.availableTitle(
                          manualUpdateState.result.update.version,
                        )
                      : updateCopy.incompatibleTitle(
                          manualUpdateState.result.update.version,
                        )}
                  </strong>
                  <p>
                    {manualUpdateState.result.status === "update-available"
                      ? updateCopy.availableDescription(
                          appInfo?.version ??
                            manualUpdateState.result.availability
                              .currentVersion,
                        )
                      : updateCopy.incompatibleDescription(
                          manualUpdateState.result.update.minimumSystemVersion,
                        )}
                  </p>
                  {getSummary(manualUpdateState.result.update).length ? (
                    <ul>
                      {getSummary(manualUpdateState.result.update).map(
                        (item) => (
                          <li key={item}>{item}</li>
                        ),
                      )}
                    </ul>
                  ) : null}
                  <div className="settings-about-update__actions">
                    {manualUpdateState.result.status === "update-available" ? (
                      <DesktopButton
                        type="button"
                        size="small"
                        variant="primary"
                        onClick={() =>
                          onOpenExternal(
                            manualUpdateState.result.update.downloadPageURL,
                          )
                        }
                      >
                        {updateCopy.openDownload}
                      </DesktopButton>
                    ) : null}
                    <button
                      type="button"
                      className="settings-about-link"
                      onClick={() =>
                        onOpenExternal(
                          manualUpdateState.result.update.releaseNotesURL,
                        )
                      }
                    >
                      {updateCopy.viewNotes}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : manualUpdateState.status === "failure" ? (
            <div
              className="settings-about-update__result settings-about-update__result--error"
              role="alert"
            >
              <strong>{updateCopy.failureTitle}</strong>
              <p>{updateCopy.failureDescription}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="settings-about-dependencies">
        <div className="settings-list-header">
          <div>
            <h4>{copy.applicationSettings.aboutPage.dependencies}</h4>
            <p>{copy.applicationSettings.aboutPage.dependenciesDescription}</p>
          </div>
        </div>
        <dl className="settings-about-dependency-list">
          {dependencies.map((dependency) => (
            <div key={dependency.name}>
              <dt>{dependency.name}</dt>
              <dd>{dependency.version}</dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
};
