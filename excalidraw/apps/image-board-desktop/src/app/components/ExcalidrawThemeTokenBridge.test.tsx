import { useRef, type CSSProperties } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExcalidrawThemeTokenBridge } from "./ExcalidrawThemeTokenBridge";

const Harness = () => {
  const targetRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <div ref={targetRef} data-testid="target" />
      <div
        className="excalidraw"
        style={
          {
            "--island-bg-color": "rgb(35, 35, 41)",
            "--text-primary-color": "rgb(227, 227, 232)",
          } as CSSProperties
        }
      >
        <ExcalidrawThemeTokenBridge targetRef={targetRef} />
      </div>
    </>
  );
};

describe("ExcalidrawThemeTokenBridge", () => {
  it("forwards the active Excalidraw theme tokens without moving overlays into its layout scope", async () => {
    render(<Harness />);

    const target = screen.getByTestId("target");
    await waitFor(() => {
      expect(target.style.getPropertyValue("--island-bg-color")).toBe(
        "rgb(35, 35, 41)",
      );
    });
    expect(target.style.getPropertyValue("--text-primary-color")).toBe(
      "rgb(227, 227, 232)",
    );
    expect(target.closest(".excalidraw")).toBeNull();
  });
});
