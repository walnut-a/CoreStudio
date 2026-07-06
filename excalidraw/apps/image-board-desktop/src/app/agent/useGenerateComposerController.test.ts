import { describe, expect, it } from "vitest";

import {
  buildGenerateComposerViewModel,
  getGenerateComposerCanSubmit,
  getGenerationSourceForComposerMode,
} from "./useGenerateComposerController";

describe("buildGenerateComposerViewModel", () => {
  it("models the software ACP Agent mode as an Agent-backed prompt composer", () => {
    const viewModel = buildGenerateComposerViewModel({
      composerConfig: {
        defaultMode: "direct",
        showModeSwitch: true,
        modeSwitchVariant: "acp-agent",
        defaultGenerationSource: "builtin",
        agentGenerationAvailable: true,
      },
      composerMode: "acp",
      generationSource: "agent",
    });

    expect(viewModel.composerModeOptions).toEqual(["direct", "acp"]);
    expect(viewModel.effectiveComposerMode).toBe("acp");
    expect(viewModel.isPromptComposerMode).toBe(true);
    expect(viewModel.isAgentOperationMode).toBe(false);
    expect(viewModel.agentGenerationSelectable).toBe(true);
    expect(viewModel.effectiveGenerationSource).toBe("agent");
    expect(viewModel.generationSourceLabel).toBe("ACP Agent");
  });

  it("keeps Agent Board operation mode fixed without exposing source choices", () => {
    const viewModel = buildGenerateComposerViewModel({
      composerConfig: {
        defaultMode: "agent",
        showModeSwitch: false,
        showModeIndicator: true,
        defaultGenerationSource: "agent",
        showGenerationSourceSwitch: false,
      },
      generationSource: "builtin",
    });

    expect(viewModel.showComposerModeSwitch).toBe(false);
    expect(viewModel.effectiveComposerMode).toBe("agent");
    expect(viewModel.isPromptComposerMode).toBe(false);
    expect(viewModel.isAgentOperationMode).toBe(true);
    expect(viewModel.agentGenerationSelectable).toBe(true);
    expect(viewModel.effectiveGenerationSource).toBe("agent");
  });

  it("falls back to built-in generation when Agent generation is selected but unavailable", () => {
    const viewModel = buildGenerateComposerViewModel({
      composerConfig: {
        defaultMode: "direct",
        defaultGenerationSource: "agent",
        showGenerationSourceSwitch: true,
        agentGenerationAvailable: false,
      },
      generationSource: "agent",
    });

    expect(viewModel.agentGenerationSelectable).toBe(false);
    expect(viewModel.effectiveGenerationSource).toBe("builtin");
    expect(viewModel.generationSourceLabel).toBe("直接生成");
  });
});

describe("getGenerationSourceForComposerMode", () => {
  it("only syncs generation source for the software ACP mode switch", () => {
    expect(getGenerationSourceForComposerMode("acp-agent", "acp")).toBe(
      "agent",
    );
    expect(getGenerationSourceForComposerMode("acp-agent", "direct")).toBe(
      "builtin",
    );
    expect(getGenerationSourceForComposerMode("agent-operation", "agent")).toBe(
      null,
    );
  });
});

describe("getGenerateComposerCanSubmit", () => {
  it("requires Agent availability for Agent-backed submit", () => {
    expect(
      getGenerateComposerCanSubmit({
        effectiveGenerationSource: "agent",
        hasSubmitContent: true,
        agentGenerationAvailable: false,
        builtInGenerationConfigured: true,
        referenceLimitExceeded: false,
      }),
    ).toBe(false);

    expect(
      getGenerateComposerCanSubmit({
        effectiveGenerationSource: "agent",
        hasSubmitContent: true,
        agentGenerationAvailable: true,
        builtInGenerationConfigured: false,
        referenceLimitExceeded: true,
      }),
    ).toBe(true);
  });

  it("requires provider configuration and valid references for built-in submit", () => {
    expect(
      getGenerateComposerCanSubmit({
        effectiveGenerationSource: "builtin",
        hasSubmitContent: true,
        agentGenerationAvailable: false,
        builtInGenerationConfigured: true,
        referenceLimitExceeded: false,
      }),
    ).toBe(true);

    expect(
      getGenerateComposerCanSubmit({
        effectiveGenerationSource: "builtin",
        hasSubmitContent: true,
        agentGenerationAvailable: true,
        builtInGenerationConfigured: false,
        referenceLimitExceeded: false,
      }),
    ).toBe(false);
  });
});
