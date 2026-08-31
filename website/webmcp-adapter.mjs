import {
  CLI_TASK_IDS,
  LOCALES,
  SUPPORTED_HOSTS,
  TROUBLESHOOTING_IDS,
  getCliExample,
  getIntegrationGuide,
  getTroubleshootingGuide,
} from "./integrations-content.mjs?v=20260831-1";

const localizedMetadata = {
  en: {
    guideTitle: "CoreStudio integration guide",
    guideDescription:
      "Return read-only installation and first-use instructions for a supported local Agent host. This does not inspect or modify the user's Mac.",
    cliTitle: "CoreStudio CLI example",
    cliDescription:
      "Return one read-only CoreStudio CLI example with its runtime and safety requirements. This does not execute the command.",
    troubleshootTitle: "CoreStudio integration troubleshooting",
    troubleshootDescription:
      "Return curated recovery guidance for a known CoreStudio integration symptom. This does not diagnose or repair local state.",
  },
  "zh-CN": {
    guideTitle: "CoreStudio 集成指南",
    guideDescription:
      "返回受支持本地 Agent 宿主的只读安装与首次使用说明，不检测或修改用户的 Mac。",
    cliTitle: "CoreStudio CLI 示例",
    cliDescription:
      "返回一条 CoreStudio CLI 示例及其运行和安全前提，不执行命令。",
    troubleshootTitle: "CoreStudio 集成故障排查",
    troubleshootDescription:
      "针对已知 CoreStudio 集成现象返回受控恢复说明，不诊断或修复本机状态。",
  },
};

const schema = (properties, required) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const enumString = (values, description) => ({
  type: "string",
  enum: values,
  description,
});

export const createWebMcpToolDefinitions = (pageLocale = "en") => {
  const locale = LOCALES.includes(pageLocale) ? pageLocale : "en";
  const metadata = localizedMetadata[locale];
  const annotations = {
    readOnlyHint: true,
    untrustedContentHint: false,
  };

  return [
    {
      name: "get_corestudio_integration_guide",
      title: metadata.guideTitle,
      description: metadata.guideDescription,
      inputSchema: schema(
        {
          host: enumString(SUPPORTED_HOSTS, "Supported local Agent host."),
          locale: enumString(LOCALES, "Response language."),
          stage: enumString(
            ["overview", "install", "verify", "first-use"],
            "Guide stage to return."
          ),
        },
        ["host", "locale", "stage"]
      ),
      annotations,
      execute: async (input) => getIntegrationGuide(input),
    },
    {
      name: "get_corestudio_cli_example",
      title: metadata.cliTitle,
      description: metadata.cliDescription,
      inputSchema: schema(
        {
          task: enumString(CLI_TASK_IDS, "Supported CLI task."),
          host: enumString(SUPPORTED_HOSTS, "Supported local Agent host."),
          locale: enumString(LOCALES, "Response language."),
        },
        ["task", "host", "locale"]
      ),
      annotations,
      execute: async (input) => getCliExample(input),
    },
    {
      name: "troubleshoot_corestudio_integration",
      title: metadata.troubleshootTitle,
      description: metadata.troubleshootDescription,
      inputSchema: schema(
        {
          host: enumString(SUPPORTED_HOSTS, "Supported local Agent host."),
          symptom: enumString(
            TROUBLESHOOTING_IDS,
            "Known integration symptom to explain."
          ),
          locale: enumString(LOCALES, "Response language."),
        },
        ["host", "symptom", "locale"]
      ),
      annotations,
      execute: async (input) => getTroubleshootingGuide(input),
    },
  ];
};

export const registerCoreStudioWebMcpTools = async ({
  locale = "en",
  modelContext = globalThis.document?.modelContext,
} = {}) => {
  if (!modelContext?.registerTool) {
    return { supported: false, registered: [] };
  }

  const registered = [];
  for (const tool of createWebMcpToolDefinitions(locale)) {
    await modelContext.registerTool(tool);
    registered.push(tool.name);
  }

  return { supported: true, registered };
};

if (
  globalThis.document?.documentElement?.dataset.webmcp === "enabled" &&
  globalThis.document?.body
) {
  const locale = globalThis.document.body.dataset.locale ?? "en";
  registerCoreStudioWebMcpTools({ locale }).catch((error) => {
    console.warn("CoreStudio WebMCP tools could not be registered.", error);
  });
}
