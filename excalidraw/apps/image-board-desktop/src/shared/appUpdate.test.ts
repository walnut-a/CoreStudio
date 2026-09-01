import { describe, expect, it } from "vitest";

import {
  compareAppVersions,
  evaluateAppUpdateManifest,
  hasUnreviewedAppUpdate,
  shouldAutomaticallyCheckForAppUpdate,
  type DesktopAppUpdateManifest,
  type DesktopAppUpdatePersistentState,
} from "./appUpdate";

const manifest = (
  overrides: Partial<DesktopAppUpdateManifest> = {},
): DesktopAppUpdateManifest => ({
  schemaVersion: 1,
  channel: "stable",
  version: "1.2.0",
  publishedAt: "2026-09-01T00:00:00.000Z",
  minimumSystemVersion: "14.0",
  downloadPageURL: "https://getcorestudio.com/",
  releaseNotesURL: "https://github.com/walnut-a/CoreStudio/releases/tag/v1.2.0",
  summary: {
    "zh-CN": ["更新一", "更新二"],
    en: ["Update one", "Update two"],
  },
  ...overrides,
});

const emptyState = (): DesktopAppUpdatePersistentState => ({
  schemaVersion: 1,
  lastAttemptAt: null,
  lastSuccessfulCheckAt: null,
  lastKnownVersion: null,
  reviewedVersion: null,
});

describe("app update policy", () => {
  it("compares numeric dotted versions without lexicographic mistakes", () => {
    expect(compareAppVersions("1.10.0", "1.9.9")).toBe(1);
    expect(compareAppVersions("v1.2", "1.2.0")).toBe(0);
    expect(compareAppVersions("1.1.9", "1.2")).toBe(-1);
  });

  it("evaluates available, incompatible, and up-to-date releases", () => {
    expect(
      evaluateAppUpdateManifest({
        manifest: manifest(),
        currentVersion: "1.1.42",
        currentSystemVersion: "15.0",
      }).status,
    ).toBe("update-available");
    expect(
      evaluateAppUpdateManifest({
        manifest: manifest({ minimumSystemVersion: "16.0" }),
        currentVersion: "1.1.42",
        currentSystemVersion: "15.0",
      }).status,
    ).toBe("update-requires-newer-system");
    expect(
      evaluateAppUpdateManifest({
        manifest: manifest({ version: "1.1.42" }),
        currentVersion: "1.1.42",
        currentSystemVersion: "15.0",
      }).status,
    ).toBe("up-to-date");
  });

  it("rejects unsupported manifests and non-https actions", () => {
    expect(() =>
      evaluateAppUpdateManifest({
        manifest: manifest({ schemaVersion: 2 }),
        currentVersion: "1.1.42",
        currentSystemVersion: "15.0",
      }),
    ).toThrow(/schema/i);
    expect(() =>
      evaluateAppUpdateManifest({
        manifest: manifest({ downloadPageURL: "http://example.com" }),
        currentVersion: "1.1.42",
        currentSystemVersion: "15.0",
      }),
    ).toThrow(/HTTPS/i);
  });

  it("uses 24 hours after success and 6 hours after failure", () => {
    const now = new Date("2026-09-01T12:00:00.000Z");
    expect(shouldAutomaticallyCheckForAppUpdate(emptyState(), now)).toBe(true);
    expect(
      shouldAutomaticallyCheckForAppUpdate(
        {
          ...emptyState(),
          lastSuccessfulCheckAt: "2026-08-31T13:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
    expect(
      shouldAutomaticallyCheckForAppUpdate(
        {
          ...emptyState(),
          lastAttemptAt: "2026-09-01T07:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
    expect(
      shouldAutomaticallyCheckForAppUpdate(
        {
          ...emptyState(),
          lastAttemptAt: "2026-09-01T05:59:59.000Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("shows an indicator only for a newer unreviewed version", () => {
    expect(
      hasUnreviewedAppUpdate(
        {
          ...emptyState(),
          lastKnownVersion: "1.2.0",
        },
        "1.1.42",
      ),
    ).toBe(true);
    expect(
      hasUnreviewedAppUpdate(
        {
          ...emptyState(),
          lastKnownVersion: "1.2.0",
          reviewedVersion: "1.2.0",
        },
        "1.1.42",
      ),
    ).toBe(false);
    expect(
      hasUnreviewedAppUpdate(
        {
          ...emptyState(),
          lastKnownVersion: "1.1.42",
        },
        "1.1.42",
      ),
    ).toBe(false);
  });
});
