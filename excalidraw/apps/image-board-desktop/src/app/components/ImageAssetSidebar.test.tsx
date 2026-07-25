import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ImageAssetSidebar } from "./ImageAssetSidebar";

const records = [
  {
    id: "file-imported",
    fileId: "file-imported",
    title: "导入图片",
    meta: "07/24 12:00 · 导入 · 512 × 512",
    relationshipLabels: ["画布中"],
  },
  {
    id: "file-reference",
    fileId: "file-reference",
    title: "参考方案",
    meta: "07/24 11:00 · Codex · 512 × 512",
    relationshipLabels: ["参考图"],
  },
];

describe("ImageAssetSidebar", () => {
  it("renders image assets and uses the image asset title", () => {
    render(
      <ImageAssetSidebar
        open={true}
        onOpenChange={vi.fn()}
        records={records}
        generatedOnly={false}
        onGeneratedOnlyChange={vi.fn()}
      />,
    );

    expect(screen.getByText("图片资产")).toBeInTheDocument();
    const list = screen.getByLabelText("图片资产列表");
    expect(within(list).getByText("导入图片")).toBeInTheDocument();
    expect(within(list).getByText(/画布中/)).toBeInTheDocument();
    expect(within(list).getByText(/参考图/)).toBeInTheDocument();
  });

  it("reports generated-only filter changes", () => {
    const onGeneratedOnlyChange = vi.fn();
    render(
      <ImageAssetSidebar
        open={true}
        onOpenChange={vi.fn()}
        records={records}
        generatedOnly={false}
        onGeneratedOnlyChange={onGeneratedOnlyChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "仅查看生成内容" }));

    expect(onGeneratedOnlyChange).toHaveBeenCalledWith(true);
  });

  it("reports selected asset file ids", () => {
    const onSelectRecord = vi.fn();
    render(
      <ImageAssetSidebar
        open={true}
        onOpenChange={vi.fn()}
        records={records}
        generatedOnly={false}
        onGeneratedOnlyChange={vi.fn()}
        onSelectRecord={onSelectRecord}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /参考方案/ }));

    expect(onSelectRecord).toHaveBeenCalledWith("file-reference");
  });
});
