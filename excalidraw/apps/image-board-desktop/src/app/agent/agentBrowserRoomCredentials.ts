let roomResumeToken: string | null = null;

const pageNonceKey = (stableBoardId: string) =>
  `corestudio:stable-board:${stableBoardId}:page-nonce`;
const actorResumeTokenKey = (stableBoardId: string) =>
  `corestudio:stable-board:${stableBoardId}:actor-resume-token`;

export const setAgentBrowserRoomResumeToken = (token: string | null) => {
  roomResumeToken = token;
};

export const getAgentBrowserRoomResumeToken = () => roomResumeToken;

export const getOrCreateStableBoardPageNonce = (
  stableBoardId: string,
  storage: Pick<Storage, "getItem" | "setItem"> = window.sessionStorage,
) => {
  const key = pageNonceKey(stableBoardId);
  const existing = storage.getItem(key);
  if (existing) {
    return existing;
  }
  const pageNonce = crypto.randomUUID();
  storage.setItem(key, pageNonce);
  return pageNonce;
};

export const getStableBoardActorResumeToken = (
  stableBoardId: string,
  storage: Pick<Storage, "getItem"> = window.sessionStorage,
) => storage.getItem(actorResumeTokenKey(stableBoardId));

export const setStableBoardActorResumeToken = (
  stableBoardId: string,
  token: string,
  storage: Pick<Storage, "setItem"> = window.sessionStorage,
) => {
  storage.setItem(actorResumeTokenKey(stableBoardId), token);
};
