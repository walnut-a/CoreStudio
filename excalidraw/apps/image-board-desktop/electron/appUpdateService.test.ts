import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppUpdateService } from "./appUpdateService";

const temporaryDirectories: string[] = [];

const createTemporaryStatePath = async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "corestudio-app-update-test-"),
  );
  temporaryDirectories.push(directory);
  return path.join(directory, "state.json");
};

const response = (version = "1.2.0") =>
  new Response(
    JSON.stringify({
      schemaVersion: 1,
      channel: "stable",
      version,
      publishedAt: "2026-09-01T00:00:00.000Z",
      minimumSystemVersion: "14.0",
      downloadPageURL: "https://getcorestudio.com/",
      releaseNotesURL: `https://github.com/walnut-a/CoreStudio/releases/tag/v${version}`,
      summary: { "zh-CN": ["更新"], en: ["Update"] },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe("app update service", () => {
  it("ignores malformed persisted versions instead of blocking startup", async () => {
    const statePath = await createTemporaryStatePath();
    await fs.writeFile(
      statePath,
      JSON.stringify({
        schemaVersion: 1,
        lastAttemptAt: null,
        lastSuccessfulCheckAt: null,
        lastKnownVersion: "not-a-version",
        reviewedVersion: null,
      }),
    );
    const service = createAppUpdateService({
      currentVersion: "1.1.42",
      currentSystemVersion: "15.0",
      manifestURL: "https://getcorestudio.com/updates/stable.json",
      statePath,
      fetchManifest: vi.fn(async () => response()),
    });

    await expect(service.initialize()).resolves.toMatchObject({
      latestVersion: null,
      hasUnreviewedUpdate: false,
    });
  });

  it("persists an automatic discovery and marks it reviewed after a manual check", async () => {
    const statePath = await createTemporaryStatePath();
    const fetchManifest = vi.fn(async () => response());
    const onAvailabilityChanged = vi.fn();
    const service = createAppUpdateService({
      currentVersion: "1.1.42",
      currentSystemVersion: "15.0",
      manifestURL: "https://getcorestudio.com/updates/stable.json",
      statePath,
      fetchManifest,
      onAvailabilityChanged,
    });
    await service.initialize();

    await service.checkAutomaticallyIfNeeded(
      new Date("2026-09-01T00:00:00.000Z"),
    );
    expect(service.getAvailability()).toMatchObject({
      currentVersion: "1.1.42",
      latestVersion: "1.2.0",
      hasUnreviewedUpdate: true,
    });

    const manualResponse = await service.checkManually(
      new Date("2026-09-01T01:00:00.000Z"),
    );
    expect(manualResponse.ok).toBe(true);
    if (!manualResponse.ok) {
      throw new Error("Expected a successful manual update check.");
    }
    const manualResult = manualResponse.result;
    expect(manualResult.status).toBe("update-available");
    expect(manualResult.availability.hasUnreviewedUpdate).toBe(false);
    expect(onAvailabilityChanged).toHaveBeenCalled();

    const persisted = JSON.parse(await fs.readFile(statePath, "utf8"));
    expect(persisted).toMatchObject({
      schemaVersion: 1,
      lastKnownVersion: "1.2.0",
      reviewedVersion: "1.2.0",
    });
  });

  it("reuses one in-flight request for concurrent automatic and manual checks", async () => {
    const statePath = await createTemporaryStatePath();
    let resolveResponse!: (value: Response) => void;
    const fetchManifest = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    const service = createAppUpdateService({
      currentVersion: "1.1.42",
      currentSystemVersion: "15.0",
      manifestURL: "https://getcorestudio.com/updates/stable.json",
      statePath,
      fetchManifest,
    });
    await service.initialize();

    const automatic = service.checkAutomaticallyIfNeeded(
      new Date("2026-09-01T00:00:00.000Z"),
    );
    const manual = service.checkManually(new Date("2026-09-01T00:00:01.000Z"));
    await vi.waitFor(() => expect(fetchManifest).toHaveBeenCalledTimes(1));
    resolveResponse(response());

    await automatic;
    const manualResponse = await manual;
    expect(manualResponse.ok).toBe(true);
    if (!manualResponse.ok) {
      throw new Error("Expected a successful manual update check.");
    }
    expect(manualResponse.result.availability.hasUnreviewedUpdate).toBe(false);
    expect(fetchManifest).toHaveBeenCalledTimes(1);
  });

  it("keeps automatic failures silent while persisting the retry attempt", async () => {
    const statePath = await createTemporaryStatePath();
    const service = createAppUpdateService({
      currentVersion: "1.1.42",
      currentSystemVersion: "15.0",
      manifestURL: "https://getcorestudio.com/updates/stable.json",
      statePath,
      fetchManifest: vi.fn(
        async () => new Response("offline", { status: 503 }),
      ),
    });
    await service.initialize();

    await expect(
      service.checkAutomaticallyIfNeeded(new Date("2026-09-01T00:00:00.000Z")),
    ).resolves.toBeUndefined();
    await expect(
      service.checkManually(new Date("2026-09-01T00:00:01.000Z")),
    ).resolves.toEqual({
      ok: false,
      failure: { code: "service-unavailable", httpStatus: 503 },
    });

    const persisted = JSON.parse(await fs.readFile(statePath, "utf8"));
    expect(persisted.lastAttemptAt).toBe("2026-09-01T00:00:01.000Z");
    expect(persisted.lastSuccessfulCheckAt).toBeNull();
  });

  it.each([
    {
      name: "missing manifest",
      response: new Response("missing", { status: 404 }),
      failure: { code: "service-not-configured", httpStatus: 404 },
    },
    {
      name: "rejected request",
      response: new TypeError("fetch failed"),
      failure: { code: "network" },
    },
    {
      name: "malformed JSON",
      response: new Response("not-json", { status: 200 }),
      failure: { code: "invalid-response" },
    },
  ])("classifies $name failures for the renderer", async ({ response: value, failure }) => {
    const statePath = await createTemporaryStatePath();
    const service = createAppUpdateService({
      currentVersion: "1.1.42",
      currentSystemVersion: "15.0",
      statePath,
      fetchManifest: vi.fn(async () => {
        if (value instanceof Error) {
          throw value;
        }
        return value;
      }),
    });
    await service.initialize();

    await expect(service.checkManually()).resolves.toEqual({
      ok: false,
      failure,
    });
  });

  it("distinguishes a request timeout from other network failures", async () => {
    const statePath = await createTemporaryStatePath();
    const service = createAppUpdateService({
      currentVersion: "1.1.42",
      currentSystemVersion: "15.0",
      statePath,
      requestTimeoutMs: 5,
      fetchManifest: vi.fn(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      ),
    });
    await service.initialize();

    await expect(service.checkManually()).resolves.toEqual({
      ok: false,
      failure: { code: "timeout" },
    });
  });
});
