import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useGenerateRequestController } from "./useGenerateRequestController";
import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type {
  GenerationPromptReferencePayload,
  GenerationRequest,
} from "../shared/providerTypes";

let controller: ReturnType<typeof useGenerateRequestController> | null = null;

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

const createSettings = (): PublicProviderSettings =>
  ({
    gemini: {
      isConfigured: true,
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
  });

const DEFAULT_REQUEST = createRequest();
const DEFAULT_SETTINGS = createSettings();

const reference = (
  id: string,
): GenerationPromptReferencePayload => ({
  id,
  label: "图片",
  enabled: true,
  elementCount: 1,
  textCount: 0,
});

const ControllerProbe = ({
  initialRequest = DEFAULT_REQUEST,
  providerSettings = DEFAULT_SETTINGS,
  open = true,
  onRequestChange,
}: {
  initialRequest?: GenerationRequest;
  providerSettings?: PublicProviderSettings | null;
  open?: boolean;
  onRequestChange?: (request: GenerationRequest) => void;
}) => {
  controller = useGenerateRequestController({
    initialRequest,
    providerSettings,
    open,
    onRequestChange,
  });

  return (
    <output data-testid="state">
      {JSON.stringify({
        request: controller.request,
        promptEditorParts: controller.promptEditorParts,
        promptEditorResetKey: controller.promptEditorResetKey,
        promptReferences: controller.promptReferencesRef.current,
      })}
    </output>
  );
};

const getState = () =>
  JSON.parse(screen.getByTestId("state").textContent ?? "{}") as {
    request: GenerationRequest;
    promptEditorParts: unknown[];
    promptEditorResetKey: number;
    promptReferences: GenerationPromptReferencePayload[];
  };

describe("useGenerateRequestController", () => {
  it("resets editor parts when the initial request changes", () => {
    const { rerender } = render(
      <ControllerProbe initialRequest={createRequest({ prompt: "初始" })} />,
    );

    expect(getState().promptEditorParts).toEqual([
      { type: "text", text: "初始" },
    ]);
    const previousResetKey = getState().promptEditorResetKey;

    rerender(
      <ControllerProbe
        initialRequest={createRequest({
          prompt: "新内容",
          promptParts: [{ type: "text", text: "已有 parts" }],
        })}
      />,
    );

    expect(getState().request.prompt).toBe("新内容");
    expect(getState().promptEditorParts).toEqual([
      { type: "text", text: "已有 parts" },
    ]);
    expect(getState().promptEditorResetKey).toBeGreaterThan(previousResetKey);
  });

  it("updates plain prompt text and clears inline references", () => {
    const onRequestChange = vi.fn();
    render(
      <ControllerProbe
        initialRequest={createRequest({
          promptReferences: [reference("old")],
        })}
        onRequestChange={onRequestChange}
      />,
    );

    act(() => {
      controller?.updatePrompt("新的提示词");
    });

    expect(getState().request).toMatchObject({
      prompt: "新的提示词",
      promptParts: [{ type: "text", text: "新的提示词" }],
      promptReferences: [],
    });
    expect(getState().promptReferences).toEqual([]);
    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ prompt: "新的提示词" }),
    );
  });

  it("filters stale references when prompt parts change", () => {
    render(
      <ControllerProbe
        initialRequest={createRequest({
          promptReferences: [reference("keep"), reference("drop")],
        })}
      />,
    );

    act(() => {
      controller?.updatePromptParts([
        { type: "text", text: "参考 " },
        { type: "reference", referenceId: "keep" },
      ]);
    });

    expect(getState().request.prompt).toBe("参考 ");
    expect(getState().request.promptReferences).toEqual([reference("keep")]);
    expect(getState().promptReferences).toEqual([reference("keep")]);
  });

  it("replaces prompt parts and resets the editor", () => {
    render(
      <ControllerProbe
        initialRequest={createRequest({
          promptReferences: [reference("keep"), reference("drop")],
        })}
      />,
    );
    const previousResetKey = getState().promptEditorResetKey;

    act(() => {
      controller?.replacePromptParts([
        { type: "reference", referenceId: "keep" },
        { type: "text", text: " 后续" },
      ]);
    });

    expect(getState().request).toMatchObject({
      prompt: " 后续",
      promptParts: [
        { type: "reference", referenceId: "keep" },
        { type: "text", text: " 后续" },
      ],
      promptReferences: [reference("keep")],
    });
    expect(getState().promptEditorResetKey).toBeGreaterThan(previousResetKey);
  });

  it("clears submitted prompt fields while keeping selected reference data", () => {
    render(
      <ControllerProbe
        initialRequest={createRequest({
          prompt: "提交后清空",
          promptParts: [{ type: "text", text: "提交后清空" }],
          promptReferences: [reference("old")],
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
          },
        })}
      />,
    );

    act(() => {
      controller?.clearSubmittedPrompt();
    });

    expect(getState().request).toMatchObject({
      prompt: "",
      promptParts: [],
      promptReferences: [],
      reference: {
        enabled: false,
        elementCount: 1,
        textCount: 0,
      },
    });
    expect(getState().promptEditorParts).toEqual([]);
    expect(getState().promptReferences).toEqual([]);
  });
});
