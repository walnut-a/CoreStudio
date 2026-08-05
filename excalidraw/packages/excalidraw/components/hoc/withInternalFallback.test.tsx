import React from "react";

import { Excalidraw, MainMenu } from "../../index";
import { t } from "../../i18n";
import { queryAllByTestId, render, waitFor } from "../../tests/test-utils";

describe("Test internal component fallback rendering", () => {
  it("gives the default main menu trigger an accessible name", async () => {
    const { container } = await render(<Excalidraw />);

    expect(
      queryAllByTestId(container, "main-menu-trigger")[0],
    ).toHaveAccessibleName(t("buttons.menu"));
  });

  it("should render only one menu per excalidraw instance (custom menu first scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
        <Excalidraw />
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per excalidraw instance (default menu first scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw />
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per excalidraw instance (two custom menus scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per excalidraw instance (two default menus scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw />
        <Excalidraw />
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should remove the fallback when a custom menu mounts later", async () => {
    const { container, rerender } = await render(<Excalidraw />);

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(1);

    rerender(
      <Excalidraw>
        <MainMenu>test</MainMenu>
      </Excalidraw>,
    );

    await waitFor(() => {
      expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(1);
    });
  });

  it("should restore the fallback when a custom menu unmounts", async () => {
    const { container, rerender } = await render(
      <Excalidraw>
        <MainMenu>test</MainMenu>
      </Excalidraw>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(1);

    rerender(<Excalidraw />);

    await waitFor(() => {
      expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(1);
    });
  });
});
