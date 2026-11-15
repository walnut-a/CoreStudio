import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import { vi, describe, it, expect } from "vitest";
import { bindCanvasPreferences } from "./canvasPreferences";
import { serializeSceneForProject } from "../project/sceneSerialization";
import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type {
  DesktopCanvasInteractionSettings,
  DesktopCanvasPreferences,
} from "../../shared/canvasInteractionSettings";

const createEditor = () => {
  let state: AppState = {
    ...getDefaultAppState(),
    width: 1400,
    height: 880,
    offsetTop: 0,
    offsetLeft: 0,
  };
  let listener: (
    elements: never[],
    state: AppState,
    files: {},
  ) => void = () => {};
  const api = {
    getAppState: () => state,
    updateScene: vi.fn(({ appState }) => {
      state = { ...state, ...appState };
    }),
    onChange: vi.fn((callback) => {
      listener = callback;
      return () => {
        listener = () => {};
      };
    }),
  } as unknown as ExcalidrawImperativeAPI;
  return {
    api,
    emit: (patch: Partial<AppState> = {}) => {
      state = { ...state, ...patch };
      listener([], state, {});
    },
  };
};
const createBridge = () => {
  let settings: DesktopCanvasInteractionSettings = {
    schemaVersion: 1,
    trackpadZoomSpeed: "standard",
  };
  let listener = (_settings: DesktopCanvasInteractionSettings) => {};
  return {
    loadCanvasInteractionSettings: vi.fn(async () => settings),
    saveCanvasPreferences: vi.fn(
      async (canvasPreferences: DesktopCanvasPreferences) => {
        settings = { ...settings, canvasPreferences };
        return settings;
      },
    ),
    onCanvasInteractionSettingsChanged: (callback: typeof listener) => {
      listener = callback;
      return () => {
        listener = () => {};
      };
    },
    remote: (canvasPreferences: DesktopCanvasPreferences) =>
      listener({ ...settings, canvasPreferences }),
  };
};
const custom = {
  fontTopPicks: [8, 5, 6] as const,
  inputDevice: "mouse" as const,
};
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("桌面画布个人偏好", () => {
  it("重新初始化恢复收藏和输入设备，个人偏好不写入共享项目", async () => {
    const bridge = createBridge(),
      first = createEditor();
    const dispose = bindCanvasPreferences(first.api, bridge);
    await settle();
    first.emit({
      ...custom,
      colorTopPicks: {
        ...first.api.getAppState().colorTopPicks,
        elementStroke: ["#1971c2"],
        stickyNoteBackground: ["#fff9db"],
      },
    });
    await settle();
    dispose();
    const second = createEditor(),
      cleanup = bindCanvasPreferences(second.api, bridge);
    await settle();
    expect(second.api.getAppState()).toMatchObject({
      ...custom,
      colorTopPicks: first.api.getAppState().colorTopPicks,
    });
    const project = JSON.parse(
      serializeSceneForProject({
        elements: [],
        appState: first.api.getAppState(),
      }),
    );
    for (const key of ["fontTopPicks", "colorTopPicks", "inputDevice"])
      expect(project.appState).not.toHaveProperty(key);
    cleanup();
  });

  it("恢复时忽略旧初始化回调，恢复默认值仍然保存", async () => {
    const bridge = createBridge();
    await bridge.saveCanvasPreferences({ ...getDefaultAppState(), ...custom });
    const editor = createEditor(),
      dispose = bindCanvasPreferences(editor.api, bridge);
    await settle();
    editor.emit(getDefaultAppState());
    expect(bridge.saveCanvasPreferences).toHaveBeenCalledTimes(1);
    editor.emit(custom);
    editor.emit({ fontTopPicks: null, inputDevice: "trackpad" });
    await settle();
    expect(
      (await bridge.loadCanvasInteractionSettings()).canvasPreferences,
    ).toMatchObject({ fontTopPicks: null, inputDevice: "trackpad" });
    dispose();
  });

  it("拖动画布不写设置，解除绑定后不再保存", async () => {
    const bridge = createBridge(),
      editor = createEditor(),
      dispose = bindCanvasPreferences(editor.api, bridge);
    await settle();
    editor.emit({ scrollX: 100 });
    editor.emit({ scrollX: 200 });
    expect(bridge.saveCanvasPreferences).not.toHaveBeenCalled();
    editor.emit(custom);
    await settle();
    dispose();
    editor.emit({ inputDevice: "trackpad" });
    expect(bridge.saveCanvasPreferences).toHaveBeenCalledTimes(1);
  });

  it("其他项目窗口更新偏好时同步当前窗口，不产生保存循环", async () => {
    const bridge = createBridge(),
      editor = createEditor(),
      dispose = bindCanvasPreferences(editor.api, bridge);
    await settle();
    bridge.remote({ ...getDefaultAppState(), ...custom });
    editor.emit();
    expect(editor.api.getAppState()).toMatchObject(custom);
    expect(bridge.saveCanvasPreferences).not.toHaveBeenCalled();
    dispose();
  });

  it("较晚返回的初始设置不覆盖用户已作出的选择", async () => {
    const bridge = createBridge();
    let resolve!: (settings: DesktopCanvasInteractionSettings) => void;
    bridge.loadCanvasInteractionSettings.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const editor = createEditor(),
      dispose = bindCanvasPreferences(editor.api, bridge);
    editor.emit({ inputDevice: "mouse" });
    resolve({
      schemaVersion: 1,
      trackpadZoomSpeed: "standard",
      canvasPreferences: { ...getDefaultAppState(), fontTopPicks: [8, 5, 6] },
    });
    await settle();
    editor.emit();
    expect(editor.api.getAppState()).toMatchObject(custom);
    expect(bridge.saveCanvasPreferences).toHaveBeenLastCalledWith(
      expect.objectContaining(custom),
    );
    dispose();
  });

  it("已卸载的编辑器不接收晚到的设置响应", async () => {
    const bridge = createBridge(),
      editor = createEditor(),
      dispose = bindCanvasPreferences(editor.api, bridge);
    dispose();
    await settle();
    expect(editor.api.updateScene).not.toHaveBeenCalled();
  });
});
