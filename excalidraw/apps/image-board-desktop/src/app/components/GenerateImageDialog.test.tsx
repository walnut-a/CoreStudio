import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getDefaultModel } from "../../shared/providerCatalog";

import { GenerateImageDialog } from "./GenerateImageDialog";

import type { ComponentProps } from "react";
import type { PublicProviderSettings } from "../../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../../shared/providerTypes";
import { copy, setActiveDesktopLocale } from "../copy";

const providerSettings: PublicProviderSettings = {
  gemini: {
    defaultModel: getDefaultModel("gemini"),
    isConfigured: true,
    lastStatus: "success",
    lastCheckedAt: "2026-04-12T08:00:00.000Z",
    lastError: null,
  },
  zenmux: {
    defaultModel: getDefaultModel("zenmux"),
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  fal: {
    defaultModel: getDefaultModel("fal"),
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  jimeng: {
    defaultModel: getDefaultModel("jimeng"),
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openai: {
    defaultModel: getDefaultModel("openai"),
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openrouter: {
    defaultModel: getDefaultModel("openrouter"),
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
};

afterEach(() => {
  cleanup();
  setActiveDesktopLocale("zh-CN");
});

const initialRequest = {
  provider: "gemini" as const,
  model: getDefaultModel("gemini"),
  prompt: "细化桌面 CNC 外壳",
  width: 1024,
  height: 1024,
  imageCount: 1,
};

const renderDialog = async ({
  initialRequest: request,
  ...overrides
}: Omit<
  Partial<ComponentProps<typeof GenerateImageDialog>>,
  "initialRequest"
> & { initialRequest?: Partial<GenerationRequest> } = {}) => {
  const onSubmit = vi.fn();
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(
      <GenerateImageDialog
        open
        initialRequest={{ ...initialRequest, ...request }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        {...overrides}
      />,
    );
  });
  return { onSubmit, ...view };
};

describe("GenerateImageDialog user flow", () => {
  it("selects a custom model, edits its supported settings and submits the normalized request", async () => {
    const onModelSelectionChange = vi.fn();
    const onClose = vi.fn();
    const { onSubmit } = await renderDialog({
      onModelSelectionChange,
      onClose,
      persistent: true,
      providerSettings: {
        ...providerSettings,
        fal: {
          ...providerSettings.fal,
          isConfigured: true,
          customModels: [
            {
              id: "custom-cnc",
              label: "CNC",
              capabilityTemplate: "seeded-exact",
            },
          ],
        },
      },
    });
    expect(screen.queryByLabelText(copy.generateDialog.provider)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /展开设置/ }));
    fireEvent.change(screen.getByLabelText(copy.generateDialog.provider), {
      target: { value: "fal" },
    });
    expect(screen.getByLabelText(copy.generateDialog.model)).toHaveValue(
      getDefaultModel("fal"),
    );
    fireEvent.change(screen.getByLabelText(copy.generateDialog.model), {
      target: { value: "custom-cnc" },
    });
    expect(onModelSelectionChange).toHaveBeenLastCalledWith({
      provider: "fal",
      model: "custom-cnc",
    });
    for (const [label, value] of [
      [copy.generateDialog.width, "1280"],
      [copy.generateDialog.height, "960"],
      [copy.generateDialog.seed, "42"],
      [copy.generateDialog.imageCount, "3"],
    ]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    expect(
      screen.queryByLabelText(copy.generateDialog.negativePrompt),
    ).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByLabelText(copy.generateDialog.width)).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /展开设置/ }));
    expect(screen.getByLabelText(copy.generateDialog.width)).toHaveValue(1280);
    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        provider: "fal",
        model: "custom-cnc",
        prompt: initialRequest.prompt,
        width: 1280,
        height: 960,
        seed: 42,
        imageCount: 3,
      }),
      false,
    );
  });

  it.each([
    {
      name: "empty prompt",
      request: { ...initialRequest, prompt: "" },
      settings: providerSettings,
    },
    { name: "unconfigured provider", request: initialRequest, settings: {} },
    {
      name: "too many confirmed references",
      request: {
        ...initialRequest,
        model: "gemini-2.5-flash-image",
        promptReferences: Array.from({ length: 4 }, (_, index) => ({
          id: `ref-${index}`,
          label: `图片 ${index}`,
          enabled: true,
          elementCount: 1,
          textCount: 0,
        })),
      },
      settings: providerSettings,
    },
  ])(
    "blocks both button and form submission with $name",
    async ({ request, settings }) => {
      const { onSubmit, container } = await renderDialog({
        initialRequest: request,
        providerSettings: settings,
      });
      expect(screen.getByRole("button", { name: "开始生成" })).toBeDisabled();
      fireEvent.keyDown(screen.getByLabelText("提示词"), { key: "Enter" });
      fireEvent.submit(container.querySelector("form")!);
      expect(onSubmit).not.toHaveBeenCalled();
      if ("promptReferences" in request) {
        expect(screen.getByRole("status")).toHaveTextContent(/3/);
      }
    },
  );

  it("confirms a pending reference into the inline prompt on focus", async () => {
    const onSubmit = vi.fn();
    const onReferenceRemove = vi.fn();
    const onReferenceCommit = vi.fn(async () => ({
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image" as const,
          label: "图片",
          thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
        },
      ],
      image: {
        mimeType: "image/png",
        dataBase64: Buffer.from("confirmed").toString("base64"),
      },
    }));

    await renderDialog({
      initialRequest: {
        prompt: "参考这张",
        negativePrompt: "",
        seed: null,
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
          items: [
            {
              id: "image-1",
              index: 1,
              kind: "image",
              label: "图片",
              thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
            },
          ],
        },
      },
      onReferenceRemove,
      onReferenceCommit,
      onSubmit,
    });

    const promptInput = screen.getByLabelText("提示词");
    expect(await screen.findByLabelText("1 图片，待确认")).toBeInTheDocument();

    fireEvent.focus(promptInput);

    await waitFor(() => expect(onReferenceCommit).toHaveBeenCalledTimes(1));
    expect(onReferenceRemove).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-pending-reference]")).toBeNull();
    expect(screen.getByText("1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: null,
        promptReferences: [
          expect.objectContaining({
            label: "图片",
            image: {
              mimeType: "image/png",
              dataBase64: Buffer.from("confirmed").toString("base64"),
            },
          }),
        ],
      }),
      false,
    );
  });
});
