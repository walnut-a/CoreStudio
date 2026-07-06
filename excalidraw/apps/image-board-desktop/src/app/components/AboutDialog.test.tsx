import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { copy } from "../copy";
import { AboutDialog } from "./AboutDialog";

describe("AboutDialog", () => {
  it("does not render while closed", () => {
    render(
      <AboutDialog
        open={false}
        appInfo={{ name: "CoreStudio", version: "9.8.7" }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders product copy and the current version", () => {
    render(
      <AboutDialog
        open={true}
        appInfo={{ name: "CoreStudio", version: "9.8.7" }}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: copy.about.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.about.description)).toBeInTheDocument();
    expect(screen.getByText("版本 9.8.7")).toBeInTheDocument();
  });

  it("uses the unknown version fallback and forwards close", () => {
    const onClose = vi.fn();

    render(<AboutDialog open={true} appInfo={null} onClose={onClose} />);

    expect(screen.getByText("版本 未知")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: copy.about.closeLabel }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
