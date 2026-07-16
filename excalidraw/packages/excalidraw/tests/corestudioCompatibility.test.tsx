import { queryByTestId } from "@testing-library/react";
import React from "react";

import { MIME_TYPES } from "@excalidraw/common";

import type { FileId } from "@excalidraw/element/types";

import { Excalidraw } from "../index";

import type { BinaryFileData, DataURL } from "../types";

import { API } from "./helpers/api";
import { act, render, waitFor } from "./test-utils";

const { h } = window;

describe("CoreStudio Excalidraw compatibility", () => {
  it("hides the default sidebar when defaultSidebar is false", async () => {
    const { container } = await render(
      <Excalidraw UIOptions={{ defaultSidebar: false }} />,
    );

    expect(container.querySelector(".default-sidebar-trigger")).toBeNull();
    expect(container.querySelector(".sidebar")).toBeNull();
  });

  it("renders selected shape actions through the host callback", async () => {
    const { container } = await render(
      <Excalidraw
        renderSelectedShapeActions={({
          selectedShapeActions,
          shouldRenderSelectedShapeActions,
        }) => (
          <div data-testid="selected-shape-actions-host">
            {shouldRenderSelectedShapeActions ? "selected" : "idle"}
            {selectedShapeActions ? "-actions" : "-empty"}
          </div>
        )}
      />,
    );

    expect(
      queryByTestId(container, "selected-shape-actions-host"),
    ).toHaveTextContent("idle-empty");

    const rectangle = API.createElement({ type: "rectangle" });
    API.updateScene({ elements: [rectangle] });
    API.setSelectedElements([rectangle]);

    await waitFor(() => {
      expect(
        queryByTestId(container, "selected-shape-actions-host"),
      ).toHaveTextContent("selected-actions");
    });
  });

  it("replaces existing files through the imperative API", async () => {
    await render(<Excalidraw />);

    const fileId = "corestudio-file" as FileId;
    const originalFile: BinaryFileData = {
      id: fileId,
      mimeType: MIME_TYPES.png,
      dataURL: "data:image/png;base64,original" as DataURL,
      created: 1,
    };
    const replacementFile: BinaryFileData = {
      ...originalFile,
      dataURL: "data:image/png;base64,replacement" as DataURL,
      created: 2,
    };

    act(() => {
      h.app.api.addFiles([originalFile]);
      h.app.api.replaceFiles([replacementFile]);
    });

    expect(h.app.api.getFiles()[fileId]).toEqual(replacementFile);
  });

  it("keeps scrollToContent available through the imperative API", async () => {
    await render(<Excalidraw />);

    h.state.width = 10;
    h.state.height = 10;

    const largeElement = API.createElement({
      type: "rectangle",
      width: 1000,
      height: 1000,
    });

    act(() => {
      h.app.api.scrollToContent(largeElement, { fitToContent: true });
    });

    expect(h.state.zoom.value).toBeCloseTo(0.01);
  });
});
