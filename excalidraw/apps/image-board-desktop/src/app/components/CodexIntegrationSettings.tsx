import { useState } from "react";

import type {
  CodexIntegrationCheck,
  CodexIntegrationInstallResult,
  CodexIntegrationStatus,
} from "../../shared/desktopBridgeTypes";
import { copy } from "../copy";
import { useCodexIntegrationStatus } from "../useCodexIntegrationStatus";
import { DesktopButton } from "./DesktopButton";

export interface CodexIntegrationSettingsProps {
  open: boolean;
  inspect: () => Promise<CodexIntegrationStatus>;
  install: () => Promise<CodexIntegrationInstallResult>;
  copyText: (text: string) => Promise<boolean | void>;
}

export const CODEX_INSTALL_PROMPT = ({
  appVersion,
  guideUrl,
}: Pick<CodexIntegrationStatus, "appVersion" | "guideUrl">) =>
  copy.applicationSettings.codexPage.installPrompt(appVersion, guideUrl);

const getCheckPresentation = (
  check: CodexIntegrationCheck,
  integrationVersion: string,
) => {
  const { checkDetail, checkLabel } = copy.applicationSettings.codexPage;

  if (check.id === "cli") {
    const executablePath = check.executablePath ?? "corestudio";
    return {
      label: checkLabel.cli,
      detail:
        check.status === "ready"
          ? checkDetail.cliReady(executablePath)
          : checkDetail.cliMissing(executablePath),
    };
  }

  if (check.id === "skill") {
    return {
      label: checkLabel.skill,
      detail:
        check.status === "ready"
          ? checkDetail.skillReady
          : checkDetail.skillMissing,
    };
  }

  const detail =
    check.status === "ready"
      ? checkDetail.compatibilityReady(
          check.installedIntegrationVersion ?? integrationVersion,
        )
      : check.status === "outdated"
      ? checkDetail.compatibilityOutdated(
          check.installedIntegrationVersion ?? checkDetail.unknownVersion,
          integrationVersion,
        )
      : check.status === "broken"
      ? checkDetail.compatibilityBroken
      : checkDetail.compatibilityMissing;

  return {
    label: checkLabel.compatibility,
    detail,
  };
};

export const CodexIntegrationSettings = ({
  open,
  inspect,
  install,
  copyText,
}: CodexIntegrationSettingsProps) => {
  const { status, loading, error, refresh } = useCodexIntegrationStatus({
    open,
    inspect,
  });
  const [copied, setCopied] = useState<"install" | "prompt" | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const installPrompt = status ? CODEX_INSTALL_PROMPT(status) : "";

  return (
    <section className="settings-page settings-codex-page">
      <header className="settings-page__header">
        <div>
          <h3>{copy.applicationSettings.codexIntegration}</h3>
          <p>{copy.applicationSettings.codexPage.description}</p>
        </div>
        <DesktopButton
          type="button"
          size="small"
          disabled={loading}
          onClick={() => void refresh()}
        >
          {copy.applicationSettings.codexPage.refresh}
        </DesktopButton>
      </header>

      {loading && !status ? (
        <div className="settings-detection-loading">
          {copy.applicationSettings.codexPage.loading}
        </div>
      ) : error ? (
        <section className="settings-callout settings-callout--error">
          <strong>{copy.applicationSettings.codexPage.detectionFailed}</strong>
          <p>{error}</p>
        </section>
      ) : status ? (
        <>
          <section className="settings-install-card">
            <div>
              <span className="settings-section-label">
                {copy.applicationSettings.codexPage.installOnDevice}
              </span>
              <h4>
                {copy.applicationSettings.codexPage.stateTitle[status.state]}
              </h4>
              <p>
                {status.state === "ready"
                  ? copy.applicationSettings.codexPage.readyDescription
                  : copy.applicationSettings.codexPage.actionDescription}
              </p>
            </div>
            {installError ? (
              <section className="settings-callout settings-callout--error">
                <strong>
                  {copy.applicationSettings.codexPage.installFailed}
                </strong>
                <p>{installError}</p>
              </section>
            ) : null}
            <div className="settings-install-actions">
              <DesktopButton
                type="button"
                size="small"
                variant={status.state === "ready" ? "default" : "primary"}
                disabled={installing}
                onClick={async () => {
                  setInstalling(true);
                  setInstallError(null);
                  try {
                    const result = await install();
                    if (!result.ok) {
                      setInstallError(result.details || result.error);
                      return;
                    }
                    await refresh();
                  } catch (nextError) {
                    setInstallError(
                      nextError instanceof Error
                        ? nextError.message
                        : copy.applicationSettings.codexPage.installFailed,
                    );
                  } finally {
                    setInstalling(false);
                  }
                }}
              >
                {installing
                  ? copy.applicationSettings.codexPage.installing
                  : copy.applicationSettings.codexPage.installAction[
                      status.state
                    ]}
              </DesktopButton>
              <DesktopButton
                type="button"
                size="small"
                onClick={async () => {
                  await copyText(installPrompt);
                  setCopied("install");
                }}
              >
                {copied === "install"
                  ? copy.applicationSettings.codexPage.copied
                  : copy.applicationSettings.codexPage.copyToCodex}
              </DesktopButton>
            </div>
            <div className="settings-agent-prompt">
              <span className="settings-section-label">
                {copy.applicationSettings.codexPage.repairWithCodex}
              </span>
              <p>{installPrompt}</p>
            </div>
          </section>

          <section>
            <div className="settings-list-header">
              <div>
                <h4>{copy.applicationSettings.codexPage.environmentChecks}</h4>
                <p>
                  {
                    copy.applicationSettings.codexPage
                      .environmentChecksDescription
                  }
                </p>
              </div>
            </div>
            <div className="settings-check-list">
              {status.checks.map((check) => {
                const presentation = getCheckPresentation(
                  check,
                  status.integrationVersion,
                );
                return (
                  <div className="settings-check-row" key={check.id}>
                    <span
                      className={`settings-check-row__icon settings-check-row__icon--${check.status}`}
                      aria-hidden="true"
                    >
                      {check.status === "ready" ? "✓" : "!"}
                    </span>
                    <span>
                      <strong>{presentation.label}</strong>
                      <small>{presentation.detail}</small>
                    </span>
                    <em>
                      {
                        copy.applicationSettings.codexPage.checkStatus[
                          check.status
                        ]
                      }
                    </em>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      <section className="settings-start-card">
        <div>
          <span className="settings-section-label">
            {copy.applicationSettings.codexPage.startInCodex}
          </span>
          <h4>{copy.applicationSettings.codexPage.openCurrentProject}</h4>
          <p>{copy.applicationSettings.codexPage.startDescription}</p>
        </div>
        <DesktopButton
          type="button"
          size="small"
          onClick={async () => {
            await copyText(
              copy.applicationSettings.codexPage.openCurrentProject,
            );
            setCopied("prompt");
          }}
        >
          {copied === "prompt"
            ? copy.applicationSettings.codexPage.copied
            : copy.applicationSettings.codexPage.copyInstructions}
        </DesktopButton>
      </section>
    </section>
  );
};
