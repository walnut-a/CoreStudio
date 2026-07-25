import type { AgentErrorCode } from "../../src/shared/agentBridgeTypes";

const createStableBoardSessionError = (
  code: AgentErrorCode,
  message: string,
  details?: unknown,
) =>
  Object.assign(new Error(message), {
    code,
    ...(details === undefined ? {} : { details }),
  });

interface PendingStableBoardPage {
  stableBoardId: string;
  expiresAt: number;
  claim?: {
    actorId: string;
    displayLabel: string;
  };
}

export interface StableBoardPageIdentity {
  stableBoardId: string;
  pageNonce: string;
}

export interface StableBoardActorClaim extends StableBoardPageIdentity {
  actorId: string;
  displayLabel: string;
}

export class StableBoardSessionClaimStore {
  private readonly pages = new Map<string, PendingStableBoardPage>();
  private readonly now: () => number;
  private readonly ttlMs: number;

  constructor({
    now = Date.now,
    ttlMs = 5 * 60 * 1_000,
  }: {
    now?: () => number;
    ttlMs?: number;
  } = {}) {
    this.now = now;
    this.ttlMs = ttlMs;
  }

  public register(input: StableBoardPageIdentity) {
    this.assertInput(input);
    const existing = this.pages.get(input.pageNonce);
    if (existing && existing.stableBoardId !== input.stableBoardId) {
      throw createStableBoardSessionError(
        "PROJECT_MISMATCH",
        "The Agent Board page nonce belongs to another project.",
      );
    }
    const activeClaim =
      existing && existing.expiresAt >= this.now()
        ? existing.claim
        : undefined;
    this.pages.set(input.pageNonce, {
      stableBoardId: input.stableBoardId,
      expiresAt: this.now() + this.ttlMs,
      ...(activeClaim ? { claim: activeClaim } : {}),
    });
  }

  public claim(input: StableBoardActorClaim) {
    if (!this.pages.has(input.pageNonce)) {
      this.register(input);
    }
    const page = this.getPage(input);
    if (page.stableBoardId !== input.stableBoardId) {
      throw createStableBoardSessionError(
        "PROJECT_MISMATCH",
        "The Agent Board page nonce belongs to another project.",
      );
    }
    page.claim = {
      actorId: input.actorId,
      displayLabel: input.displayLabel,
    };
  }

  public hasClaim(input: StableBoardPageIdentity) {
    const page = this.pages.get(input.pageNonce);
    return Boolean(
      page &&
        page.expiresAt >= this.now() &&
        page.stableBoardId === input.stableBoardId &&
        page.claim,
    );
  }

  public consume(input: StableBoardPageIdentity) {
    const page = this.getPage(input);
    if (page.stableBoardId !== input.stableBoardId) {
      throw createStableBoardSessionError(
        "PROJECT_MISMATCH",
        "The Agent Board page nonce belongs to another project.",
      );
    }
    if (!page.claim) {
      throw createStableBoardSessionError(
        "ACTOR_CLAIM_REQUIRED",
        "The Agent Board page is waiting for a trusted Agent identity.",
        { pageNonce: input.pageNonce },
      );
    }
    return structuredClone(page.claim);
  }

  private getPage(input: StableBoardPageIdentity) {
    this.assertInput(input);
    const page = this.pages.get(input.pageNonce);
    if (!page) {
      throw createStableBoardSessionError(
        "ACTOR_CLAIM_REQUIRED",
        "The Agent Board page nonce has not been registered.",
        { pageNonce: input.pageNonce },
      );
    }
    if (page.expiresAt < this.now()) {
      this.pages.delete(input.pageNonce);
      throw createStableBoardSessionError(
        "TOKEN_EXPIRED",
        "The Agent Board page nonce has expired.",
      );
    }
    return page;
  }

  private assertInput(input: StableBoardPageIdentity) {
    if (!input.stableBoardId.trim() || !input.pageNonce.trim()) {
      throw createStableBoardSessionError(
        "BAD_REQUEST",
        "Stable board id and page nonce are required.",
      );
    }
  }
}

export const createStableBoardSessionClaimStore = (
  input?: ConstructorParameters<typeof StableBoardSessionClaimStore>[0],
) => new StableBoardSessionClaimStore(input);
