import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ImageAssetSidebar } from "./ImageAssetSidebar";

const records = [
  {
    id: "file-imported",
    fileId: "file-imported",
    title: "assembly-reference.png",
    sourceType: "imported" as const,
    timeLabel: "07/24 12:00",
    sourceLabel: "导入",
    providerLabel: null,
    sizeLabel: "512 × 512 px",
    statusLabels: ["画布中"],
    searchText: "assembly-reference.png file-imported",
  },
  {
    id: "file-reference",
    fileId: "file-reference",
    title: "参考方案",
    sourceType: "generated" as const,
    timeLabel: "07/24 11:00",
    sourceLabel: "Codex",
    providerLabel: null,
    sizeLabel: "512 × 512 px",
    statusLabels: ["参考图"],
    searchText: "参考方案 file-reference",
  },
];

const createRecords = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `file-${index}`,
    fileId: `file-${index}`,
    title: `图片 ${index}`,
    sourceType: index % 2 ? ("generated" as const) : ("imported" as const),
    timeLabel: "07/24 12:00",
    sourceLabel: index % 2 ? "Codex" : "导入",
    providerLabel: null,
    sizeLabel: "512 × 512 px",
    statusLabels: ["画布中"],
    searchText: `图片 ${index} file-${index}`,
  }));

describe("ImageAssetSidebar", () => {
  it("renders image assets and uses the image asset title", () => {
    render(
      <ImageAssetSidebar
        open={true}
        onOpenChange={vi.fn()}
        records={records}
      />,
    );

    expect(screen.getByText("图片资产")).toBeInTheDocument();
    const list = screen.getByLabelText("图片资产列表");
    expect(
      within(list).getByText("assembly-reference.png"),
    ).toBeInTheDocument();
    expect(within(list).getByText(/画布中/)).toBeInTheDocument();
    expect(within(list).getByText(/参考图/)).toBeInTheDocument();
  });

  it("filters imported and generated assets with segmented controls", () => {
    render(
      <ImageAssetSidebar
        open={true}
        onOpenChange={vi.fn()}
        records={records}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "生成" }));
    expect(
      screen.queryByText("assembly-reference.png"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("参考方案")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "导入" }));
    expect(screen.getByText("assembly-reference.png")).toBeInTheDocument();
    expect(screen.queryByText("参考方案")).not.toBeInTheDocument();
  });

  it("searches readable metadata and exact ids without showing ids in rows", () => {
    render(
      <ImageAssetSidebar
        open={true}
        onOpenChange={vi.fn()}
        records={records}
      />,
    );

    expect(screen.queryByText("file-imported")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "搜索图片资产" }), {
      target: { value: "file-imported" },
    });
    expect(screen.getByText("assembly-reference.png")).toBeInTheDocument();
    expect(screen.queryByText("参考方案")).not.toBeInTheDocument();
  });

  it("reports selected asset file ids", () => {
    const onSelectRecord = vi.fn();
    render(
      <ImageAssetSidebar
        open={true}
        onOpenChange={vi.fn()}
        records={records}
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
    };
    const { rerender } = render(<ImageAssetSidebar {...props} open={true} />);
    const list = screen.getByLabelText("图片资产列表");
    list.scrollTop = 6_000;
    fireEvent.scroll(list);

    rerender(<ImageAssetSidebar {...props} open={false} />);
    rerender(<ImageAssetSidebar {...props} open={true} />);

    expect(screen.getByLabelText("图片资产列表").scrollTop).toBe(5_632);
    expect(screen.getByText("图片 99")).toBeInTheDocument();
  });

  it("clamps the virtual scroll position when filtering shrinks the list", () => {
    const props = {
      open: true,
      onOpenChange: vi.fn(),
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
