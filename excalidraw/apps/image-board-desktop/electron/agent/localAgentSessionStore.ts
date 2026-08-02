import { randomUUID } from "node:crypto";

import { isAgentHost } from "../../src/shared/agentBridgeTypes";

import type {
  AgentHost,
  LocalAgentSession,
} from "../../src/shared/agentBridgeTypes";

const createSessionError = (
  code: "AUTH_REQUIRED" | "BAD_REQUEST" | "COMMAND_FAILED",
  message: string,
) => Object.assign(new Error(message), { code });

export interface LocalAgentSessionStoreOptions {
  randomId?: () => string;
  now?: () => number;
}

export const createLocalAgentSessionStore = (
  options: LocalAgentSessionStoreOptions = {},
) => {
  const randomId = options.randomId ?? randomUUID;
  const now = options.now ?? Date.now;
  const sessions = new Map<string, LocalAgentSession>();

  return {
    issue(input: {
      host: AgentHost | string;
      displayLabel: string;
      externalConversationId?: string;
    }): LocalAgentSession {
      if (!isAgentHost(input.host)) {
        throw createSessionError(
          "BAD_REQUEST",
          "A supported local Agent host is required.",
        );
      }
      const displayLabel = input.displayLabel.trim();
      if (!displayLabel) {
        throw createSessionError(
          "BAD_REQUEST",
          "A local Agent display label is required.",
        );
      }
      const sessionRef = randomId().trim();
      if (!sessionRef || sessions.has(sessionRef)) {
        throw createSessionError(
          "COMMAND_FAILED",
          "CoreStudio could not issue a unique local Agent session.",
        );
      }
      const session: LocalAgentSession = {
        sessionRef,
        actorId: `agent:${input.host}:${sessionRef}`,
        host: input.host,
        displayLabel,
        issuedAt: new Date(now()).toISOString(),
        ...(input.externalConversationId?.trim()
          ? { externalConversationId: input.externalConversationId.trim() }
          : {}),
      };
      sessions.set(sessionRef, session);
      return structuredClone(session);
    },
    resolve(sessionRef: string): LocalAgentSession {
      const session = sessions.get(sessionRef.trim());
      if (!session) {
        throw createSessionError(
          "AUTH_REQUIRED",
          "The local Agent session is missing or no longer active.",
        );
      }
      return structuredClone(session);
    },
  };
};
