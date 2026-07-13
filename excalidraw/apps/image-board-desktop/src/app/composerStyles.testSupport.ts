import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const readCssFile = (filePath: string) =>
  readFileSync(resolve(process.cwd(), filePath), "utf8");

export const readAppCss = () =>
  [
    "apps/image-board-desktop/src/app/styles/designTokens.css",
    "apps/image-board-desktop/src/app/styles/dialogPrimitives.css",
    "apps/image-board-desktop/src/app/App.css",
    "apps/image-board-desktop/src/app/components/AboutDialog.css",
    "apps/image-board-desktop/src/app/components/AcpRunLogDialog.css",
    "apps/image-board-desktop/src/app/components/AgentBoard.css",
    "apps/image-board-desktop/src/app/components/AgentConversation.css",
    "apps/image-board-desktop/src/app/components/AgentRunChatLog.css",
    "apps/image-board-desktop/src/app/components/AgentSettings.css",
    "apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css",
    "apps/image-board-desktop/src/app/components/DesktopButton.css",
    "apps/image-board-desktop/src/app/components/GenerateImageDialog.css",
    "apps/image-board-desktop/src/app/components/GenerationErrorDetailsDialog.css",
    "apps/image-board-desktop/src/app/components/ImageInspector.css",
    "apps/image-board-desktop/src/app/components/ProjectDataReportDialog.css",
    "apps/image-board-desktop/src/app/components/ProjectMainMenu.css",
    "apps/image-board-desktop/src/app/components/ProjectRenderBoundary.css",
    "apps/image-board-desktop/src/app/components/ProjectStatusToast.css",
    "apps/image-board-desktop/src/app/components/SideDock.css",
    "apps/image-board-desktop/src/app/components/WelcomePane.css",
    "apps/image-board-desktop/src/app/components/WorkspaceBoundsOverlay.css",
  ]
    .map(readCssFile)
    .join("\n");

export const readRootAppCss = () =>
  readFileSync(
    resolve(process.cwd(), "apps/image-board-desktop/src/app/App.css"),
    "utf8",
  );

export const readDialogPrimitivesCss = () =>
  readCssFile("apps/image-board-desktop/src/app/styles/dialogPrimitives.css");

export const readGenerateImageDialog = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx",
    ),
    "utf8",
  );

export const readGenerateImageDialogRuntime = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateImageDialogRuntime.ts",
    ),
    "utf8",
  );

export const readGenerateImageDialogProviderRuntime = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateImageDialogProviderRuntime.ts",
    ),
    "utf8",
  );

export const readImageBoardApp = () =>
  readFileSync(
    resolve(process.cwd(), "apps/image-board-desktop/src/app/App.tsx"),
    "utf8",
  );

export const readGenerateComposerActionBar = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateComposerActionBar.tsx",
    ),
    "utf8",
  );

export const readAgentConversationThreadView = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/agent/agentConversationThreadView.ts",
    ),
    "utf8",
  );

export const readAgentConversationComposer = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AgentConversationComposer.tsx",
    ),
    "utf8",
  );

export const readAgentConversationHeader = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AgentConversationHeader.tsx",
    ),
    "utf8",
  );

export const readAcpRunLogDialog = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AcpRunLogDialog.tsx",
    ),
    "utf8",
  );

export const readAboutDialog = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AboutDialog.tsx",
    ),
    "utf8",
  );

export const readAgentRunChatLog = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AgentRunChatLog.tsx",
    ),
    "utf8",
  );

export const readGenerationErrorDetailsDialog = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerationErrorDetailsDialog.tsx",
    ),
    "utf8",
  );

export const readWorkspaceBoundsOverlay = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/WorkspaceBoundsOverlay.tsx",
    ),
    "utf8",
  );

export const readProjectRenderBoundary = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/ProjectRenderBoundary.tsx",
    ),
    "utf8",
  );

export const readAppBridgeUnavailable = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AppBridgeUnavailable.tsx",
    ),
    "utf8",
  );

export const readAppProjectEntryScreen = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AppProjectEntryScreen.tsx",
    ),
    "utf8",
  );

export const readAppErrorBanners = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AppErrorBanners.tsx",
    ),
    "utf8",
  );

export const readEditorLoadingOverlay = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/EditorLoadingOverlay.tsx",
    ),
    "utf8",
  );

export const readAgentBoardStartupPane = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AgentBoardStartupPane.tsx",
    ),
    "utf8",
  );

export const readDesktopButton = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/DesktopButton.tsx",
    ),
    "utf8",
  );

export const readDesktopStartupWiring = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/useDesktopStartupWiring.ts",
    ),
    "utf8",
  );

export const readProjectAutosaveWiring = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/useProjectAutosaveWiring.ts",
    ),
    "utf8",
  );

export const readAgentBridgeWiring = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/useAgentBridgeWiring.ts",
    ),
    "utf8",
  );

export const readAcpAgentWiring = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/useAcpAgentWiring.ts",
    ),
    "utf8",
  );

export const readSideDock = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/SideDock.tsx",
    ),
    "utf8",
  );

export const readGenerateDialogViewModel = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/generateDialogViewModel.ts",
    ),
    "utf8",
  );

export const readGenerateAdvancedFieldsPanel = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateAdvancedFieldsPanel.tsx",
    ),
    "utf8",
  );

export const readGenerateDialogAdvancedSettings = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogAdvancedSettings.tsx",
    ),
    "utf8",
  );

export const readGenerateDialogAdvancedSettingsRuntime = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogAdvancedSettingsRuntime.ts",
    ),
    "utf8",
  );

export const readGenerateDialogComposerRuntime = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogComposerRuntime.ts",
    ),
    "utf8",
  );

export const readGenerateDialogComposerActionsSection = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogComposerActionsSection.tsx",
    ),
    "utf8",
  );

export const readGenerateDialogComposerContentSection = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogComposerContentSection.tsx",
    ),
    "utf8",
  );

export const readGenerateDialogComposerSection = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogComposerSection.tsx",
    ),
    "utf8",
  );

export const readImageInspector = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/ImageInspector.tsx",
    ),
    "utf8",
  );

export const readAgentBoard = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AgentBoard.tsx",
    ),
    "utf8",
  );

export const readProjectMainMenu = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/ProjectMainMenu.tsx",
    ),
    "utf8",
  );

export const readProjectStatusToast = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/ProjectStatusToast.tsx",
    ),
    "utf8",
  );

export const readCoreStudioIcons = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/CoreStudioIcons.tsx",
    ),
    "utf8",
  );

export const getRule = (css: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(
    new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{[\\s\\S]*?\\n\\}`),
  )?.[0];
};

export const getRulesContaining = (css: string, selector: string) => {
  return (
    css
      .match(/(?:^|\n)[^{]+\{[\s\S]*?\n\}/g)
      ?.filter((rule) => rule.includes(selector)) ?? []
  );
};
