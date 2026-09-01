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

const createRecords = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `file-${index}`,
    fileId: `file-${index}`,
    title: `图片 ${index}`,
    meta: "07/24 12:00 · 导入 · 512 × 512",
    relationshipLabels: ["画布中"],
  }));

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

  it("renders only a bounded visible window for large asset collections", () => {
    render(
      <ImageAssetSidebar
        open={true}
        onOpenChange={vi.fn()}
        records={createRecords(1_000)}
        generatedOnly={false}
        onGeneratedOnlyChange={vi.fn()}
      />,
    );

    const list = screen.getByLabelText("图片资产列表");
    expect(within(list).getAllByRole("button")).toHaveLength(18);
    expect(within(list).getByText("图片 0")).toBeInTheDocument();
    expect(within(list).queryByText("图片 999")).not.toBeInTheDocument();
  });

  it("reports the current visible thumbnail batch", () => {
    const onVisibleFileIdsChange = vi.fn();
    render(
      <ImageAssetSidebar
        open={true}
        onOpenChange={vi.fn()}
        records={createRecords(100)}
        generatedOnly={false}
        onGeneratedOnlyChange={vi.fn()}
        onVisibleFileIdsChange={onVisibleFileIdsChange}
      />,
    );

    expect(onVisibleFileIdsChange).toHaveBeenLastCalledWith(
      Array.from({ length: 18 }, (_, index) => `file-${index}`),
    );
  });

  it("restores the virtual scroll position after closing and reopening", () => {
    const props = {
      onOpenChange: vi.fn(),
      records: createRecords(100),
      generatedOnly: false,
      onGeneratedOnlyChange: vi.fn(),
    };
    const { rerender } = render(
      <ImageAssetSidebar {...props} open={true} />,
    );
    const list = screen.getByLabelText("图片资产列表");
    list.scrollTop = 4_000;
    fireEvent.scroll(list);

    rerender(<ImageAssetSidebar {...props} open={false} />);
    rerender(<ImageAssetSidebar {...props} open={true} />);

    expect(screen.getByLabelText("图片资产列表").scrollTop).toBe(4_000);
    expect(screen.getByText("图片 99")).toBeInTheDocument();
  });

  it("clamps the virtual scroll position when filtering shrinks the list", () => {
    const props = {
      open: true,
      onOpenChange: vi.fn(),
      generatedOnly: false,
      onGeneratedOnlyChange: vi.fn(),
    };
    const { rerender } = render(
      <ImageAssetSidebar {...props} records={createRecords(100)} />,
    );
    const list = screen.getByLabelText("图片资产列表");
    list.scrollTop = 4_000;
    fireEvent.scroll(list);

    rerender(<ImageAssetSidebar {...props} records={createRecords(2)} />);

    expect(screen.getByLabelText("图片资产列表").scrollTop).toBe(0);
    expect(screen.getByText("图片 0")).toBeInTheDocument();
    expect(screen.getByText("图片 1")).toBeInTheDocument();
  });
});
