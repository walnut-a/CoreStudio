import { randomUUID } from "node:crypto";
import fs from "fs/promises";
import path from "path";

import { app } from "electron";

import type {
  SavedPrompt,
  SavePromptInput,
} from "../src/shared/desktopBridgeTypes";

const PROMPT_LIBRARY_FILE_NAME = "prompt-library.json";
const SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";

const getPromptLibraryPath = () =>
  path.join(
    app.getPath("appData"),
    SETTINGS_DIRECTORY_NAME,
    PROMPT_LIBRARY_FILE_NAME,
  );

const writePromptLibrary = async (prompts: SavedPrompt[]) => {
  await fs.mkdir(path.dirname(getPromptLibraryPath()), { recursive: true });
  await fs.writeFile(
    getPromptLibraryPath(),
    JSON.stringify(prompts, null, 2),
    "utf8",
  );
};

const isSavedPrompt = (value: unknown): value is SavedPrompt => {
  const prompt = value as Partial<SavedPrompt> | null;
  return Boolean(
    prompt &&
      typeof prompt.id === "string" &&
      typeof prompt.title === "string" &&
      typeof prompt.content === "string" &&
      Array.isArray(prompt.tags) &&
      typeof prompt.createdAt === "string" &&
      typeof prompt.updatedAt === "string" &&
      typeof prompt.useCount === "number",
  );
};

const sortPromptLibrary = (prompts: SavedPrompt[]) =>
  [...prompts].sort((left, right) => {
    const leftTime = left.lastUsedAt ?? left.updatedAt;
    const rightTime = right.lastUsedAt ?? right.updatedAt;
    if (leftTime !== rightTime) {
      return rightTime.localeCompare(leftTime);
    }
    return left.title.localeCompare(right.title);
  });

const normalizeTags = (tags: readonly string[] | undefined) =>
  Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );

export const loadPromptLibrary = async (): Promise<SavedPrompt[]> => {
  try {
    const contents = await fs.readFile(getPromptLibraryPath(), "utf8");
    const parsed = JSON.parse(contents) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return sortPromptLibrary(parsed.filter(isSavedPrompt));
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

export const savePrompt = async (
  input: SavePromptInput,
): Promise<SavedPrompt[]> => {
  const content = input.content.trim();
  if (!content) {
    return loadPromptLibrary();
  }

  const prompts = await loadPromptLibrary();
  const now = new Date(Date.now()).toISOString();
  const existing = input.id
    ? prompts.find((prompt) => prompt.id === input.id)
    : null;
  const nextPrompt: SavedPrompt = {
    id: existing?.id ?? randomUUID(),
    title:
      input.title.trim() ||
      content.split("\n")[0]?.trim() ||
      "未命名 Prompt",
    content,
    tags: normalizeTags(input.tags),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...(existing?.lastUsedAt ? { lastUsedAt: existing.lastUsedAt } : {}),
    useCount: existing?.useCount ?? 0,
  };
  const nextPrompts = existing
    ? prompts.map((prompt) => (prompt.id === existing.id ? nextPrompt : prompt))
    : [nextPrompt, ...prompts];

  const sortedPrompts = sortPromptLibrary(nextPrompts);
  await writePromptLibrary(sortedPrompts);
  return sortedPrompts;
};

export const deleteSavedPrompt = async (id: string): Promise<SavedPrompt[]> => {
  const prompts = await loadPromptLibrary();
  const nextPrompts = prompts.filter((prompt) => prompt.id !== id);
  await writePromptLibrary(nextPrompts);
  return nextPrompts;
};

export const markSavedPromptUsed = async (
  id: string,
): Promise<SavedPrompt[]> => {
  const prompts = await loadPromptLibrary();
  const now = new Date(Date.now()).toISOString();
  const nextPrompts = prompts.map((prompt) =>
    prompt.id === id
      ? {
          ...prompt,
          lastUsedAt: now,
          useCount: prompt.useCount + 1,
        }
      : prompt,
  );
  const sortedPrompts = sortPromptLibrary(nextPrompts);
  await writePromptLibrary(sortedPrompts);
  return sortedPrompts;
};
