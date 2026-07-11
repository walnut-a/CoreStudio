export const getSceneContentHash = (sceneJson: string) => {
  let hash = 2166136261;

  for (let index = 0; index < sceneJson.length; index += 1) {
    hash ^= sceneJson.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${sceneJson.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
};
