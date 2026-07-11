import { describe, expect, it, vi } from "vitest";

import { createGenerateProviderSettingsActions } from "./generateProviderSettingsActions";
import type {
  CustomProviderModel,
  GenerationRequest,
  ProviderCapabilities,
} from "../shared/providerTypes";

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "gemini",
  model: "gemini-2.5-flash-image-preview",
  prompt: "",
  width: 1024,
  height: 1024,
  imageCount: 1,
  ...patch,
});

const createCapabilities = (
  patch: Partial<ProviderCapabilities> = {},
): ProviderCapabilities => ({
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageCount: false,
  supportsReferenceImages: false,
  maxImageCount: 1,
  maxReferenceImageCount: 0,
  sizeControlMode: "exact",
  ...patch,
});

describe("createGenerateProviderSettingsActions", () => {
  it("adds a custom model and updates the generation request model", async () => {
    let request = createRequest();
    const updateRequest = vi.fn(
      (
        updater:
          | GenerationRequest
          | ((current: GenerationRequest) => GenerationRequest),
        _customModels?: readonly CustomProviderModel[],
      ) => {
        request = typeof updater === "function" ? updater(request) : updater;
        return request;
      },
    );
    const onModelSelectionChange = vi.fn();
    const addCustomModel = vi.fn(async () => ({
      modelId: "custom-cnc-model",
      customModels: [
        {
          id: "custom-cnc-model",
          label: "Custom CNC Model",
          capabilityTemplate: "text-to-image-exact" as const,
        },
      ],
    }));
    const actions = createGenerateProviderSettingsActions({
      addCustomModel,
      updateRequest,
      updateCustomModelCapabilities: vi.fn(),
      onModelSelectionChange,
    });

    await actions.addCustomModelToRequest();

    expect(request.model).toBe("custom-cnc-model");
    expect(updateRequest).toHaveBeenCalledWith(expect.any(Function), [
      {
        id: "custom-cnc-model",
        label: "Custom CNC Model",
        capabilityTemplate: "text-to-image-exact",
      },
    ]);
    expect(onModelSelectionChange).toHaveBeenCalledWith({
      provider: "gemini",
      model: "custom-cnc-model",
    });
  });

  it("does not update request when custom model creation is cancelled", async () => {
    const updateRequest = vi.fn(
      (
        updater:
          | GenerationRequest
          | ((current: GenerationRequest) => GenerationRequest),
        _customModels?: readonly CustomProviderModel[],
      ) =>
        typeof updater === "function"
          ? updater(createRequest())
          : updater,
    );
    const onModelSelectionChange = vi.fn();
    const actions = createGenerateProviderSettingsActions({
      addCustomModel: vi.fn(async () => null),
      updateRequest,
      updateCustomModelCapabilities: vi.fn(),
      onModelSelectionChange,
    });

    await actions.addCustomModelToRequest();

    expect(updateRequest).not.toHaveBeenCalled();
    expect(onModelSelectionChange).not.toHaveBeenCalled();
  });

  it("keeps reference image count consistent when toggling reference image support", () => {
    const updateCustomModelCapabilities = vi.fn();
    const actions = createGenerateProviderSettingsActions({
      addCustomModel: vi.fn(),
      updateRequest: vi.fn(),
      updateCustomModelCapabilities,
    });

    actions.changeSupportsReferenceImages(true);
    actions.changeSupportsReferenceImages(false);

    const enableUpdater = updateCustomModelCapabilities.mock.calls[0]?.[0] as (
      current: ProviderCapabilities,
    ) => ProviderCapabilities;
    const disableUpdater = updateCustomModelCapabilities.mock.calls[1]?.[0] as (
      current: ProviderCapabilities,
    ) => ProviderCapabilities;

    expect(enableUpdater(createCapabilities())).toMatchObject({
      supportsReferenceImages: true,
      maxReferenceImageCount: 8,
    });
    expect(
      enableUpdater(createCapabilities({ maxReferenceImageCount: 3 })),
    ).toMatchObject({
      supportsReferenceImages: true,
      maxReferenceImageCount: 3,
    });
    expect(disableUpdater(createCapabilities({ maxReferenceImageCount: 3 }))).toMatchObject({
      supportsReferenceImages: false,
      maxReferenceImageCount: 0,
    });
  });

  it("keeps max image count consistent when toggling multiple image output", () => {
    const updateCustomModelCapabilities = vi.fn();
    const actions = createGenerateProviderSettingsActions({
      addCustomModel: vi.fn(),
      updateRequest: vi.fn(),
      updateCustomModelCapabilities,
    });

    actions.changeImageCountMode(true);
    actions.changeImageCountMode(false);

    const multipleUpdater = updateCustomModelCapabilities.mock.calls[0]?.[0] as (
      current: ProviderCapabilities,
    ) => ProviderCapabilities;
    const singleUpdater = updateCustomModelCapabilities.mock.calls[1]?.[0] as (
      current: ProviderCapabilities,
    ) => ProviderCapabilities;

    expect(multipleUpdater(createCapabilities())).toMatchObject({
      supportsImageCount: true,
      maxImageCount: 4,
    });
    expect(singleUpdater(createCapabilities({ maxImageCount: 4 }))).toMatchObject({
      supportsImageCount: false,
      maxImageCount: 1,
    });
  });
});
