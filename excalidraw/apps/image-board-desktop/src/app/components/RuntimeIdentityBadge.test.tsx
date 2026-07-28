import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RuntimeIdentityBadge } from "./RuntimeIdentityBadge";

describe("RuntimeIdentityBadge", () => {
  it("shows the machine identity label and build id for human verification", async () => {
    render(
      <RuntimeIdentityBadge
        loadAppInfo={vi.fn().mockResolvedValue({
          name: "CoreStudio Preview",
          version: "1.1.29",
          runtimeIdentity: {
            runtimeLabel: "PACKAGED PREVIEW",
            buildId: "9ce3740ed-dirty",
          },
        })}
      />,
    );

    expect(
      await screen.findByText("PACKAGED PREVIEW · 9ce3740ed-dirty"),
    ).toBeInTheDocument();
  });
});
