import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GeneratePromptLibrary } from "./GeneratePromptLibrary";
import { copy } from "../copy";
import type { SavedPrompt } from "../../shared/desktopBridgeTypes";

const savedPrompts: SavedPrompt[] = [
  {
    id: "prompt-1",
    title: "苹果风 CNC",
    content: "极简、铝合金、圆角",
    tags: ["工业设计", "apple"],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    useCount: 2,
  },
  {
    id: "prompt-2",
    title: "科技纹理",
    content: "深色、细密纹理、发光边缘",
    tags: ["texture"],
    createdAt: "2026-06-02T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z",
    useCount: 0,
  },
];

const renderLibrary = (
  overrides: Partial<Parameters<typeof GeneratePromptLibrary>[0]> = {},
) => {
  const props: Parameters<typeof GeneratePromptLibrary>[0] = {
    savedPrompts,
    search: "",
    currentContent: "当前 prompt",
    canSaveCurrent: true,
    onSearchChange: vi.fn(),
    onSaveCurrent: vi.fn(),
    onApplyPrompt: vi.fn(),
    onDeletePrompt: vi.fn(),
    onTextInputKeyDown: vi.fn(),
    onStopInputEvent: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<GeneratePromptLibrary {...props} />),
  };
};

describe("GeneratePromptLibrary", () => {
  it("renders saved prompts and their tags", () => {
    renderLibrary();

    expect(
      screen.getByText(copy.generateDialog.promptLibrary),
    ).toBeInTheDocument();
    expect(screen.getByText("苹果风 CNC")).toBeInTheDocument();
    expect(screen.getByText("极简、铝合金、圆角")).toBeInTheDocument();
    expect(screen.getByText("工业设计 / apple")).toBeInTheDocument();
    expect(screen.getByText("科技纹理")).toBeInTheDocument();
  });

  it("filters prompts by title content or tag", () => {
    renderLibrary({ search: "texture" });

    expect(screen.queryByText("苹果风 CNC")).toBeNull();
    expect(screen.getByText("科技纹理")).toBeInTheDocument();
  });

  it("reports search and save actions", () => {
    const onSearchChange = vi.fn();
    const onSaveCurrent = vi.fn();

    renderLibrary({
      onSearchChange,
      onSaveCurrent,
    });

    fireEvent.change(
      screen.getByPlaceholderText(copy.generateDialog.promptLibrarySearch),
      {
        target: { value: "apple" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: copy.generateDialog.promptLibrarySaveCurrent,
      }),
    );

    expect(onSearchChange).toHaveBeenCalledWith("apple");
    expect(onSaveCurrent).toHaveBeenCalledWith(expect.any(Object));
  });

  it("disables saving when there is no current content", () => {
    renderLibrary({ currentContent: "" });

    expect(
      screen.getByRole("button", {
        name: copy.generateDialog.promptLibrarySaveCurrent,
      }),
    ).toBeDisabled();
  });

  it("reports replace append and delete prompt actions", () => {
    const onApplyPrompt = vi.fn();
    const onDeletePrompt = vi.fn();

    renderLibrary({
      onApplyPrompt,
      onDeletePrompt,
    });

    const prompt = screen.getByText("苹果风 CNC").closest("article");
    expect(prompt).not.toBeNull();
    const promptActions = within(prompt as HTMLElement);

    fireEvent.click(
      promptActions.getByRole("button", { name: "替换：苹果风 CNC" }),
    );
    fireEvent.click(
      promptActions.getByRole("button", { name: "追加：苹果风 CNC" }),
    );
    fireEvent.click(
      promptActions.getByRole("button", { name: "删除：苹果风 CNC" }),
    );

    expect(onApplyPrompt).toHaveBeenNthCalledWith(
      1,
      savedPrompts[0],
      "replace",
      expect.any(Object),
    );
    expect(onApplyPrompt).toHaveBeenNthCalledWith(
      2,
      savedPrompts[0],
      "append",
      expect.any(Object),
    );
    expect(onDeletePrompt).toHaveBeenCalledWith(
      savedPrompts[0],
      expect.any(Object),
    );
  });

  it("renders the empty copy when there are no saved prompts", () => {
    renderLibrary({ savedPrompts: [] });

    expect(
      screen.getByText(copy.generateDialog.promptLibraryEmpty),
    ).toBeInTheDocument();
  });

  it("renders the no result copy when search filters everything", () => {
    renderLibrary({ search: "不存在" });

    expect(
      screen.getByText(copy.generateDialog.promptLibraryNoResults),
    ).toBeInTheDocument();
  });
});
