import { isAgentHost } from "../src/shared/agentBridgeTypes";
import type { AgentIntegrationInstallResult } from "../src/shared/desktopBridgeTypes";
import { getAgentSessionDirectory } from "./agent/sessionPaths";
import { installAgentIntegration } from "./agentIntegrationService";

export const runIntegrationSetup = async (
  hosts: string[],
  context: { homeDir: string; resourcesPath: string; appVersion: string },
  install = installAgentIntegration,
) => {
  const results: (AgentIntegrationInstallResult & { host: string })[] = [];
  if (!hosts.length || hosts.some((host) => !isAgentHost(host))) {
    return {
      ok: false,
      error:
        "请指定宿主：codex、cursor、claude-code、workbuddy、qwenwork、doubaowork。",
      results,
    };
  }
  for (const host of [...new Set(hosts)]) {
    if (!isAgentHost(host)) continue;
    const result = await install({
      ...context,
      host,
      settingsDirectory: getAgentSessionDirectory({
        platform: "darwin",
        homeDir: context.homeDir,
      }),
    });
    results.push({ host, ...result });
    if (!result.ok) return { ok: false, results };
  }
  return { ok: true, results };
};
