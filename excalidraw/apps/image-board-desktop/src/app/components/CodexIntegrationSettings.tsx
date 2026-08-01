import { useCallback, useEffect, useState } from "react";

import { AGENT_HOST_LABELS } from "../../shared/agentIntegrationContract";
import type { AgentHost } from "../../shared/agentBridgeTypes";

import type {
  CodexIntegrationCheck,
  CodexIntegrationInstallResult,
  CodexIntegrationStatus,
  AgentIntegrationStatus,
  DesktopAgentBridgeStatus,
  DesktopAgentIntegrationSettings,
} from "../../shared/desktopBridgeTypes";
import { copy } from "../copy";
import { useCodexIntegrationStatus } from "../useCodexIntegrationStatus";
import { DesktopButton } from "./DesktopButton";

export interface CodexIntegrationSettingsProps {
  open: boolean;
  inspect: () => Promise<CodexIntegrationStatus>;
  install: () => Promise<CodexIntegrationInstallResult>;
  inspectAgentIntegration?: (
    host: AgentHost,
  ) => Promise<AgentIntegrationStatus>;
  installAgentIntegration?: (
    host: AgentHost,
  ) => Promise<CodexIntegrationInstallResult>;
  removeAgentIntegration?: (
    host: AgentHost,
  ) => Promise<CodexIntegrationInstallResult>;
  copyText: (text: string) => Promise<boolean | void>;
  loadAgentIntegrationSettings?: () => Promise<DesktopAgentIntegrationSettings>;
  setCodexImageGenerationEnabled?: (
    enabled: boolean,
  ) => Promise<DesktopAgentIntegrationSettings>;
  setAgentImageGenerationEnabled?: (
    host: AgentHost,
    enabled: boolean,
  ) => Promise<DesktopAgentIntegrationSettings>;
  providerConfigured?: boolean;
  agentBridgeEnabled?: boolean;
  loadAgentBridgeStatus?: () => Promise<DesktopAgentBridgeStatus>;
  onOpenImageIntegrations?: () => void;
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
  inspectAgentIntegration,
  installAgentIntegration,
  removeAgentIntegration,
  copyText,
  loadAgentIntegrationSettings,
  setCodexImageGenerationEnabled,
  setAgentImageGenerationEnabled,
  providerConfigured = false,
  agentBridgeEnabled = true,
  loadAgentBridgeStatus,
  onOpenImageIntegrations,
}: CodexIntegrationSettingsProps) => {
  const [activeHost, setActiveHost] = useState<AgentHost>("codex");
  const hostLabel = AGENT_HOST_LABELS[activeHost];
  const hostText = useCallback(
    (value: string) => value.replaceAll("Codex", hostLabel),
    [hostLabel],
  );
  const inspectCurrentHost = useCallback(
    () =>
      inspectAgentIntegration
        ? inspectAgentIntegration(activeHost)
        : activeHost === "codex"
        ? inspect()
        : Promise.reject(new Error(`${hostLabel} 集成检测暂不可用。`)),
    [activeHost, hostLabel, inspect, inspectAgentIntegration],
  );
  const { status, loading, error, refresh } = useCodexIntegrationStatus({
    open,
    inspect: inspectCurrentHost,
  });
  const [copied, setCopied] = useState<"install" | "prompt" | null>(null);
  const [integrationAction, setIntegrationAction] = useState<
    "install" | "remove" | null
  >(null);
  const [integrationError, setIntegrationError] = useState<{
    action: "install" | "remove";
    message: string;
  } | null>(null);
  const [imageGenerationAllowed, setImageGenerationAllowed] = useState(false);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [bridgeEnabled, setBridgeEnabled] = useState(agentBridgeEnabled);
  const installPrompt = status ? hostText(CODEX_INSTALL_PROMPT(status)) : "";

  useEffect(() => {
    if (!open || !loadAgentIntegrationSettings) {
      return;
    }
    let active = true;
    setPermissionError(null);
    void loadAgentIntegrationSettings()
      .then((settings) => {
        if (active) {
          setImageGenerationAllowed(
            settings[activeHost].allowImageGeneration === true,
          );
        }
      })
      .catch((error) => {
        if (active) {
          setPermissionError(
            error instanceof Error
              ? error.message
              : hostText(
                  copy.applicationSettings.codexPage
                    .imageGenerationPermissionSaveFailed,
                ),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [activeHost, hostText, loadAgentIntegrationSettings, open]);

  useEffect(() => {
    setCopied(null);
    setIntegrationError(null);
    setPermissionError(null);
  }, [activeHost]);

  useEffect(() => {
    if (!open || !loadAgentBridgeStatus) {
      setBridgeEnabled(agentBridgeEnabled);
      return;
    }
    let active = true;
    void loadAgentBridgeStatus()
      .then((bridgeStatus) => {
        if (active) {
          setBridgeEnabled(bridgeStatus.enabled);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [agentBridgeEnabled, loadAgentBridgeStatus, open]);

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

      <div className="settings-agent-host-selector" role="group">
        {(Object.keys(AGENT_HOST_LABELS) as AgentHost[]).map((host) => (
          <button
            key={host}
            type="button"
            className={`settings-agent-host-selector__item${
              activeHost === host
                ? " settings-agent-host-selector__item--active"
                : ""
            }`}
            aria-pressed={activeHost === host}
            onClick={() => setActiveHost(host)}
          >
            {AGENT_HOST_LABELS[host]}
          </button>
        ))}
      </div>

      {loading && !status ? (
        <div className="settings-detection-loading">
          {hostText(copy.applicationSettings.codexPage.loading)}
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
                {hostText(
                  copy.applicationSettings.codexPage.stateTitle[status.state],
                )}
              </h4>
              <p>
                {status.state === "ready"
                  ? copy.applicationSettings.codexPage.readyDescription
                  : copy.applicationSettings.codexPage.actionDescription}
              </p>
            </div>
            {integrationError ? (
              <section className="settings-callout settings-callout--error">
                <strong>
                  {hostText(
                    integrationError.action === "remove"
                      ? copy.applicationSettings.codexPage.removeFailed
                      : copy.applicationSettings.codexPage.installFailed,
                  )}
                </strong>
                <p>{integrationError.message}</p>
              </section>
            ) : null}
            <div className="settings-install-actions">
              <DesktopButton
                type="button"
                size="small"
                variant={status.state === "ready" ? "default" : "primary"}
                disabled={integrationAction !== null}
                onClick={async () => {
                  setIntegrationAction("install");
                  setIntegrationError(null);
                  try {
                    const result = installAgentIntegration
                      ? await installAgentIntegration(activeHost)
                      : activeHost === "codex"
                      ? await install()
                      : {
                          ok: false as const,
                          error: `${hostLabel} 集成安装暂不可用。`,
                          details: "",
                        };
                    if (!result.ok) {
                      setIntegrationError({
                        action: "install",
                        message: result.details || result.error,
                      });
                      return;
                    }
                    await refresh();
                  } catch (nextError) {
                    setIntegrationError({
                      action: "install",
                      message:
                        nextError instanceof Error
                          ? nextError.message
                          : hostText(
                              copy.applicationSettings.codexPage.installFailed,
                            ),
                    });
                  } finally {
                    setIntegrationAction(null);
                  }
                }}
              >
                {integrationAction === "install"
                  ? copy.applicationSettings.codexPage.installing
                  : hostText(
                      copy.applicationSettings.codexPage.installAction[
                        status.state
                      ],
                    )}
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
                  : hostText(copy.applicationSettings.codexPage.copyToCodex)}
              </DesktopButton>
              {"canRemove" in status &&
              status.canRemove &&
              removeAgentIntegration ? (
                <DesktopButton
                  type="button"
                  size="small"
                  disabled={integrationAction !== null}
                  onClick={async () => {
                    setIntegrationAction("remove");
                    setIntegrationError(null);
                    try {
                      const result = await removeAgentIntegration(activeHost);
                      if (!result.ok) {
                        setIntegrationError({
                          action: "remove",
                          message: result.details || result.error,
                        });
                        return;
                      }
                      await refresh();
                    } catch (nextError) {
                      setIntegrationError({
                        action: "remove",
                        message:
                          nextError instanceof Error
                            ? nextError.message
                            : hostText(
                                copy.applicationSettings.codexPage.removeFailed,
                              ),
                      });
                    } finally {
                      setIntegrationAction(null);
                    }
                  }}
                >
                  {integrationAction === "remove"
                    ? copy.applicationSettings.codexPage.removing
                    : hostText(
                        copy.applicationSettings.codexPage.removeAction,
                      )}
                </DesktopButton>
              ) : null}
            </div>
            {"canRemove" in status && status.canRemove ? (
              <p className="settings-inline-note">
                {copy.applicationSettings.codexPage.removeDescription}
              </p>
            ) : null}
            <div className="settings-agent-prompt">
              <span className="settings-section-label">
                {hostText(copy.applicationSettings.codexPage.repairWithCodex)}
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
                      <strong>{hostText(presentation.label)}</strong>
                      <small>{hostText(presentation.detail)}</small>
                      {check.id === "skill" && "skillPath" in status ? (
                        <small>{String(status.skillPath)}</small>
                      ) : null}
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

      <section>
        <div className="settings-list-header">
          <div>
            <h4>{copy.applicationSettings.codexPage.agentPermissions}</h4>
          </div>
        </div>
        <div className="app-settings-section">
          <div className="app-settings-section__copy">
            <span>
              {hostText(
                copy.applicationSettings.codexPage
                  .imageGenerationPermissionTitle,
              )}
            </span>
            <p>
              {copy.applicationSettings.codexPage.imageGenerationPermissionDescriptionForHost(
                hostLabel,
                activeHost === "codex",
              )}
            </p>
            {!providerConfigured ? (
              <p className="settings-inline-note">
                {
                  copy.applicationSettings.codexPage
                    .imageGenerationNotConfigured
                }{" "}
                {onOpenImageIntegrations ? (
                  <button
                    type="button"
                    className="settings-about-link"
                    onClick={onOpenImageIntegrations}
                  >
                    {copy.applicationSettings.codexPage.openImageIntegrations}
                  </button>
                ) : null}
              </p>
            ) : null}
            {!bridgeEnabled && imageGenerationAllowed ? (
              <p className="settings-inline-note">
                {
                  copy.applicationSettings.codexPage
                    .bridgeDisabledPermissionNote
                }
              </p>
            ) : null}
            {permissionError ? (
              <p className="settings-inline-error" role="alert">
                {permissionError}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            role="switch"
            className="app-settings-section__switch"
            aria-label={hostText(
              copy.applicationSettings.codexPage.imageGenerationPermissionLabel,
            )}
            aria-checked={imageGenerationAllowed}
            disabled={
              permissionSaving ||
              (!setAgentImageGenerationEnabled &&
                (activeHost !== "codex" || !setCodexImageGenerationEnabled))
            }
            onClick={() => {
              const savePermission = setAgentImageGenerationEnabled
                ? (enabled: boolean) =>
                    setAgentImageGenerationEnabled(activeHost, enabled)
                : activeHost === "codex" && setCodexImageGenerationEnabled
                ? setCodexImageGenerationEnabled
                : null;
              if (!savePermission) {
                return;
              }
              setPermissionSaving(true);
              setPermissionError(null);
              void savePermission(!imageGenerationAllowed)
                .then((settings) => {
                  setImageGenerationAllowed(
                    settings[activeHost].allowImageGeneration === true,
                  );
                })
                .catch((error) => {
                  setPermissionError(
                    error instanceof Error
                      ? error.message
                      : hostText(
                          copy.applicationSettings.codexPage
                            .imageGenerationPermissionSaveFailed,
                        ),
                  );
                })
                .finally(() => {
                  setPermissionSaving(false);
                });
            }}
          />
        </div>
      </section>

      <section className="settings-start-card">
        <div>
          <span className="settings-section-label">
            {hostText(copy.applicationSettings.codexPage.startInCodex)}
          </span>
          <h4>{copy.applicationSettings.codexPage.openCurrentProject}</h4>
          <p>{hostText(copy.applicationSettings.codexPage.startDescription)}</p>
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
