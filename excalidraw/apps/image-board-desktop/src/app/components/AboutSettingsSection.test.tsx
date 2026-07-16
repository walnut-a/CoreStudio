import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AboutSettingsSection } from "./AboutSettingsSection";

describe("AboutSettingsSection", () => {
  it("显示应用版本、仓库地址和开源依赖版本", () => {
    render(
      <AboutSettingsSection
        appInfo={{ name: "CoreStudio", version: "9.8.7" }}
        repositoryUrl="https://github.com/walnut-a/CoreStudio"
        dependencies={[
          {
            name: "Excalidraw",
            version: "0.18.0 · baseline 5ca08343",
          },
          { name: "React", version: "19.0.0" },
        ]}
        onOpenExternal={vi.fn()}
      />,
    );

    expect(screen.getByText("9.8.7")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "https://github.com/walnut-a/CoreStudio",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Excalidraw")).toBeInTheDocument();
    expect(screen.getByText("0.18.0 · baseline 5ca08343")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("19.0.0")).toBeInTheDocument();
  });

  it("通过宿主打开仓库地址", () => {
    const onOpenExternal = vi.fn();

    render(
      <AboutSettingsSection
        appInfo={null}
        repositoryUrl="https://github.com/walnut-a/CoreStudio"
        dependencies={[]}
        onOpenExternal={onOpenExternal}
      />,
    );

    screen
      .getByRole("button", {
        name: "https://github.com/walnut-a/CoreStudio",
      })
      .click();

    expect(onOpenExternal).toHaveBeenCalledWith(
      "https://github.com/walnut-a/CoreStudio",
    );
    expect(screen.getByText("未知")).toBeInTheDocument();
  });
});
