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

  public register(input: StableBoardPageIdentity) {
    this.assertInput(input);
    const existing = this.pages.get(input.pageNonce);
    if (existing && existing.stableBoardId !== input.stableBoardId) {
      throw createStableBoardSessionError(
        "PROJECT_MISMATCH",
        "The Agent Board page nonce belongs to another project.",
      );
    }
    this.pages.set(input.pageNonce, {
      stableBoardId: input.stableBoardId,
      ...(existing?.claim ? { claim: existing.claim } : {}),
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
      page && page.stableBoardId === input.stableBoardId && page.claim,
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

export const createStableBoardSessionClaimStore = () =>
  new StableBoardSessionClaimStore();
