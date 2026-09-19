import { it, expect, vi } from "vitest";
import type { ProjectRoomEvent } from "../shared/projectRoomProtocol";
import {
  App,
  act,
  render,
  screen,
  fireEvent,
  waitFor,
  createDesktopBridgeMock,
  createMockProjectBundle,
  triggerExcalidrawInitialize,
} from "./App.testSupport";
it("offers a recovery action after a storage failure and invokes the project-bound bridge", async () => {
  let listener: ((sessionId: string, event: ProjectRoomEvent) => void) | null =
    null;
  const resolveProjectStorage = vi.fn().mockResolvedValue({ resolved: true });
  const bridge = createDesktopBridgeMock({
    createProject: vi.fn().mockResolvedValue(createMockProjectBundle()),
    resolveProjectStorage,
    onProjectRoomEvent: vi.fn((cb) => {
      listener = cb;
      return () => undefined;
    }),
  });
  window.imageBoardDesktop = bridge as any;
  render(<App />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
  });
  act(() => triggerExcalidrawInitialize?.());
  await waitFor(() => expect(bridge.joinProjectRoom).toHaveBeenCalled());
  const sessionId = vi.mocked(bridge.joinProjectRoom).mock.calls[0][0]
    .sessionId;
  act(() =>
    listener?.(sessionId, {
      type: "scene.persistence-failed",
      identity: {
        projectId: "test-project",
        canonicalProjectPath: "/tmp/mock-project",
        roomId: "room:/tmp/mock-project",
        sessionEpoch: 1,
      },
      sequence: 0,
      error: { code: "PROJECT_STORAGE_DIVERGED", message: "外部排布冲突" },
    }),
  );
  await act(async () =>
    fireEvent.click(
      await screen.findByRole("button", { name: "处理文件变化" }),
    ),
  );
  expect(resolveProjectStorage).toHaveBeenCalledWith({
    projectPath: "/tmp/mock-project",
  });
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "处理文件变化" }),
    ).not.toBeInTheDocument(),
  );
});
