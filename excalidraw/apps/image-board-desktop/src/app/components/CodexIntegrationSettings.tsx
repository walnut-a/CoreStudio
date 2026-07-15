import { useState } from "react";

import type { CodexIntegrationStatus } from "../../shared/desktopBridgeTypes";
import { copy } from "../copy";
import { useCodexIntegrationStatus } from "../useCodexIntegrationStatus";
import { DesktopButton } from "./DesktopButton";

export interface CodexIntegrationSettingsProps {
  open: boolean;
  inspect: () => Promise<CodexIntegrationStatus>;
  copyText: (text: string) => Promise<boolean | void>;
}

export const CODEX_INSTALL_PROMPT = ({
  appVersion,
  guideUrl,
}: Pick<CodexIntegrationStatus, "appVersion" | "guideUrl">) =>
  copy.applicationSettings.codexPage.installPrompt(appVersion, guideUrl);

export const CodexIntegrationSettings = ({
  open,
  inspect,
  copyText,
}: CodexIntegrationSettingsProps) => {
  const { status, loading, error, refresh } = useCodexIntegrationStatus({
    open,
    inspect,
  });
  const [copied, setCopied] = useState<"install" | "prompt" | null>(null);
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
                {copy.applicationSettings.codexPage.handToCodex}
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
            <div className="settings-agent-prompt">
              <p>{installPrompt}</p>
            </div>
            <DesktopButton
              type="button"
              size="small"
              variant={status.state === "ready" ? "default" : "primary"}
              onClick={async () => {
                await copyText(installPrompt);
                setCopied("install");
              }}
            >
              {copied === "install"
                ? copy.applicationSettings.codexPage.copied
                : copy.applicationSettings.codexPage.copyToCodex}
            </DesktopButton>
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
              {status.checks.map((check) => (
                <div className="settings-check-row" key={check.id}>
                  <span
                    className={`settings-check-row__icon settings-check-row__icon--${check.status}`}
                    aria-hidden="true"
                  >
                    {check.status === "ready" ? "✓" : "!"}
                  </span>
                  <span>
                    <strong>{check.label}</strong>
                    <small>{check.detail}</small>
                  </span>
                  <em>
                    {
                      copy.applicationSettings.codexPage.checkStatus[
                        check.status
                      ]
                    }
                  </em>
                </div>
              ))}
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
