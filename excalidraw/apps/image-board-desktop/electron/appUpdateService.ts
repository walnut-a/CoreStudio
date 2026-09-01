import fs from "fs/promises";
import path from "path";

import {
  buildAppUpdateAvailability,
  EMPTY_APP_UPDATE_STATE,
  evaluateAppUpdateManifest,
  shouldAutomaticallyCheckForAppUpdate,
  type DesktopAppUpdateAvailability,
  type DesktopAppUpdateCheckResult,
  type DesktopAppUpdateEvaluation,
  type DesktopAppUpdateManifest,
  type DesktopAppUpdatePersistentState,
} from "../src/shared/appUpdate";

export const CORESTUDIO_UPDATE_MANIFEST_URL =
  "https://getcorestudio.com/updates/stable.json";

type FetchManifest = (input: string, init?: RequestInit) => Promise<Response>;

interface AppUpdateServiceOptions {
  currentVersion: string;
  currentSystemVersion: string;
  manifestURL?: string;
  statePath: string;
  fetchManifest?: FetchManifest;
  onAvailabilityChanged?: (availability: DesktopAppUpdateAvailability) => void;
}

const isNullableTimestamp = (value: unknown): value is string | null =>
  value === null ||
  (typeof value === "string" && Number.isFinite(Date.parse(value)));

const isNullableVersion = (value: unknown): value is string | null =>
  value === null ||
  (typeof value === "string" && /^\d+(?:\.\d+)*$/.test(value));

const readState = async (
  statePath: string,
): Promise<DesktopAppUpdatePersistentState> => {
  try {
    const parsed = JSON.parse(
      await fs.readFile(statePath, "utf8"),
    ) as Partial<DesktopAppUpdatePersistentState>;
    if (
      parsed.schemaVersion === 1 &&
      isNullableTimestamp(parsed.lastAttemptAt) &&
      isNullableTimestamp(parsed.lastSuccessfulCheckAt) &&
      isNullableVersion(parsed.lastKnownVersion) &&
      isNullableVersion(parsed.reviewedVersion)
    ) {
      return parsed as DesktopAppUpdatePersistentState;
    }
  } catch {
    // Missing or malformed state starts from a clean local record.
  }
  return { ...EMPTY_APP_UPDATE_STATE };
};

const writeState = async (
  statePath: string,
  state: DesktopAppUpdatePersistentState,
) => {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(state, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  await fs.rename(temporaryPath, statePath);
};

export const createAppUpdateService = ({
  currentVersion,
  currentSystemVersion,
  manifestURL = CORESTUDIO_UPDATE_MANIFEST_URL,
  statePath,
  fetchManifest = (input, init) => fetch(input, init),
  onAvailabilityChanged = () => undefined,
}: AppUpdateServiceOptions) => {
  let state: DesktopAppUpdatePersistentState = {
    ...EMPTY_APP_UPDATE_STATE,
  };
  let activeCheck: Promise<DesktopAppUpdateEvaluation> | null = null;
  let stateWriteChain: Promise<void> = Promise.resolve();

  const getAvailability = () =>
    buildAppUpdateAvailability(state, currentVersion);

  const persistState = () => {
    const snapshot = { ...state };
    const nextWrite = stateWriteChain.then(() =>
      writeState(statePath, snapshot),
    );
    stateWriteChain = nextWrite.catch(() => undefined);
    return nextWrite;
  };

  const saveAndPublish = async () => {
    await persistState();
    onAvailabilityChanged(getAvailability());
  };

  const requestUpdate = async (): Promise<DesktopAppUpdateEvaluation> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetchManifest(manifestURL, {
        cache: "no-cache",
        headers: {
          Accept: "application/json",
          "User-Agent": "CoreStudio",
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Update service returned HTTP ${response.status}.`);
      }
      const manifest = (await response.json()) as DesktopAppUpdateManifest;
      return evaluateAppUpdateManifest({
        manifest,
        currentVersion,
        currentSystemVersion,
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  const performCheck = async (
    startedAt: Date,
  ): Promise<DesktopAppUpdateEvaluation> => {
    if (activeCheck) {
      return activeCheck;
    }
    const request = (async () => {
      state = {
        ...state,
        lastAttemptAt: startedAt.toISOString(),
      };
      await persistState();
      return requestUpdate();
    })();
    activeCheck = request;
    try {
      return await request;
    } finally {
      activeCheck = null;
    }
  };

  const recordSuccessfulCheck = async ({
    result,
    completedAt,
    reviewed,
  }: {
    result: DesktopAppUpdateEvaluation;
    completedAt: Date;
    reviewed: boolean;
  }) => {
    state = {
      ...state,
      lastSuccessfulCheckAt: completedAt.toISOString(),
      lastKnownVersion: result.update.version,
      reviewedVersion: reviewed ? result.update.version : state.reviewedVersion,
    };
    await saveAndPublish();
  };

  return {
    initialize: async () => {
      state = await readState(statePath);
      onAvailabilityChanged(getAvailability());
      return getAvailability();
    },
    getAvailability,
    checkAutomaticallyIfNeeded: async (now = new Date()) => {
      if (!shouldAutomaticallyCheckForAppUpdate(state, now)) {
        return;
      }
      try {
        const result = await performCheck(now);
        await recordSuccessfulCheck({
          result,
          completedAt: now,
          reviewed: false,
        });
      } catch {
        // Automatic checks are intentionally silent. lastAttemptAt was saved
        // before the request so activation cannot create a retry loop.
      }
    },
    checkManually: async (
      now = new Date(),
    ): Promise<DesktopAppUpdateCheckResult> => {
      const result = await performCheck(now);
      await recordSuccessfulCheck({
        result,
        completedAt: now,
        reviewed: true,
      });
      return {
        ...result,
        availability: getAvailability(),
      };
    },
  };
};
