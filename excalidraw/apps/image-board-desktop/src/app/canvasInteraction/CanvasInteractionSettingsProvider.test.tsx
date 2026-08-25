import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CanvasInteractionSettingsProvider,
  useCanvasInteractionSettings,
} from "./CanvasInteractionSettingsProvider";

const Harness = () => {
  const { trackpadZoomSpeed, setTrackpadZoomSpeed } =
    useCanvasInteractionSettings();
  return (
    <>
      <output>{trackpadZoomSpeed}</output>
      <button type="button" onClick={() => void setTrackpadZoomSpeed("fast")}>
        Set fast
      </button>
    </>
  );
};

afterEach(() => {
  delete window.imageBoardDesktop;
});

describe("CanvasInteractionSettingsProvider", () => {
  it("loads, saves, and follows settings broadcast by the desktop host", async () => {
    let broadcast:
      | ((settings: { schemaVersion: 1; trackpadZoomSpeed: "slow" }) => void)
      | undefined;
    const saveTrackpadZoomSpeed = vi.fn().mockResolvedValue({
      schemaVersion: 1,
      trackpadZoomSpeed: "fast",
    });
    window.imageBoardDesktop = {
      loadCanvasInteractionSettings: vi.fn().mockResolvedValue({
        schemaVersion: 1,
        trackpadZoomSpeed: "standard",
      }),
      saveTrackpadZoomSpeed,
      onCanvasInteractionSettingsChanged: vi.fn((listener) => {
        broadcast = listener as typeof broadcast;
        return () => undefined;
      }),
    } as any;

    render(
      <CanvasInteractionSettingsProvider>
        <Harness />
      </CanvasInteractionSettingsProvider>,
    );

    await waitFor(() => expect(screen.getByText("standard")).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Set fast" }));
    await waitFor(() => expect(screen.getByText("fast")).toBeVisible());
    expect(saveTrackpadZoomSpeed).toHaveBeenCalledWith("fast");

    act(() => {
      broadcast?.({ schemaVersion: 1, trackpadZoomSpeed: "slow" });
    });
    await waitFor(() => expect(screen.getByText("slow")).toBeVisible());
  });
});
