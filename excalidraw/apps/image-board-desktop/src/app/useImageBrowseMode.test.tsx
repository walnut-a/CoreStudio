import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useImageBrowseMode } from "./useImageBrowseMode";

const setup = () => {
  const updateScene = vi.fn();
  const setViewport = vi.fn();
  const api = {
    getAppState: () => ({
      selectedElementIds: { kept: true, removed: true },
      selectedGroupIds: { group: true },
      editingGroupId: "group",
    }),
    getSceneElements: () => [
      { id: "kept", isDeleted: false, groupIds: ["group"] },
      {
        id: "target",
        type: "image",
        fileId: "photo",
        isDeleted: false,
        groupIds: [],
      },
      {
        id: "duplicate",
        type: "image",
        fileId: "photo",
        isDeleted: false,
        groupIds: [],
      },
    ],
    updateScene,
    setViewport,
  } as unknown as ExcalidrawImperativeAPI;
  return { apiRef: { current: api }, updateScene, setViewport };
};

describe("useImageBrowseMode", () => {
  it("returns to the canvas and selects one matching image after editing is enabled", async () => {
    const { apiRef, updateScene, setViewport } = setup();
    const { result } = renderHook(() => useImageBrowseMode("a", apiRef));
    act(() => result.current.changeMode(true));
    act(() => result.current.locateImage("photo"));
    expect(result.current.browsing).toBe(false);
    expect(setViewport).not.toHaveBeenCalled();
    await act(async () => {
      await Promise.resolve();
    });
    expect(updateScene).toHaveBeenCalledOnce();
    expect(updateScene.mock.calls[0][0].appState).toEqual({
      selectedElementIds: { target: true },
      selectedGroupIds: {},
      editingGroupId: null,
    });
    expect(setViewport).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ id: "target" }),
        fit: "scale-down",
      }),
    );
  });

  it("cancels pending location on project changes and never navigates to a missing image", async () => {
    const { apiRef, setViewport } = setup();
    const { result, rerender } = renderHook(
      ({ path }) => useImageBrowseMode(path, apiRef),
      { initialProps: { path: "a" } },
    );
    act(() => result.current.changeMode(true));
    act(() => result.current.locateImage("photo"));
    rerender({ path: "b" });
    await act(async () => {
      await Promise.resolve();
    });
    expect(setViewport).not.toHaveBeenCalled();
    act(() => result.current.changeMode(true));
    act(() => result.current.locateImage("removed"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(setViewport).not.toHaveBeenCalled();
  });

  it("restores the selection after the base editor clears it, excluding deleted elements", async () => {
    const { apiRef, updateScene } = setup();
    const { result } = renderHook(() => useImageBrowseMode("a", apiRef));
    act(() => result.current.changeMode(true));
    expect(result.current.browsing).toBe(true);
    expect(updateScene).not.toHaveBeenCalled();
    act(() => result.current.changeMode(false));
    expect(updateScene).not.toHaveBeenCalled();
    await act(async () => {
      await Promise.resolve();
    });
    expect(updateScene).toHaveBeenCalledOnce();
    expect(updateScene.mock.calls[0][0].appState).toEqual({
      selectedElementIds: { kept: true },
      selectedGroupIds: { group: true },
      editingGroupId: "group",
    });
  });

  it("does not carry mode or selection into a different project", () => {
    const { apiRef, updateScene } = setup();
    const { result, rerender } = renderHook(
      ({ path }) => useImageBrowseMode(path, apiRef),
      { initialProps: { path: "a" } },
    );
    act(() => result.current.changeMode(true));
    rerender({ path: "b" });
    expect(result.current.browsing).toBe(false);
    act(() => result.current.changeMode(false));
    expect(updateScene).not.toHaveBeenCalled();
    rerender({ path: "a" });
    expect(result.current.browsing).toBe(false);
  });

  it("cancels a queued selection restore when the project changes", async () => {
    const { apiRef, updateScene } = setup();
    const { result, rerender } = renderHook(
      ({ path }) => useImageBrowseMode(path, apiRef),
      { initialProps: { path: "a" } },
    );
    act(() => result.current.changeMode(true));
    act(() => result.current.changeMode(false));
    rerender({ path: "b" });
    await act(async () => {
      await Promise.resolve();
    });
    expect(updateScene).not.toHaveBeenCalled();
  });
});
