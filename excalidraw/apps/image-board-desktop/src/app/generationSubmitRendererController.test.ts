import { describe, expect, it, vi } from "vitest";

import {
  createGenerationSubmitRendererActions,
  runGenerationSubmitRendererAction,
} from "./generationSubmitRendererController";

import type {
  DesktopProjectBundle,
  PublicProviderSettings,
} from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  prompt: "做一台桌面 CNC",
  width: 1024,
  height: 1024,
  imageCount: 1,
  seed: null,
  reference: null,
  ...patch,
});

const createProject = (): DesktopProjectBundle => ({
  projectPath: "/tmp/corestudio-project",
  project: {
    formatVersion: 1,
    appVersion: "1.1.0",
    name: "工业设计助手",
    createdAt: "2026-07-05T00:00:00.000Z",
    updatedAt: "2026-07-05T00:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: {
      token: "project-token",
      enabled: true,
    },
  },
  sceneJson: "{}",
  imageRecords: {},
});

const createProviderSettings = (
  patch: Partial<PublicProviderSettings> = {},
): PublicProviderSettings => ({
  gemini: {
    isConfigured: false,
    defaultModel: "imagen-4.0-generate-001",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  zenmux: {
    isConfigured: false,
    defaultModel: "google/gemini-3-pro-image-preview",
    customModels: [],
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  fal: {
    isConfigured: false,
    defaultModel: "fal-ai/flux/schnell",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  jimeng: {
    isConfigured: false,
    defaultModel: "doubao-seedream-5-0-lite-260128",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openai: {
    isConfigured: false,
    defaultModel: "gpt-image-1.5",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openrouter: {
    isConfigured: false,
    defaultModel: "google/gemini-3.1-flash-image-preview",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  ...patch,
});

describe("runGenerationSubmitRendererAction", () => {
  it("skips submission when there is no active project", async () => {
    const startBuiltinGeneration = vi.fn();
    const clearGenerationError = vi.fn();
    const assertProjectActive = vi.fn();

    await expect(
      runGenerationSubmitRendererAction({
        request: createRequest(),
        project: null,
        providerSettings: null,
        rejectOnError: false,
        clearGenerationError,
        assertProjectActive,
        startAcpAgentGeneration: vi.fn(),
        startBuiltinGeneration,
        showGenerationError: vi.fn(),
      }),
    ).resolves.toEqual({ status: "skipped-no-project" });

    expect(clearGenerationError).not.toHaveBeenCalled();
    expect(assertProjectActive).not.toHaveBeenCalled();
    expect(startBuiltinGeneration).not.toHaveBeenCalled();
  });

  it("routes agent requests to the ACP task starter", async () => {
    const request = createRequest({ generationSource: "agent" });
    const project = createProject();
    const startAcpAgentGeneration = vi.fn(async () => undefined);

    await expect(
      runGenerationSubmitRendererAction({
        request,
        project,
        providerSettings: null,
        rejectOnError: false,
        clearGenerationError: vi.fn(),
        assertProjectActive: vi.fn(),
        startAcpAgentGeneration,
        startBuiltinGeneration: vi.fn(),
        showGenerationError: vi.fn(),
      }),
    ).resolves.toEqual({ status: "acp-agent-started" });

    expect(startAcpAgentGeneration).toHaveBeenCalledWith(request);
  });

  it("routes builtin requests to the builtin generation starter and detaches completion", async () => {
    const request = createRequest({ generationSource: "builtin" });
    const project = createProject();
    const completion = Promise.resolve();
    const startBuiltinGeneration = vi.fn(async () => ({ completion }));

    await expect(
      runGenerationSubmitRendererAction({
        request,
        project,
        providerSettings: null,
        rejectOnError: false,
        clearGenerationError: vi.fn(),
        assertProjectActive: vi.fn(),
        startAcpAgentGeneration: vi.fn(),
        startBuiltinGeneration,
        showGenerationError: vi.fn(),
      }),
    ).resolves.toEqual({ status: "builtin-started" });

    expect(startBuiltinGeneration).toHaveBeenCalledWith(request, project);
  });

  it("shows the ACP fallback message and rethrows when requested", async () => {
    const request = createRequest({ generationSource: "agent" });
    const error = new Error("agent failed");
    const showGenerationError = vi.fn();

    await expect(
      runGenerationSubmitRendererAction({
        request,
        project: createProject(),
        providerSettings: null,
        rejectOnError: true,
        clearGenerationError: vi.fn(),
        assertProjectActive: vi.fn(),
        startAcpAgentGeneration: vi.fn(async () => {
          throw error;
        }),
        startBuiltinGeneration: vi.fn(),
        showGenerationError,
      }),
    ).rejects.toBe(error);

    expect(showGenerationError).toHaveBeenCalledWith(
      request,
      error,
      "ACP Agent 任务启动失败。",
    );
  });

  it("normalizes builtin error display requests with provider settings", async () => {
    const request = createRequest({
      provider: "zenmux",
      model: "custom-model",
      generationSource: "builtin",
    });
    const error = new Error("builtin failed");
    const showGenerationError = vi.fn();

    await expect(
      runGenerationSubmitRendererAction({
        request,
        project: createProject(),
        providerSettings: createProviderSettings({
          zenmux: {
            isConfigured: true,
            defaultModel: "custom-model",
            customModels: [
              {
                id: "custom-model",
                capabilityTemplate: "text-to-image-exact",
              },
            ],
            lastStatus: "success",
            lastCheckedAt: "2026-07-05T00:00:00.000Z",
            lastError: null,
          },
        }),
        rejectOnError: false,
        clearGenerationError: vi.fn(),
        assertProjectActive: vi.fn(),
        startAcpAgentGeneration: vi.fn(),
        startBuiltinGeneration: vi.fn(async () => {
          throw error;
        }),
        showGenerationError,
      }),
    ).resolves.toEqual({ status: "builtin-failed" });

    expect(showGenerationError).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "custom-model",
        width: 1024,
        height: 1024,
      }),
      error,
    );
  });
});

describe("createGenerationSubmitRendererActions", () => {
  it("creates a submit handler that reads latest project settings and passes submit options to builtin generation", async () => {
    const project = createProject();
    const providerSettings = createProviderSettings();
    const request = createRequest({ generationSource: "builtin" });
    const placementViewport = { x: 1, y: 2, zoom: 1.25 };
    const referenceScene = { elements: [] };
    const startBuiltinGeneration = vi.fn(async () => ({}));
    const assertProjectActive = vi.fn();
    const clearGenerationError = vi.fn();

    const actions = createGenerationSubmitRendererActions({
      getProject: () => project,
      getProviderSettings: () => providerSettings,
      clearGenerationError,
      assertProjectActive,
      startAcpAgentGeneration: vi.fn(),
      startBuiltinGeneration,
      showGenerationError: vi.fn(),
    });

    await expect(
      actions.submit(request, false, {
        expectedProjectPath: "/tmp/corestudio-project",
        placementViewport,
        referenceScene,
      }),
    ).resolves.toEqual({ status: "builtin-started" });

    expect(clearGenerationError).toHaveBeenCalledTimes(1);
    expect(assertProjectActive).toHaveBeenCalledWith(
      "/tmp/corestudio-project",
    );
    expect(startBuiltinGeneration).toHaveBeenCalledWith(
      request,
      project,
      expect.objectContaining({
        expectedProjectPath: "/tmp/corestudio-project",
        placementViewport,
        referenceScene,
        rejectOnError: undefined,
      }),
    );
  });

  it("creates a submit handler that rethrows ACP errors when requested", async () => {
    const request = createRequest({ generationSource: "agent" });
    const error = new Error("agent failed");
    const showGenerationError = vi.fn();

    const actions = createGenerationSubmitRendererActions({
      getProject: createProject,
      getProviderSettings: () => null,
      clearGenerationError: vi.fn(),
      assertProjectActive: vi.fn(),
      startAcpAgentGeneration: vi.fn(async () => {
        throw error;
      }),
      startBuiltinGeneration: vi.fn(),
      showGenerationError,
    });

    await expect(
      actions.submit(request, false, { rejectOnError: true }),
    ).rejects.toBe(error);

    expect(showGenerationError).toHaveBeenCalledWith(
      request,
      error,
      "ACP Agent 任务启动失败。",
    );
  });
});
