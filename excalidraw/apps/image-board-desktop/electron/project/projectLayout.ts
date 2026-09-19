import { randomInt } from "node:crypto";
import type { ProjectRoomSceneElement } from "../../src/shared/projectRoomProtocol";
const fields = ["x", "y", "width", "height", "angle"] as const;
type Placement = Record<typeof fields[number], number> & {
  fileId?: string;
  isDeleted?: boolean;
  [key: string]: unknown;
};
export interface ProjectLayout {
  order: string[];
  elements: Record<string, Placement>;
  sceneHash?: string;
  [key: string]: unknown;
}
const object = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const valid = (v: unknown): v is Placement =>
  object(v) &&
  fields.every((k) => typeof v[k] === "number" && Number.isFinite(v[k])) &&
  v.width >= 0 &&
  v.height >= 0;
export const captureLayout = (
  elements: readonly ProjectRoomSceneElement[],
  previous?: ProjectLayout,
): ProjectLayout => {
  const placements: ProjectLayout["elements"] = {
    ...(object(previous?.elements) ? previous?.elements : {}),
  };
  for (const element of elements) {
    if (
      !fields.every(
        (k) => typeof element[k] === "number" && Number.isFinite(element[k]),
      )
    )
      continue;
    // Preserve malformed external entries for manual correction instead of overwriting them.
    if (placements[element.id] && !valid(placements[element.id])) continue;
    placements[element.id] = {
      ...placements[element.id],
      ...Object.fromEntries(fields.map((k) => [k, element[k]])),
      ...(typeof element.fileId === "string" ? { fileId: element.fileId } : {}),
      isDeleted: element.isDeleted === true,
    } as Placement;
  }
  const ids = new Set(
    elements.filter((e) => e.type === "image").map((e) => e.id),
  );
  const order = Array.isArray(previous?.order)
    ? [
        ...new Set(
          previous.order.filter((id) => typeof id === "string" && ids.has(id)),
        ),
      ]
    : [];
  const ordered = new Set(order);
  for (const id of ids) if (!ordered.has(id)) order.push(id);
  return { ...previous, order, elements: placements };
};
export const mergeExternalLayout = (
  baseline: readonly ProjectRoomSceneElement[],
  current: readonly ProjectRoomSceneElement[],
  layout: unknown,
) => {
  const issues: string[] = [];
  if (layout === undefined || layout === null)
    return { elements: [...current], issues };
  if (object(layout) && layout.elements === undefined)
    return { elements: [...current], issues };
  if (!object(layout) || !object(layout.elements))
    throw new Error("整理信息格式错误，已保留原文件。");
  const bases = new Map(baseline.map((e) => [e.id, e]));
  const conflicts: string[] = [];
  const elements = current.map((element) => {
    const external = layout.elements[element.id],
      base = bases.get(element.id);
    if (!external || !base || element.isDeleted || base.isDeleted)
      return element;
    if (
      !valid(external) ||
      (external.fileId !== undefined && external.fileId !== element.fileId)
    ) {
      issues.push(element.id);
      return element;
    }
    const patch: Record<string, number> = {};
    for (const key of fields) {
      if (external[key] === base[key] || external[key] === element[key])
        continue;
      if (element[key] !== base[key]) {
        conflicts.push(`${element.id}.${key}`);
        continue;
      }
      patch[key] = external[key];
    }
    return Object.keys(patch).length
      ? {
          ...element,
          ...patch,
          version: element.version + 1,
          versionNonce: randomInt(0x7fffffff),
        }
      : element;
  });
  if (conflicts.length)
    throw Object.assign(
      new Error(`外部排布与画布编辑冲突：${conflicts.join("、")}`),
      { code: "PROJECT_STORAGE_DIVERGED", details: { conflicts } },
    );
  return { elements, issues };
};
