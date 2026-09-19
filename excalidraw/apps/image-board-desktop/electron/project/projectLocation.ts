import fs from "node:fs/promises";
import path from "node:path";
export interface ProjectLocationIdentity {
  projectId: string;
  directoryId?: string;
}
export const readProjectLocationIdentity = async (
  root: string,
): Promise<ProjectLocationIdentity> => {
  const stat = await fs.lstat(root, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error("项目位置不是普通文件夹。");
  const doc = JSON.parse(
    await fs.readFile(path.join(root, "project.json"), "utf8"),
  );
  if (typeof doc.projectId !== "string" || !doc.projectId)
    throw new Error("项目身份缺失。");
  return { projectId: doc.projectId, directoryId: `${stat.dev}:${stat.ino}` };
};
export const resolveRenamedProject = async (
  previousPath: string,
  expected: ProjectLocationIdentity,
): Promise<string> => {
  const parent = path.dirname(previousPath);
  const matches: Array<{ path: string; identity: ProjectLocationIdentity }> =
    [];
  for (const entry of await fs.readdir(parent, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const candidate = path.join(parent, entry.name);
    try {
      const identity = await readProjectLocationIdentity(candidate);
      if (identity.projectId === expected.projectId)
        matches.push({ path: candidate, identity });
    } catch {
      /* Other folders need not be CoreStudio projects. */
    }
  }
  if (
    matches.length !== 1 ||
    (expected.directoryId &&
      matches[0].identity.directoryId !== expected.directoryId)
  ) {
    throw Object.assign(
      new Error("无法唯一确认改名后的项目，请重新定位项目文件夹。"),
      { code: "PROJECT_PATH_MISSING" },
    );
  }
  return fs.realpath(matches[0].path);
};
