import type { WebContents } from "electron";
import { expect, it, vi } from "vitest";
import { guardDesktopNavigation } from "./desktopNavigation";

it("keeps renderer-initiated navigation on the current document and denies popups", () => {
  const documentUrl = "file:///app/index.html?mode=shell";
  const contents = {
    getURL: () => documentUrl,
    on: vi.fn(),
    setWindowOpenHandler: vi.fn(),
  };
  guardDesktopNavigation(contents as unknown as WebContents);
  const navigate = contents.on.mock.calls.find(
    ([name]) => name === "will-navigate",
  )![1];
  const preventDefault = vi.fn();
  navigate({ url: documentUrl, preventDefault });
  expect(preventDefault).not.toHaveBeenCalled();
  navigate({ url: "https://example.org/", preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(contents.setWindowOpenHandler.mock.calls[0][0]()).toEqual({
    action: "deny",
  });
});
