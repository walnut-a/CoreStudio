import { fireEvent, queryByTestId, queryByText } from "@testing-library/react";
import React from "react";

import { KEYS, MIME_TYPES } from "@excalidraw/common";

import type { FileId } from "@excalidraw/element/types";

import { Excalidraw } from "../index";

import type {
  BinaryFileData,
  Collaborator,
  DataURL,
  SocketId,
} from "../types";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
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

  it("does not expose disabled canvas utilities through shortcuts or help", async () => {
    await render(
      <Excalidraw
        UIOptions={{
          defaultSidebar: false,
          canvasActions: {
            clearCanvas: false,
            saveAsImage: false,
          },
        }}
        handleKeyboardGlobally
      />,
    );

    Keyboard.withModifierKeys({ ctrl: true }, () => {
      Keyboard.keyDown("f");
    });
    expect(h.state.openSidebar).toBeNull();

    Keyboard.withModifierKeys({ ctrl: true, shift: true }, () => {
      Keyboard.keyDown("e");
    });
    expect(h.state.openDialog).toBeNull();

    Keyboard.withModifierKeys({ ctrl: true }, () => {
      Keyboard.keyDown(KEYS.DELETE);
    });
    expect(document.querySelector(".confirm-dialog")).toBeNull();

    Keyboard.keyDown(KEYS.QUESTION_MARK);
    expect(queryByText(document.body, "Find on canvas")).toBeNull();
    expect(queryByText(document.body, "Reset the canvas")).toBeNull();
  });

  it("renders selected shape actions through the host callback", async () => {
    const { container } = await render(
      <Excalidraw
        renderSelectedShapeActions={({
          fullSelectedShapeActions,
          selectedShapeActions,
          shouldRenderSelectedShapeActions,
        }) => (
          <div data-testid="selected-shape-actions-host">
            {shouldRenderSelectedShapeActions ? "selected" : "idle"}
            {selectedShapeActions ? "-actions" : "-empty"}
            {fullSelectedShapeActions ? "-full" : "-no-full"}
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
      ).toHaveTextContent("selected-actions-full");
    });
  });

  it("can render a collaborator as presence-only without enabling follow mode", async () => {
    const { container } = await render(<Excalidraw />);
    const followIntentSpy = vi.spyOn(h.app, "emitUserFollowIntent");
    const socketId = "presence-only-agent" as SocketId;
    const collaborator: Collaborator & { canFollow: boolean } = {
      id: "codex:thread-1",
      socketId,
      username: "工业设计探索",
      canFollow: false,
    };

    act(() => {
      h.app.updateScene({
        collaborators: new Map([[socketId, collaborator]]),
      });
    });

    const collaboratorAvatar = await waitFor(() => {
      const element = container.querySelector(
        ".UserList__collaborator .Avatar",
      );
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    fireEvent.click(collaboratorAvatar);

    expect(h.app.props.userToFollow).toBeUndefined();
    expect(followIntentSpy).not.toHaveBeenCalled();
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

  it("does not expose the legacy scrollToContent imperative API", async () => {
    await render(<Excalidraw />);

    expect(h.app.api).not.toHaveProperty("scrollToContent");
    expect(h.app.api).toHaveProperty("setViewport");
  });
});
