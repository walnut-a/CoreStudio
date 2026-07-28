import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RuntimeIdentityBadge } from "./RuntimeIdentityBadge";

describe("RuntimeIdentityBadge", () => {
  it("shows the machine identity label and build id for human verification", async () => {
    render(
      <RuntimeIdentityBadge
        loadAppInfo={vi.fn().mockResolvedValue({
          name: "CoreStudio Preview",
          version: "1.1.30",
          runtimeIdentity: {
            instanceKind: "packaged-preview",
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

  it("does not expose the machine identity badge in production", async () => {
    const productionAppInfo = {
      name: "CoreStudio",
      version: "1.1.30",
      runtimeIdentity: {
        instanceKind: "production",
        runtimeLabel: "PRODUCTION",
        buildId: "1.1.30-production",
      },
    } as const;
    let resolveAppInfo: (value: typeof productionAppInfo) => void = () =>
      undefined;
    const loadAppInfo = vi.fn(
      () =>
        new Promise<typeof productionAppInfo>((resolve) => {
          resolveAppInfo = resolve;
        }),
    );

    render(<RuntimeIdentityBadge loadAppInfo={loadAppInfo} />);
    await waitFor(() => expect(loadAppInfo).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveAppInfo(productionAppInfo);
    });

    expect(
      screen.queryByTestId("runtime-identity-badge"),
    ).not.toBeInTheDocument();
  });
});
