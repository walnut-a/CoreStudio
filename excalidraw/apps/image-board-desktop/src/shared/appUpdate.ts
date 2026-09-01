export const APP_UPDATE_SUCCESS_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const APP_UPDATE_FAILURE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface DesktopAppUpdateAsset {
  url: string;
  size: number;
  sha256: string;
}

export interface DesktopAppUpdateManifest {
  schemaVersion: number;
  channel: string;
  version: string;
  publishedAt: string;
  minimumSystemVersion: string;
  downloadPageURL: string;
  releaseNotesURL: string;
  asset?: DesktopAppUpdateAsset;
  summary: Record<string, string[]>;
}

export interface DesktopAppUpdateInfo {
  version: string;
  publishedAt: string;
  minimumSystemVersion: string;
  downloadPageURL: string;
  releaseNotesURL: string;
  summary: Record<string, string[]>;
}

export type DesktopAppUpdateCheckStatus =
  | "update-available"
  | "update-requires-newer-system"
  | "up-to-date";

export interface DesktopAppUpdateEvaluation {
  status: DesktopAppUpdateCheckStatus;
  update: DesktopAppUpdateInfo;
}

export interface DesktopAppUpdateAvailability {
  currentVersion: string;
  latestVersion: string | null;
  hasUnreviewedUpdate: boolean;
  lastSuccessfulCheckAt: string | null;
}

export interface DesktopAppUpdateCheckResult
  extends DesktopAppUpdateEvaluation {
  availability: DesktopAppUpdateAvailability;
}

export type DesktopAppUpdateCheckFailureCode =
  | "network"
  | "timeout"
  | "service-not-configured"
  | "service-unavailable"
  | "service-error"
  | "invalid-response"
  | "unsupported"
  | "unknown";

export interface DesktopAppUpdateCheckFailure {
  code: DesktopAppUpdateCheckFailureCode;
  httpStatus?: number;
}

export type DesktopAppUpdateCheckResponse =
  | { ok: true; result: DesktopAppUpdateCheckResult }
  | { ok: false; failure: DesktopAppUpdateCheckFailure };

export type DesktopAppUpdateManualState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "failure"; failure: DesktopAppUpdateCheckFailure }
  | { status: "complete"; result: DesktopAppUpdateCheckResult };

export interface DesktopAppUpdatePersistentState {
  schemaVersion: 1;
  lastAttemptAt: string | null;
  lastSuccessfulCheckAt: string | null;
  lastKnownVersion: string | null;
  reviewedVersion: string | null;
}

export const EMPTY_APP_UPDATE_STATE: DesktopAppUpdatePersistentState = {
  schemaVersion: 1,
  lastAttemptAt: null,
  lastSuccessfulCheckAt: null,
  lastKnownVersion: null,
  reviewedVersion: null,
};

const normalizeVersion = (value: string) => {
  const normalized = value.trim().replace(/^[vV]/, "");
  if (!/^\d+(?:\.\d+)*$/.test(normalized)) {
    throw new Error(`Invalid app version: ${value}`);
  }
  return normalized;
};

export const compareAppVersions = (left: string, right: string): -1 | 0 | 1 => {
  const leftParts = normalizeVersion(left).split(".").map(Number);
  const rightParts = normalizeVersion(right).split(".").map(Number);
  const count = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < count; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart < rightPart) {
      return -1;
    }
    if (leftPart > rightPart) {
      return 1;
    }
  }
  return 0;
};

const requireHttpsURL = (value: string, field: string) => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid ${field} URL.`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`${field} must use HTTPS.`);
  }
  return parsed.toString();
};

const normalizeSummary = (value: unknown): Record<string, string[]> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid app update summary.");
  }
  const entries = Object.entries(value).map(([locale, items]) => {
    if (
      !Array.isArray(items) ||
      !items.every((item) => typeof item === "string")
    ) {
      throw new Error(`Invalid app update summary for ${locale}.`);
    }
    return [
      locale,
      items
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3),
    ] as const;
  });
  return Object.fromEntries(entries);
};

export const evaluateAppUpdateManifest = ({
  manifest,
  currentVersion,
  currentSystemVersion,
}: {
  manifest: DesktopAppUpdateManifest;
  currentVersion: string;
  currentSystemVersion: string;
}): DesktopAppUpdateEvaluation => {
  if (manifest.schemaVersion !== 1) {
    throw new Error(`Unsupported app update schema: ${manifest.schemaVersion}`);
  }
  if (manifest.channel !== "stable") {
    throw new Error(`Unsupported app update channel: ${manifest.channel}`);
  }
  const version = normalizeVersion(manifest.version);
  const minimumSystemVersion = normalizeVersion(manifest.minimumSystemVersion);
  if (!Number.isFinite(Date.parse(manifest.publishedAt))) {
    throw new Error("Invalid app update publication date.");
  }
  const update: DesktopAppUpdateInfo = {
    version,
    publishedAt: manifest.publishedAt,
    minimumSystemVersion,
    downloadPageURL: requireHttpsURL(manifest.downloadPageURL, "download page"),
    releaseNotesURL: requireHttpsURL(manifest.releaseNotesURL, "release notes"),
    summary: normalizeSummary(manifest.summary),
  };

  if (compareAppVersions(version, currentVersion) <= 0) {
    return { status: "up-to-date", update };
  }
  if (compareAppVersions(minimumSystemVersion, currentSystemVersion) > 0) {
    return { status: "update-requires-newer-system", update };
  }
  return { status: "update-available", update };
};

const elapsedSince = (value: string | null, now: Date) => {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? now.getTime() - timestamp
    : Number.POSITIVE_INFINITY;
};

export const shouldAutomaticallyCheckForAppUpdate = (
  state: DesktopAppUpdatePersistentState,
  now: Date,
) => {
  if (
    elapsedSince(state.lastSuccessfulCheckAt, now) <
    APP_UPDATE_SUCCESS_INTERVAL_MS
  ) {
    return false;
  }
  return (
    elapsedSince(state.lastAttemptAt, now) >= APP_UPDATE_FAILURE_INTERVAL_MS
  );
};

export const hasUnreviewedAppUpdate = (
  state: DesktopAppUpdatePersistentState,
  currentVersion: string,
) =>
  Boolean(
    state.lastKnownVersion &&
      compareAppVersions(state.lastKnownVersion, currentVersion) > 0 &&
      state.reviewedVersion !== state.lastKnownVersion,
  );

export const buildAppUpdateAvailability = (
  state: DesktopAppUpdatePersistentState,
  currentVersion: string,
): DesktopAppUpdateAvailability => ({
  currentVersion,
  latestVersion: state.lastKnownVersion,
  hasUnreviewedUpdate: hasUnreviewedAppUpdate(state, currentVersion),
  lastSuccessfulCheckAt: state.lastSuccessfulCheckAt,
});
