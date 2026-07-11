import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useGenerateProviderSettingsController } from "./useGenerateProviderSettingsController";
import type {
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../shared/desktopBridgeTypes";
import type { CustomProviderModel, ProviderId } from "../shared/providerTypes";

let controller:
  | ReturnType<typeof useGenerateProviderSettingsController>
  | null = null;

const createProviderSettings = (
  patch: Partial<PublicProviderSettings> = {},
): PublicProviderSettings =>
  ({
    gemini: {
      isConfigured: false,
      defaultModel: "gemini-2.5-flash-image-preview",
      customModels: [],
    },
    zenmux: {
      isConfigured: false,
      defaultModel: "gemini-3-pro-image-preview",
      customModels: [],
    },
    fal: {
      isConfigured: false,
      defaultModel: "fal-ai/imagen4/preview",
      customModels: [],
    },
    jimeng: {
      isConfigured: false,
      defaultModel: "jimeng-3.1",
      customModels: [],
    },
    openai: {
      isConfigured: false,
      defaultModel: "gpt-image-1",
      customModels: [],
    },
    openrouter: {
      isConfigured: false,
      defaultModel: "google/gemini-3-pro-image-preview",
      customModels: [],
    },
    ...patch,
  }) as PublicProviderSettings;

const ControllerProbe = ({
  provider = "gemini",
  model = "gemini-2.5-flash-image-preview",
  open = true,
  settings = createProviderSettings(),
  onSaveProviderSettings,
}: {
  provider?: ProviderId;
  model?: string;
  open?: boolean;
  settings?: PublicProviderSettings;
  onSaveProviderSettings?: (
    input: SaveProviderSettingsInput,
  ) => Promise<PublicProviderSettings | void>;
}) => {
  controller = useGenerateProviderSettingsController({
    provider,
    model,
    open,
    currentProviderSettings: settings[provider],
    currentProviderCustomModels: settings[provider]?.customModels ?? [],
    onSaveProviderSettings,
  });

  return (
    <output data-testid="state">
      {JSON.stringify({
        apiKeyDraft: controller.apiKeyDraft,
        customModelDraft: controller.customModelDraft,
        customModelTemplate: controller.customModelTemplate,
        customModelAdapter: controller.customModelAdapter,
        supportsReferenceImages:
          controller.customModelCapabilities.supportsReferenceImages,
        customModelAdvancedOpen: controller.customModelAdvancedOpen,
        canSaveProviderSettings: controller.canSaveProviderSettings,
        canAddCustomModel: controller.canAddCustomModel,
        feedbackKind: controller.providerSaveFeedback?.kind ?? null,
      })}
    </output>
  );
};

const getState = () =>
  JSON.parse(screen.getByTestId("state").textContent ?? "{}") as {
    apiKeyDraft: string;
    customModelDraft: string;
    customModelTemplate: string;
    customModelAdapter: string;
    supportsReferenceImages: boolean;
    customModelAdvancedOpen: boolean;
    canSaveProviderSettings: boolean;
    canAddCustomModel: boolean;
    feedbackKind: "success" | "error" | null;
  };

describe("useGenerateProviderSettingsController", () => {
  it("resets provider drafts when switching provider", () => {
    const { rerender } = render(<ControllerProbe provider="gemini" />);

    act(() => {
      controller?.updateApiKeyDraft("sk-test");
      controller?.updateCustomModelDraft("custom-model");
      controller?.setCustomModelAdvancedOpen(true);
    });

    expect(getState()).toMatchObject({
      apiKeyDraft: "sk-test",
      customModelDraft: "custom-model",
      customModelAdvancedOpen: true,
    });

    rerender(<ControllerProbe provider="openai" model="gpt-image-1" />);

    expect(getState()).toMatchObject({
      apiKeyDraft: "",
      customModelDraft: "",
      customModelAdvancedOpen: false,
      feedbackKind: null,
    });
  });

  it("saves provider API settings and clears the API key draft", async () => {
    const onSaveProviderSettings = vi.fn(
      async (input: SaveProviderSettingsInput) => input as any,
    );

    render(
      <ControllerProbe
        provider="gemini"
        model="gemini-2.5-flash-image-preview"
        onSaveProviderSettings={onSaveProviderSettings}
      />,
    );

    act(() => {
      controller?.updateApiKeyDraft("sk-test");
    });

    expect(getState().canSaveProviderSettings).toBe(true);

    await act(async () => {
      await controller?.saveProviderSettings();
    });

    await waitFor(() => {
      expect(onSaveProviderSettings).toHaveBeenCalledWith({
        provider: "gemini",
        apiKey: "sk-test",
        defaultModel: "gemini-2.5-flash-image-preview",
      });
    });
    expect(getState()).toMatchObject({
      apiKeyDraft: "",
      feedbackKind: "success",
    });
  });

  it("adds a custom model and reports the next custom model list", async () => {
    const existingModel: CustomProviderModel = {
      id: "custom-old",
      label: "custom-old",
      capabilityTemplate: "text-to-image-exact",
    };
    const settings = createProviderSettings({
      gemini: {
        isConfigured: true,
        defaultModel: "gemini-2.5-flash-image-preview",
        customModels: [existingModel],
      },
    });
    const onSaveProviderSettings = vi.fn(
      async (input: SaveProviderSettingsInput) => input as any,
    );

    render(
      <ControllerProbe
        settings={settings}
        onSaveProviderSettings={onSaveProviderSettings}
      />,
    );

    act(() => {
      controller?.updateCustomModelDraft("custom-new");
      controller?.updateCustomModelTemplate("text-to-image-exact");
      controller?.updateCustomModelCapabilities({
        supportsReferenceImages: false,
      });
    });

    expect(getState()).toMatchObject({
      customModelDraft: "custom-new",
      canAddCustomModel: true,
      supportsReferenceImages: false,
    });

    let result: {
      modelId: string;
      customModels: readonly CustomProviderModel[];
    } | null = null;
    await act(async () => {
      result = (await controller?.addCustomModel()) ?? null;
    });

    await waitFor(() => {
      expect(onSaveProviderSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "gemini",
          apiKey: "",
          defaultModel: "custom-new",
          customModels: expect.arrayContaining([
            existingModel,
            expect.objectContaining({
              id: "custom-new",
              capabilityTemplate: "text-to-image-exact",
              capabilities: expect.objectContaining({
                supportsReferenceImages: false,
              }),
            }),
          ]),
        }),
      );
    });
    const createdResult = result as {
      modelId: string;
      customModels: readonly CustomProviderModel[];
    } | null;
    if (!createdResult) {
      throw new Error("Expected custom model creation result");
    }
    expect(createdResult).toMatchObject({ modelId: "custom-new" });
    expect(createdResult.customModels).toEqual(
      expect.arrayContaining([
        existingModel,
        expect.objectContaining({ id: "custom-new" }),
      ]),
    );
    expect(getState()).toMatchObject({
      customModelDraft: "",
      feedbackKind: "success",
    });
  });
});
