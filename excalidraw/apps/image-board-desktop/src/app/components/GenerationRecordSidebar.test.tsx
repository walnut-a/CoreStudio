import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  GenerationRecordSidebar,
  type GenerationRecordListItem,
} from "./GenerationRecordSidebar";

const records: GenerationRecordListItem[] = [
  {
    id: "record-1",
    fileId: "file-1",
    title: "苹果风 CNC",
    meta: "06/29 15:20 · ZenMux · 1024 × 1024",
    statusLabel: "已上画板",
    thumbnailDataUrl: "data:image/png;base64,abc",
  },
  {
    id: "record-2",
    fileId: "file-2",
    title: "科技纹理",
    meta: "06/30 04:20 · CoreStudio",
  },
];

describe("GenerationRecordSidebar", () => {
  it("renders generation records with thumbnails and metadata", () => {
    const { container } = render(<GenerationRecordSidebar records={records} />);

    const list = screen.getByLabelText("生成任务列表");
    expect(within(list).getByText("苹果风 CNC")).toBeInTheDocument();
    expect(
      within(list).getByText("06/29 15:20 · ZenMux · 1024 × 1024 · 已上画板"),
    ).toBeInTheDocument();
    expect(within(list).getByText("科技纹理")).toBeInTheDocument();
    expect(
      container.querySelector(".generation-record-sidebar__item img"),
    ).toHaveAttribute("src", "data:image/png;base64,abc");
  });

  it("reports selected record file ids", () => {
    const onSelectRecord = vi.fn();

    render(
      <GenerationRecordSidebar
        records={records}
        onSelectRecord={onSelectRecord}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /科技纹理/ }));

    expect(onSelectRecord).toHaveBeenCalledWith("file-2");
  });

  it("disables records when no locate callback is available", () => {
    render(<GenerationRecordSidebar records={records} />);

    expect(screen.getByRole("button", { name: /苹果风 CNC/ })).toBeDisabled();
  });

  it("renders quietly when there are no records", () => {
    render(<GenerationRecordSidebar records={[]} />);

    expect(screen.queryByLabelText("生成任务列表")).toBeNull();
  });
});
