import React from "react";
import { screen } from "@testing-library/react";

import {
  DEFAULT_SIDEBAR,
  LIBRARY_SIDEBAR_TAB,
} from "@excalidraw/common";

import { DefaultSidebar, Excalidraw, Sidebar } from "../index";
import {
  fireEvent,
  render,
  waitFor,
  withExcalidrawDimensions,
} from "../tests/test-utils";

import {
  assertExcalidrawWithSidebar,
  assertSidebarDockButton,
} from "./Sidebar/siderbar.test.helpers";

const { h } = window;

describe("DefaultSidebar", () => {
  it("can hide the built-in library tab and recover from library as the active tab", async () => {
    await render(
      <Excalidraw
        initialData={{
          appState: {
            openSidebar: {
              name: DEFAULT_SIDEBAR.name,
              tab: LIBRARY_SIDEBAR_TAB,
            },
          },
        }}
      >
        <DefaultSidebar
          showLibrary={false}
          libraryFallbackTab="image-board-image-info"
        >
          <DefaultSidebar.TabTriggers>
            <Sidebar.TabTrigger
              tab="image-board-image-info"
              aria-label="图片信息"
            >
              图片信息
            </Sidebar.TabTrigger>
          </DefaultSidebar.TabTriggers>
          <Sidebar.Tab tab="image-board-image-info">
            <div>图片信息内容</div>
          </Sidebar.Tab>
        </DefaultSidebar>
      </Excalidraw>,
    );

    await waitFor(() => {
      expect(h.state.openSidebar?.tab).toBe("image-board-image-info");
    });

    expect(screen.queryByRole("button", { name: "素材库" })).toBeNull();
    expect(screen.getByText("图片信息内容")).toBeInTheDocument();
  });

  it("when `docked={undefined}` & `onDock={undefined}`, should allow docking", async () => {
    await assertExcalidrawWithSidebar(
      <DefaultSidebar />,
      DEFAULT_SIDEBAR.name,
      async () => {
        expect(h.state.defaultSidebarDockedPreference).toBe(false);

        const { dockButton } = await assertSidebarDockButton(true);

        fireEvent.click(dockButton);
        await waitFor(() => {
          expect(h.state.defaultSidebarDockedPreference).toBe(true);
          expect(dockButton).toHaveClass("selected");
        });

        fireEvent.click(dockButton);
        await waitFor(() => {
          expect(h.state.defaultSidebarDockedPreference).toBe(false);
          expect(dockButton).not.toHaveClass("selected");
        });
      },
    );
  });

  it("when `docked={undefined}` & `onDock`, should allow docking", async () => {
    await assertExcalidrawWithSidebar(
      <DefaultSidebar onDock={() => {}} />,
      DEFAULT_SIDEBAR.name,
      async () => {
        expect(h.state.defaultSidebarDockedPreference).toBe(false);

        const { dockButton } = await assertSidebarDockButton(true);

        fireEvent.click(dockButton);
        await waitFor(() => {
          expect(h.state.defaultSidebarDockedPreference).toBe(true);
          expect(dockButton).toHaveClass("selected");
        });

        fireEvent.click(dockButton);
        await waitFor(() => {
          expect(h.state.defaultSidebarDockedPreference).toBe(false);
          expect(dockButton).not.toHaveClass("selected");
        });
      },
    );
  });

  it("when `docked={true}` & `onDock`, should allow docking", async () => {
    await assertExcalidrawWithSidebar(
      <DefaultSidebar onDock={() => {}} />,
      DEFAULT_SIDEBAR.name,
      async () => {
        expect(h.state.defaultSidebarDockedPreference).toBe(false);

        const { dockButton } = await assertSidebarDockButton(true);

        fireEvent.click(dockButton);
        await waitFor(() => {
          expect(h.state.defaultSidebarDockedPreference).toBe(true);
          expect(dockButton).toHaveClass("selected");
        });

        fireEvent.click(dockButton);
        await waitFor(() => {
          expect(h.state.defaultSidebarDockedPreference).toBe(false);
          expect(dockButton).not.toHaveClass("selected");
        });
      },
    );
  });

  it("when `onDock={false}`, should disable docking", async () => {
    await assertExcalidrawWithSidebar(
      <DefaultSidebar onDock={false} />,
      DEFAULT_SIDEBAR.name,
      async () => {
        await withExcalidrawDimensions(
          { width: 1920, height: 1080 },
          async () => {
            expect(h.state.defaultSidebarDockedPreference).toBe(false);

            await assertSidebarDockButton(false);
          },
        );
      },
    );
  });

  it("when `docked={true}` & `onDock={false}`, should force-dock sidebar", async () => {
    await assertExcalidrawWithSidebar(
      <DefaultSidebar docked onDock={false} />,
      DEFAULT_SIDEBAR.name,
      async () => {
        expect(h.state.defaultSidebarDockedPreference).toBe(false);

        const { sidebar } = await assertSidebarDockButton(false);
        expect(sidebar).toHaveClass("sidebar--docked");
      },
    );
  });

  it("when `docked={true}` & `onDock={undefined}`, should force-dock sidebar", async () => {
    await assertExcalidrawWithSidebar(
      <DefaultSidebar docked />,
      DEFAULT_SIDEBAR.name,
      async () => {
        expect(h.state.defaultSidebarDockedPreference).toBe(false);

        const { sidebar } = await assertSidebarDockButton(false);
        expect(sidebar).toHaveClass("sidebar--docked");
      },
    );
  });

  it("when `docked={false}` & `onDock={undefined}`, should force-undock sidebar", async () => {
    await assertExcalidrawWithSidebar(
      <DefaultSidebar docked={false} />,
      DEFAULT_SIDEBAR.name,
      async () => {
        expect(h.state.defaultSidebarDockedPreference).toBe(false);

        const { sidebar } = await assertSidebarDockButton(false);
        expect(sidebar).not.toHaveClass("sidebar--docked");
      },
    );
  });
});
