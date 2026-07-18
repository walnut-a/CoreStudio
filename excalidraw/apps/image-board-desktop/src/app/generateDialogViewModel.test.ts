import { describe, expect, it } from "vitest";

import { buildGenerateDialogViewModel } from "./generateDialogViewModel";
import type { GenerationRequest } from "../shared/providerTypes";

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "gemini",
  model: "gemini-2.5-flash-image",
  prompt: "",
  width: 1024,
  height: 1024,
  imageCount: 1,
  ...patch,
});

const referenceLimitMessages = {
  exceeded: "最多 {count} 张参考图。",
  unsupportedWithInlineReferences: "当前模型不支持已插入的参考图。",
  unsupported: "当前模型不支持参考图。",
  reached: "最多 {count} 张参考图。",
};

describe("buildGenerateDialogViewModel", () => {
  it("requires built-in references to be confirmed in the input before submit", () => {
    const viewModel = buildGenerateDialogViewModel({
      request: createRequest({
        prompt: "基于选中对象继续优化",
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
        },
      }),
      providerSettings: {
        gemini: {
          isConfigured: true,
          customModels: [],
        },
      } as never,
      currentProviderCustomModels: [],
      effectiveComposerMode: "direct",
      effectiveGenerationSource: "builtin",
      showComposerModeSwitch: true,
      showComposerModeIndicator: false,
      showGenerationSourceSwitch: true,
      agentGenerationAvailable: false,
      agentTaskStatus: null,
      referenceLimitMessages,
    });

    expect(viewModel.hasSubmitContent).toBe(true);
    expect(viewModel.pendingReference).not.toBeNull();
    expect(viewModel.canSubmit).toBe(false);
  });

  it("blocks built-in generation when inline references exceed the selected model limit", () => {
    const viewModel = buildGenerateDialogViewModel({
      request: createRequest({
        prompt: "优化桌面 CNC",
        promptReferences: Array.from({ length: 9 }, (_, index) => ({
          id: `ref-${index + 1}`,
          label: `图片 ${index + 1}`,
          enabled: true,
          elementCount: 1,
          textCount: 0,
        })),
      }),
      providerSettings: {
        gemini: {
          isConfigured: true,
          customModels: [],
        },
      } as never,
      currentProviderCustomModels: [],
      effectiveComposerMode: "direct",
      effectiveGenerationSource: "builtin",
      showComposerModeSwitch: true,
      showComposerModeIndicator: false,
      showGenerationSourceSwitch: true,
      agentGenerationAvailable: false,
      agentTaskStatus: null,
      referenceLimitMessages,
    });

    expect(viewModel.referenceLimitExceeded).toBe(true);
    expect(viewModel.referenceLimitMessage).toBe("最多 3 张参考图。");
    expect(viewModel.canSubmit).toBe(false);
    expect(viewModel.classNames).toContain(
      "generate-composer--with-reference",
    );
    expect(viewModel.showBody).toBe(false);
  });

  it("allows ACP Agent instructions without built-in provider configuration", () => {
    const viewModel = buildGenerateDialogViewModel({
      request: createRequest({
        prompt: "基于选中对象继续优化",
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
        },
      }),
      providerSettings: null,
      currentProviderCustomModels: [],
      effectiveComposerMode: "acp",
      effectiveGenerationSource: "agent",
      showComposerModeSwitch: true,
      showComposerModeIndicator: false,
      showGenerationSourceSwitch: false,
      agentGenerationAvailable: true,
      agentTaskStatus: {
        status: "completed",
        message: "上一轮已完成",
      },
      referenceLimitMessages,
    });

    expect(viewModel.isConfigured).toBe(false);
    expect(viewModel.hasSubmitContent).toBe(true);
    expect(viewModel.canSubmit).toBe(true);
    expect(viewModel.showBody).toBe(false);
    expect(viewModel.showComposerTaskBar).toBe(true);
    expect(viewModel.classNames).toEqual(
      expect.arrayContaining([
        "generate-composer",
        "generate-composer--with-mode-switch",
        "generate-composer--with-taskbar",
        "generate-composer--with-agent-task",
      ]),
    );
  });
});
