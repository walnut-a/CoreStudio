import { randomUUID } from "node:crypto";

interface BoardProjectSelectionGrant {
  actorId: string;
  displayLabel: string;
  currentProjectPath?: string;
  expiresAt: number;
}

export interface BoardProjectSelectionStoreOptions {
  now?: () => number;
  randomId?: () => string;
  ttlMs?: number;
}

export class BoardProjectSelectionError extends Error {
  constructor(
    public readonly code: "AUTH_REQUIRED" | "TOKEN_EXPIRED",
    message: string,
  ) {
    super(message);
  }
}

export const createBoardProjectSelectionStore = (
  options: BoardProjectSelectionStoreOptions = {},
) => {
  const now = options.now ?? Date.now;
  const randomId = options.randomId ?? randomUUID;
  const ttlMs = options.ttlMs ?? 5 * 60_000;
  const grants = new Map<string, BoardProjectSelectionGrant>();
  const maxGrants = 128;

  const prune = () => {
    const currentTime = now();
    for (const [token, grant] of grants) {
      if (grant.expiresAt <= currentTime) {
        grants.delete(token);
      }
    }
    while (grants.size >= maxGrants) {
      const oldestToken = grants.keys().next().value;
      if (typeof oldestToken !== "string") {
        break;
      }
      grants.delete(oldestToken);
    }
  };

  const requireGrant = (token: string) => {
    const grant = grants.get(token);
    if (!grant) {
      throw new BoardProjectSelectionError(
        "AUTH_REQUIRED",
        "Missing or invalid project selection token.",
      );
    }
    if (grant.expiresAt <= now()) {
      grants.delete(token);
      throw new BoardProjectSelectionError(
        "TOKEN_EXPIRED",
        "Project selection token has expired.",
      );
    }
    return grant;
  };

  return {
    issue(input: {
      actorId: string;
      displayLabel: string;
      currentProjectPath?: string;
    }) {
      prune();
      const token = randomId();
      grants.set(token, {
        ...input,
        expiresAt: now() + ttlMs,
      });
      return token;
    },
    authorize(token: string) {
      return requireGrant(token);
    },
    consume(token: string) {
      const grant = requireGrant(token);
      grants.delete(token);
      return grant;
    },
  };
};
