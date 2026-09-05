import { createHash } from "node:crypto";
import type { AgentWriteRequest } from "../room/projectRoomAgentWriter";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
};

const withoutImageReadMetadata = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const {
    fileId: _id,
    createdAt: _createdAt,
    ...content
  } = value as Record<string, unknown>;
  return content;
};

export const parseAgentWriteRequest = (
  command: string,
  body: Record<string, unknown>,
): AgentWriteRequest | undefined => {
  const { requestId, ...content } = body;
  if (requestId === undefined) return undefined;
  if (
    typeof requestId !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(requestId)
  ) {
    throw Object.assign(
      new Error(
        "requestId must contain 1–128 letters, digits, dots, underscores, colons or hyphens.",
      ),
      { code: "BAD_REQUEST" },
    );
  }
  const normalized =
    command === "scene.addImage"
      ? {
          ...(withoutImageReadMetadata(content) as Record<string, unknown>),
          ...(Array.isArray(content.files)
            ? { files: content.files.map(withoutImageReadMetadata) }
            : {}),
        }
      : content;
  return {
    id: requestId,
    fingerprint: createHash("sha256")
      .update(JSON.stringify(canonicalize({ command, content: normalized })))
      .digest("hex"),
  };
};
