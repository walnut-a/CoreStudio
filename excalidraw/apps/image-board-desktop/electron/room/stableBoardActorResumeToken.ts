import fs from "node:fs/promises";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import path from "node:path";

import type { AgentErrorCode } from "../../src/shared/agentBridgeTypes";

const TOKEN_VERSION = 1;

interface StableBoardActorResumePayload {
  version: typeof TOKEN_VERSION;
  stableBoardId: string;
  pageNonce: string;
  actorId: string;
  displayLabel: string;
}

const createTokenError = (
  code: AgentErrorCode,
  message: string,
  details?: unknown,
) =>
  Object.assign(new Error(message), {
    code,
    ...(details === undefined ? {} : { details }),
  });

const encodePayload = (payload: StableBoardActorResumePayload) =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const parsePayload = (encodedPayload: string) => {
  try {
    return JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as unknown;
  } catch {
    throw createTokenError(
      "AUTH_REQUIRED",
      "The stable Board actor resume token is invalid.",
    );
  }
};

const isPayload = (value: unknown): value is StableBoardActorResumePayload =>
  typeof value === "object" &&
  value !== null &&
  "version" in value &&
  value.version === TOKEN_VERSION &&
  "stableBoardId" in value &&
  typeof value.stableBoardId === "string" &&
  "pageNonce" in value &&
  typeof value.pageNonce === "string" &&
  "actorId" in value &&
  typeof value.actorId === "string" &&
  "displayLabel" in value &&
  typeof value.displayLabel === "string";

export class StableBoardActorResumeTokenService {
  private readonly secret: Buffer;

  constructor({ secret }: { secret: Buffer }) {
    if (secret.length < 32) {
      throw new Error("Stable Board actor token secret is too short.");
    }
    this.secret = Buffer.from(secret);
  }

  public issue(input: Omit<StableBoardActorResumePayload, "version">) {
    const encodedPayload = encodePayload({
      version: TOKEN_VERSION,
      ...input,
    });
    return `${encodedPayload}.${this.sign(encodedPayload)}`;
  }

  public verify({
    token,
    stableBoardId,
    pageNonce,
  }: {
    token: string;
    stableBoardId: string;
    pageNonce: string;
  }) {
    const [encodedPayload, signature, ...rest] = token.split(".");
    if (!encodedPayload || !signature || rest.length > 0) {
      throw createTokenError(
        "AUTH_REQUIRED",
        "The stable Board actor resume token is invalid.",
      );
    }
    const expectedSignature = Buffer.from(
      this.sign(encodedPayload),
      "base64url",
    );
    const receivedSignature = Buffer.from(signature, "base64url");
    if (
      receivedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      throw createTokenError(
        "AUTH_REQUIRED",
        "The stable Board actor resume token is invalid.",
      );
    }
    const payload = parsePayload(encodedPayload);
    if (!isPayload(payload)) {
      throw createTokenError(
        "AUTH_REQUIRED",
        "The stable Board actor resume token payload is invalid.",
      );
    }
    if (
      payload.stableBoardId !== stableBoardId ||
      payload.pageNonce !== pageNonce
    ) {
      throw createTokenError(
        "PROJECT_MISMATCH",
        "The stable Board actor resume token belongs to another page.",
      );
    }
    return {
      actorId: payload.actorId,
      displayLabel: payload.displayLabel,
    };
  }

  private sign(encodedPayload: string) {
    return createHmac("sha256", this.secret)
      .update(encodedPayload)
      .digest("base64url");
  }
}

export const createStableBoardActorResumeTokenService = (
  input: ConstructorParameters<typeof StableBoardActorResumeTokenService>[0],
) => new StableBoardActorResumeTokenService(input);

export const loadOrCreateStableBoardActorTokenSecret = async (
  secretPath: string,
) => {
  try {
    const existing = await fs.readFile(secretPath);
    if (existing.length < 32) {
      throw new Error("Stable Board actor token secret is invalid.");
    }
    await fs.chmod(secretPath, 0o600);
    return existing;
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }

  await fs.mkdir(path.dirname(secretPath), { recursive: true });
  const secret = randomBytes(32);
  try {
    await fs.writeFile(secretPath, secret, {
      mode: 0o600,
      flag: "wx",
    });
    return secret;
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "EEXIST"
    ) {
      throw error;
    }
    const existing = await fs.readFile(secretPath);
    if (existing.length < 32) {
      throw new Error("Stable Board actor token secret is invalid.");
    }
    await fs.chmod(secretPath, 0o600);
    return existing;
  }
};
