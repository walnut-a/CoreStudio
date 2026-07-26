import { randomUUID } from "node:crypto";

import type {
  ProjectRoomIdentity,
  ProjectRoomParticipant,
} from "../../src/shared/projectRoomProtocol";

import { ProjectRoomError } from "./projectRoom";

interface ParticipantGrant {
  identity: ProjectRoomIdentity;
  actorId: string;
  displayLabel: string;
  expiresAt: number;
}

export interface IssueProjectRoomLaunchTicketInput {
  identity: ProjectRoomIdentity;
  actorId: string;
  displayLabel: string;
}

export interface ProjectRoomTicketExchange {
  sessionId: string;
  resumeToken: string;
  participant: ProjectRoomParticipant;
}

export interface CreateProjectRoomTicketStoreInput {
  randomId?: () => string;
  now?: () => number;
  launchTicketTtlMs?: number;
  resumeTokenTtlMs?: number;
}

const assertIdentity = (
  granted: ProjectRoomIdentity,
  current: ProjectRoomIdentity,
) => {
  if (granted.sessionEpoch !== current.sessionEpoch) {
    throw new ProjectRoomError(
      "SESSION_EPOCH_EXPIRED",
      "The project room ticket belongs to an expired session epoch.",
    );
  }
  if (
    granted.projectId !== current.projectId ||
    granted.canonicalProjectPath !== current.canonicalProjectPath
  ) {
    throw new ProjectRoomError(
      "PROJECT_MISMATCH",
      "The project room ticket targets a different project.",
    );
  }
  if (granted.roomId !== current.roomId) {
    throw new ProjectRoomError(
      "ROOM_MISMATCH",
      "The project room ticket targets a different room.",
    );
  }
};

export class ProjectRoomTicketStore {
  private readonly launchTickets = new Map<string, ParticipantGrant>();
  private readonly resumeTokens = new Map<string, ParticipantGrant>();
  private readonly randomId: () => string;
  private readonly now: () => number;
  private readonly launchTicketTtlMs: number;
  private readonly resumeTokenTtlMs: number;

  constructor(input: CreateProjectRoomTicketStoreInput = {}) {
    this.randomId = input.randomId ?? randomUUID;
    this.now = input.now ?? Date.now;
    this.launchTicketTtlMs = input.launchTicketTtlMs ?? 60_000;
    this.resumeTokenTtlMs = input.resumeTokenTtlMs ?? 12 * 60 * 60 * 1_000;
  }

  public issueLaunchTicket(input: IssueProjectRoomLaunchTicketInput) {
    this.purgeExpired();
    const ticket = this.randomId();
    this.launchTickets.set(ticket, {
      identity: structuredClone(input.identity),
      actorId: input.actorId,
      displayLabel: input.displayLabel,
      expiresAt: this.now() + this.launchTicketTtlMs,
    });
    return ticket;
  }

  public consumeLaunchTicket(
    ticket: string,
    currentIdentity: ProjectRoomIdentity,
  ): ProjectRoomTicketExchange {
    const grant = this.launchTickets.get(ticket);
    this.launchTickets.delete(ticket);
    this.purgeExpired();
    if (!grant) {
      throw new ProjectRoomError(
        "AUTH_REQUIRED",
        "The project room launch ticket is invalid or already consumed.",
      );
    }
    this.assertGrant(grant, currentIdentity);

    const sessionId = this.randomId();
    const resumeToken = this.randomId();
    const resumeGrant = {
      ...grant,
      expiresAt: this.now() + this.resumeTokenTtlMs,
    };
    this.resumeTokens.set(resumeToken, resumeGrant);
    return this.createExchange(resumeToken, resumeGrant, sessionId);
  }

  public resume(
    resumeToken: string,
    currentIdentity: ProjectRoomIdentity,
  ): ProjectRoomTicketExchange {
    const grant = this.resumeTokens.get(resumeToken);
    this.purgeExpired();
    if (!grant) {
      throw new ProjectRoomError(
        "AUTH_REQUIRED",
        "The project room resume token is invalid.",
      );
    }
    this.assertGrant(grant, currentIdentity);
    this.resumeTokens.delete(resumeToken);
    const nextResumeToken = this.randomId();
    this.resumeTokens.set(nextResumeToken, grant);
    return this.createExchange(nextResumeToken, grant);
  }

  public authorizeResumeToken(
    resumeToken: string,
    currentIdentity: ProjectRoomIdentity,
  ) {
    const grant = this.resumeTokens.get(resumeToken);
    this.purgeExpired();
    if (!grant) {
      throw new ProjectRoomError(
        "AUTH_REQUIRED",
        "The project room resume token is invalid.",
      );
    }
    this.assertGrant(grant, currentIdentity);
    return structuredClone(grant.identity);
  }

  public getGrantedIdentity(input: {
    launchTicket: string | null;
    resumeToken: string | null;
  }) {
    const grant = input.launchTicket
      ? this.launchTickets.get(input.launchTicket)
      : input.resumeToken
      ? this.resumeTokens.get(input.resumeToken)
      : null;
    this.purgeExpired();
    if (!grant) {
      throw new ProjectRoomError(
        "AUTH_REQUIRED",
        "A valid project room ticket is required.",
      );
    }
    if (grant.expiresAt < this.now()) {
      throw new ProjectRoomError(
        "TOKEN_EXPIRED",
        "The project room ticket has expired.",
      );
    }
    return structuredClone(grant.identity);
  }

  public revokeRoom(identity: ProjectRoomIdentity) {
    for (const [token, grant] of this.launchTickets) {
      if (grant.identity.roomId === identity.roomId) {
        this.launchTickets.delete(token);
      }
    }
    for (const [token, grant] of this.resumeTokens) {
      if (grant.identity.roomId === identity.roomId) {
        this.resumeTokens.delete(token);
      }
    }
  }

  private assertGrant(
    grant: ParticipantGrant,
    currentIdentity: ProjectRoomIdentity,
  ) {
    if (grant.expiresAt < this.now()) {
      throw new ProjectRoomError(
        "TOKEN_EXPIRED",
        "The project room ticket has expired.",
      );
    }
    assertIdentity(grant.identity, currentIdentity);
  }

  private purgeExpired() {
    const now = this.now();
    for (const [ticket, grant] of this.launchTickets) {
      if (grant.expiresAt < now) {
        this.launchTickets.delete(ticket);
      }
    }
    for (const [token, grant] of this.resumeTokens) {
      if (grant.expiresAt < now) {
        this.resumeTokens.delete(token);
      }
    }
  }

  private createExchange(
    resumeToken: string,
    grant: ParticipantGrant,
    sessionId = this.randomId(),
  ): ProjectRoomTicketExchange {
    return {
      sessionId,
      resumeToken,
      participant: {
        actorId: grant.actorId,
        sessionId,
        transport: "websocket",
        role: "board-editor",
        displayLabel: grant.displayLabel,
      },
    };
  }
}

export const createProjectRoomTicketStore = (
  input?: CreateProjectRoomTicketStoreInput,
) => new ProjectRoomTicketStore(input);
