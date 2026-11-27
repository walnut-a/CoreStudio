import { createHash, timingSafeEqual } from "node:crypto";

export const matchesBridgeToken = (candidate: unknown, expected?: string) => {
  if (typeof candidate !== "string" || !expected) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(expected));
};
