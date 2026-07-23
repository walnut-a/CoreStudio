import { describe, expect, it, vi } from "vitest";

import {
  createGenerateDialogReferenceRendererActions,
  runGenerateDialogOpenRendererAction,
  runGenerateReferenceCommitRendererAction,
  runGenerateReferenceRemovalRendererAction,
} from "./generateDialogReferenceController";

import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";
import { getSelectionReferenceSignature } from "./selectionReference";

type GenerateDialogReferenceSceneSnapshot = NonNullable<
  ReturnType<
    Parameters<typeof runGenerateDialogOpenRendererAction>[0]["getScene"]
  >
>;

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "gemini",
  model: "gemini-2.5-flash-image-preview",
  prompt: "旧 prompt",
  width: 1024,
  height: 1024,
  imageCount: 1,
  reference: null,
  ...patch,
});

const providerSettings = {
  gemini: {
    defaultModel: "gemini-2.5-flash-image-preview",
    isConfigured: true,
    lastStatus: "success",
    lastCheckedAt: null,
    lastError: null,
  },
} as PublicProviderSettings;

const createScene = () =>
  ({
    elements: [
      {
        id: "image-element",
        type: "image",
        fileId: "image-file",
        isDeleted: false,
        groupIds: [],
      },
    ],
    appState: {
      selectedElementIds: {
        "image-element": true,
      },
      selectedGroupIds: {},
      viewBackgroundColor: "#ffffff",
    },
    files: {
      "image-file": {
        dataURL: "data:image/png;base64,abc",
      },
    },
  } as unknown as GenerateDialogReferenceSceneSnapshot);

const createImageRecords = () => ({
  "image-file": {
    fileId: "image-file",
    assetPath: "assets/image-file.png",
    sourceType: "generated" as const,
    provider: "gemini" as const,
    model: "gemini-2.5-flash-image-preview",
    prompt: "参考图",
    width: 1024,
    height: 1024,
    mimeType: "image/png",
    createdAt: "2026-07-05T00:00:00.000Z",
  },
});

describe("generate dialog reference renderer controller", () => {
  it("opens the generate dialog with a reference derived from the current scene", async () => {
    const setRemovedSelectionReferenceSignature = vi.fn();
    const clearGenerationError = vi.fn();
    const updateGenerateRequest = vi.fn();
    const focusGenerateInput = vi.fn();
    const getScene = vi.fn(() => createScene());
    const getImageRecords = vi.fn(() => createImageRecords());

    const result = await runGenerateDialogOpenRendererAction({
      getScene,
      getImageRecords,
      removedSelectionReferenceSignature: "old-selection",
      setRemovedSelectionReferenceSignature,
      nextRequest: { prompt: "新 prompt" },
      providerSettings,
      clearGenerationError,
      updateGenerateRequest,
      focusGenerateInput,
    });

    expect(result).toMatchObject({
      shouldBuildReference: true,
      removedSelectionReferenceSignature: null,
    });
    expect(getScene).toHaveBeenCalledTimes(1);
    expect(getImageRecords).toHaveBeenCalledTimes(1);
    expect(setRemovedSelectionReferenceSignature).toHaveBeenCalledWith(null);
    expect(clearGenerationError).toHaveBeenCalledTimes(1);
    expect(focusGenerateInput).toHaveBeenCalledTimes(1);

    const updater = updateGenerateRequest.mock.calls[0]?.[0] as (
      current: GenerationRequest,
    ) => GenerationRequest;
    expect(updater(createRequest())).toMatchObject({
      prompt: "新 prompt",
      reference: {
        items: [
          expect.objectContaining({
            id: "image-element",
            fileId: "image-file",
            thumbnailDataUrl: "data:image/png;base64,abc",
          }),
        ],
      },
    });
  });

  it("removes the current scene reference through the owner action", () => {
    const setRemovedSelectionReferenceSignature = vi.fn();
    const updateGenerateRequest = vi.fn();
    const getScene = vi.fn(() => createScene());
    const selectionReferenceSignature = getSelectionReferenceSignature(
      createScene(),
    );

    const result = runGenerateReferenceRemovalRendererAction({
      getScene,
      currentRequest: createRequest({
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
        },
      }),
      providerSettings,
      setRemovedSelectionReferenceSignature,
      updateGenerateRequest,
    });

    expect(result).toEqual({
      removedSelectionReferenceSignature: selectionReferenceSignature,
    });
    expect(getScene).toHaveBeenCalledTimes(1);
    expect(setRemovedSelectionReferenceSignature).toHaveBeenCalledWith(
      selectionReferenceSignature,
    );

    const updater = updateGenerateRequest.mock.calls[0]?.[0] as (
      current: GenerationRequest,
    ) => GenerationRequest;
    expect(
      updater(
        createRequest({
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
          },
        }),
      ),
    ).toMatchObject({
      reference: null,
    });
  });

  it("commits the current reference after loading original image files", async () => {
    const sourceScene = createScene();
    const originalScene = createScene();
    const getScene = vi.fn(() => sourceScene);
    const getImageRecords = vi.fn(() => createImageRecords());
    const loadOriginalScene = vi.fn(
      async (scene: GenerateDialogReferenceSceneSnapshot | null) => {
        expect(scene).toBe(sourceScene);
        return originalScene;
      },
    );

    await expect(
      runGenerateReferenceCommitRendererAction({
        getScene,
        getImageRecords,
        loadOriginalScene,
      }),
    ).resolves.toMatchObject({
      image: {
        mimeType: "image/png",
        dataBase64: "abc",
      },
      debug: {
        fileId: "image-file",
        sourceType: "generated",
        sourceProvider: "gemini",
      },
    });

    expect(getScene).toHaveBeenCalledTimes(1);
    expect(getImageRecords).toHaveBeenCalledTimes(1);
    expect(loadOriginalScene).toHaveBeenCalledTimes(1);
  });

  it("creates renderer actions for opening, removing, and committing references", async () => {
    const sourceScene = createScene();
    const originalScene = createScene();
    const getScene = vi.fn(() => sourceScene);
    const getImageRecords = vi.fn(() => createImageRecords());
    const getRemovedSelectionReferenceSignature = vi.fn(() => "old-selection");
    const setRemovedSelectionReferenceSignature = vi.fn();
    const getCurrentRequest = vi.fn(() =>
      createRequest({
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
        },
      }),
    );
    const getProviderSettings = vi.fn(() => providerSettings);
    const clearGenerationError = vi.fn();
    const updateGenerateRequest = vi.fn();
    const focusGenerateInput = vi.fn();
    const loadOriginalScene = vi.fn(async () => originalScene);
    const selectionReferenceSignature =
      getSelectionReferenceSignature(sourceScene);
    const actions = createGenerateDialogReferenceRendererActions({
      getScene,
      getImageRecords,
      getRemovedSelectionReferenceSignature,
      setRemovedSelectionReferenceSignature,
      getCurrentRequest,
      getProviderSettings,
      clearGenerationError,
      updateGenerateRequest,
      focusGenerateInput,
      loadOriginalScene,
    });

    await expect(actions.open({ prompt: "新 prompt" })).resolves.toMatchObject({
      shouldBuildReference: true,
    });
    expect(actions.remove()).toEqual({
      removedSelectionReferenceSignature: selectionReferenceSignature,
    });
    await expect(actions.commit()).resolves.toMatchObject({
      debug: {
        fileId: "image-file",
      },
    });

    expect(getRemovedSelectionReferenceSignature).toHaveBeenCalledTimes(1);
    expect(getCurrentRequest).toHaveBeenCalledTimes(1);
    expect(getProviderSettings).toHaveBeenCalledTimes(2);
    expect(clearGenerationError).toHaveBeenCalledTimes(1);
    expect(focusGenerateInput).toHaveBeenCalledTimes(1);
    expect(loadOriginalScene).toHaveBeenCalledWith(sourceScene);
  });
});
