import fs from "node:fs/promises";
import {
  readExternalImageIntakeState,
  type IntakeEntry,
  type IntakeState,
} from "./externalImageIntakeState";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { ProjectRoom } from "../room/projectRoom";
import {
  PROJECT_FILENAMES,
  type ImageRecord,
} from "../../src/shared/projectTypes";
import { type ProjectRoomSceneElement } from "../../src/shared/projectRoomProtocol";
import type {
  ExternalImageIntakeIssue,
  ExternalImageIntakeStatus,
} from "../../src/shared/externalImageIntakeTypes";
import { readProjectImageRecords, persistImageAssets } from "../projectFs";
import { writeJsonAtomic } from "./atomicProjectFile";
import {
  registerProjectOriginal,
  withSettledProjectWriteback,
} from "./projectImageWriteback";
import { readRegisteredProjectAsset } from "./projectAssetAccess";
import {
  discoverExternalImageFiles,
  readExternalImageSignature,
  readStableExternalImage,
  classifyExternalImagePath,
  type ExternalImageObservation,
} from "./externalImageFiles";

const getIntakeAnchor = (elements: readonly ProjectRoomSceneElement[]) => {
  let right = -Infinity,
    top = Infinity;
  for (const element of elements) {
    if (element.isDeleted) continue;
    const x = Number(element.x ?? 0),
      y = Number(element.y ?? 0),
      w = Number(element.width ?? 0),
      h = Number(element.height ?? 0),
      angle = Number(element.angle ?? 0);
    if (![x, y, w, h, angle].every(Number.isFinite)) continue;
    const rw = Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle));
    const rh = Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle));
    right = Math.max(right, x + w / 2 + rw / 2);
    top = Math.min(top, y + h / 2 - rh / 2);
  }
  return {
    x: Number.isFinite(right) ? right + 120 : 0,
    y: Number.isFinite(top) ? top : 0,
  };
};

export interface DecodedIntakeImage {
  width: number;
  height: number;
}
export interface ExternalImageIntakeInput {
  room: ProjectRoom;
  decode: (input: {
    buffer: Buffer;
    filePath: string;
    mimeType: string;
  }) => Promise<DecodedIntakeImage>;
  warmCache?: (record: ImageRecord, projectPath: string) => Promise<void>;
  stableMs?: number;
  checkpoint?: (stage: string) => Promise<void>;
}
export class ExternalImageIntake {
  private observations = new Map<string, ExternalImageObservation>();
  private knownHashes = new Map<string, string>();
  private seededIds = new Set<string>();
  private queue: Promise<unknown> = Promise.resolve();
  private discoveryIssues: ExternalImageIntakeIssue[] = [];
  private readonly projectPath: string;
  constructor(private readonly input: ExternalImageIntakeInput) {
    this.projectPath = input.room.identity.canonicalProjectPath;
  }
  private read = () =>
    readExternalImageIntakeState(
      this.projectPath,
      this.input.room.identity.projectId,
    );
  private save = async (state: IntakeState) => {
    const filePath = path.join(this.projectPath, PROJECT_FILENAMES.imageIntake);
    const serialized = JSON.stringify(state, null, 2);
    try {
      if ((await fs.readFile(filePath, "utf8")) === serialized) return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await writeJsonAtomic(filePath, state);
  };
  private active = () =>
    this.input.room.lifecycle === "active" ||
    this.input.room.lifecycle === "storage-error";
  private serial<T>(work: () => Promise<T>): Promise<T> {
    const pending = this.queue.then(work, work);
    this.queue = pending.catch(() => undefined);
    return pending;
  }
  public drain = () => this.queue;
  public confirm = (relativePath: string) =>
    this.serial(async () => {
      const state = await this.read();
      const records = await readProjectImageRecords(this.projectPath);
      if (!this.active()) throw new Error("项目已关闭。");
      if (
        classifyExternalImagePath(relativePath)?.location !== "managed" ||
        state.sources[relativePath]?.hash ||
        Object.values(records).some(
          (record) => record.assetPath === relativePath,
        )
      )
        throw new Error("这张图片不需要来源确认。");
      state.sources[relativePath] = {
        ...state.sources[relativePath],
        confirmed: true,
        attempts: 0,
        nextAttemptAt: 0,
      };
      await this.save(state);
    });
  public async status(): Promise<ExternalImageIntakeStatus> {
    const state = await this.read();
    return {
      issues: [
        ...this.discoveryIssues,
        ...Object.values(state.sources).flatMap((s) =>
          s.issue ? [s.issue] : [],
        ),
      ].slice(0, 100),
    };
  }
  public scan = (options: { now?: number; forceRetry?: boolean } = {}) =>
    this.serial(() => this.run(options));
  private async run({
    now = Date.now(),
    forceRetry = false,
  }: {
    now?: number;
    forceRetry?: boolean;
  }): Promise<ExternalImageIntakeStatus> {
    if (!this.active()) return this.status();
    const state = await this.read();
    try {
      let records = await withSettledProjectWriteback(this.projectPath, () =>
        readProjectImageRecords(this.projectPath),
      );
      for (const [hash, fileId] of this.knownHashes)
        if (!records[fileId]) this.knownHashes.delete(hash);
      for (const record of Object.values(records)) {
        if (record.contentHash) {
          this.knownHashes.set(record.contentHash, record.fileId);
          continue;
        }
        if (this.seededIds.has(record.fileId)) continue;
        try {
          const buffer = await readRegisteredProjectAsset(
            this.projectPath,
            record,
          );
          this.knownHashes.set(
            createHash("sha256").update(buffer).digest("hex"),
            record.fileId,
          );
          this.seededIds.add(record.fileId);
        } catch {
          /* Health inspection owns missing legacy originals. */
        }
      }
      const discovery = await discoverExternalImageFiles(this.projectPath, {
        recursive: true,
      });
      this.discoveryIssues = discovery.issues.map((issue) => ({
        ...issue,
        kind: "failed",
      }));
      const knownPaths = new Set(
        Object.values(records).map((record) => record.assetPath),
      );
      const batchId = randomUUID();
      let batchIndex = 0;
      const ready = new Map<string, IntakeEntry[]>();
      const anchor = getIntakeAnchor(
        this.input.room.getSnapshot().scene.elements,
      );
      const pendingPaths = new Set(
        Object.values(state.entries)
          .filter((e) => e.phase === "pending")
          .map((e) => e.path),
      );
      for (const candidate of discovery.files.sort(
        (a, b) =>
          Number(a.storageMode === "copy-to-assets") -
          Number(b.storageMode === "copy-to-assets"),
      )) {
        if (!this.active()) break;
        if (batchIndex >= 8) {
          this.discoveryIssues.push({
            path: ".",
            kind: "waiting",
            message: "剩余图片正在排队，将继续分批接纳。",
          });
          break;
        }
        const relative = candidate.relativePath;
        const source = state.sources[relative] ?? {};
        if (
          knownPaths.has(relative) &&
          !source.hash &&
          !pendingPaths.has(relative)
        )
          continue;
        if (
          candidate.location === "managed" &&
          !knownPaths.has(relative) &&
          !source.confirmed &&
          !pendingPaths.has(relative)
        ) {
          state.sources[relative] = {
            ...source,
            issue: {
              path: relative,
              kind: "needs-confirmation",
              message:
                "未登记的受管文件，需要确认来源后接纳；不会猜测恢复旧资产。",
            },
          };
          continue;
        }
        let attemptSignature: string | undefined;
        try {
          attemptSignature = await readExternalImageSignature(
            this.projectPath,
            relative,
          );
          // A repaired/replaced file gets a fresh retry budget, including after restart.
          // Keep the accepted signature/hash unchanged so replacements cannot overwrite originals.
          if (source.attempts && source.failedSignature !== attemptSignature) {
            source.attempts = 0;
            source.nextAttemptAt = 0;
            delete source.failedSignature;
          }
          if (
            !forceRetry &&
            ((source.attempts ?? 0) >= 5 || (source.nextAttemptAt ?? 0) > now)
          )
            continue;
          if (
            source.hash &&
            source.signature &&
            (state.entries[source.hash]?.phase === "accepted" ||
              this.knownHashes.has(source.hash)) &&
            attemptSignature === source.signature
          )
            continue;
          const file = await readStableExternalImage({
            projectPath: this.projectPath,
            relativePath: relative,
            previous: this.observations.get(relative),
            now,
            stableMs: this.input.stableMs ?? 1000,
          });
          this.observations.set(relative, file.observation);
          if (file.status === "waiting") {
            state.sources[relative] = {
              ...source,
              issue: {
                path: relative,
                kind: "waiting",
                message: "等待文件写入完成。",
              },
            };
            continue;
          }
          if (!this.active()) break;
          const hash = file.contentHash;
          if (source.hash && source.hash !== hash) {
            state.sources[relative] = {
              ...source,
              issue: {
                path: relative,
                kind: "changed",
                message:
                  "文件内容已被替换；请恢复原图，需要作为新图片加入时请另存为新文件。",
              },
            };
            continue;
          }
          let entry: IntakeEntry | undefined = state.entries[hash];
          if (
            entry?.phase === "accepted" ||
            (!entry && this.knownHashes.has(hash))
          ) {
            state.sources[relative] = {
              hash,
              signature: file.observation.signature,
            };
            continue;
          }
          if (!entry) {
            if (batchIndex >= 8) continue;
            const decoded = await this.input.decode({
              buffer: file.buffer,
              filePath: path.join(this.projectPath, relative),
              mimeType: candidate.mimeType,
            });
            if (!this.active()) break;
            if (
              !Number.isFinite(decoded.width) ||
              !Number.isFinite(decoded.height) ||
              decoded.width <= 0 ||
              decoded.height <= 0 ||
              decoded.width * decoded.height > 64_000_000
            )
              throw new Error("图片尺寸无效或超过 6400 万像素限制。");
            const fileId = `intake-${hash}`;
            const scale = Math.min(
              1,
              640 / Math.max(decoded.width, decoded.height),
            );
            const record: ImageRecord = {
              fileId,
              assetPath: relative,
              sourceFileName: path.basename(relative),
              contentHash: hash,
              sourceType: "imported",
              mimeType: candidate.mimeType,
              width: decoded.width,
              height: decoded.height,
              createdAt: new Date(now).toISOString(),
            };
            const element: ProjectRoomSceneElement = {
              id: `intake-${hash.slice(0, 32)}`,
              type: "image",
              fileId,
              x: anchor.x + (batchIndex % 3) * 700,
              y: anchor.y + Math.floor(batchIndex / 3) * 700,
              width: decoded.width * scale,
              height: decoded.height * scale,
              angle: 0,
              strokeColor: "transparent",
              backgroundColor: "transparent",
              fillStyle: "solid",
              strokeWidth: 1,
              strokeStyle: "solid",
              roughness: 0,
              opacity: 100,
              groupIds: [],
              frameId: null,
              roundness: null,
              seed: 1,
              version: 1,
              versionNonce: 1,
              isDeleted: false,
              boundElements: null,
              updated: now,
              link: null,
              locked: false,
              status: "saved",
              scale: [1, 1],
            };
            entry = {
              hash,
              path: relative,
              phase: "pending",
              batchId,
              element,
              record,
              cache: "pending",
            };
            state.entries[hash] = entry;
            batchIndex++;
            state.sources[relative] = {
              hash,
              signature: file.observation.signature,
            };
            await this.save(state);
            await this.input.checkpoint?.("journal-saved");
          }
          state.sources[relative] = {
            hash,
            signature: file.observation.signature,
          };
          const existing = records[entry.record.fileId];
          if (existing) {
            if (existing.contentHash !== hash)
              throw new Error("图片 ID 与已有记录冲突。");
            await readRegisteredProjectAsset(this.projectPath, existing);
            entry.record = existing;
          } else if (candidate.storageMode === "copy-to-assets") {
            records = await persistImageAssets({
              projectPath: this.projectPath,
              files: [
                { ...entry.record, dataBase64: file.buffer.toString("base64") },
              ],
            });
            entry.record = records[entry.record.fileId];
          } else
            records = await registerProjectOriginal({
              projectPath: this.projectPath,
              record: entry.record,
            });
          await this.save(state);
          await this.input.checkpoint?.("asset-saved");
          if (!this.active()) break;
          const group = ready.get(entry.batchId) ?? [];
          if (!group.includes(entry)) group.push(entry);
          ready.set(entry.batchId, group);
        } catch (error) {
          const attempts = (source.attempts ?? 0) + 1;
          state.sources[relative] = {
            ...state.sources[relative],
            attempts,
            failedSignature: attemptSignature,
            nextAttemptAt: now + Math.min(60_000, 1000 * 2 ** attempts),
            issue: {
              path: relative,
              kind: "failed",
              attempts,
              message: error instanceof Error ? error.message : String(error),
            },
          };
          await this.save(state);
        }
      }
      // A committed inbox copy can finish independently of its now removed source.
      for (const entry of Object.values(state.entries).filter(
        (entry) => entry.phase === "pending",
      )) {
        if (!this.active()) break;
        const source = state.sources[entry.path] ?? {};
        if (
          !forceRetry &&
          ((source.attempts ?? 0) >= 5 || (source.nextAttemptAt ?? 0) > now)
        )
          continue;
        const existing = records[entry.record.fileId];
        if (!existing) continue;
        try {
          if (existing.contentHash !== entry.hash)
            throw new Error("恢复任务与图片身份不一致。");
          await readRegisteredProjectAsset(this.projectPath, existing);
          entry.record = existing;
          const group = ready.get(entry.batchId) ?? [];
          if (!group.includes(entry)) group.push(entry);
          ready.set(entry.batchId, group);
        } catch (error) {
          state.sources[entry.path] = {
            ...source,
            attempts: (source.attempts ?? 0) + 1,
            issue: { path: entry.path, kind: "failed", message: String(error) },
          };
        }
      }
      const readyEntries = new Set([...ready.values()].flat());
      for (const entry of Object.values(state.entries)
        .filter(
          (e) =>
            (e.phase === "accepted" || readyEntries.has(e)) &&
            e.cache !== "ready" &&
            (forceRetry ||
              ((state.sources[e.path]?.attempts ?? 0) < 5 &&
                (state.sources[e.path]?.nextAttemptAt ?? 0) <= now)),
        )
        .slice(0, 8)) {
        if (!this.active()) break;
        const source = state.sources[entry.path] ?? {};
        if (!forceRetry && (source.attempts ?? 0) >= 5) continue;
        try {
          await this.input.warmCache?.(entry.record, this.projectPath);
          entry.cache = "ready";
          if (source.issue?.kind === "cache")
            state.sources[entry.path] = {
              hash: entry.hash,
              signature: source.signature,
            };
        } catch (error) {
          state.sources[entry.path] = {
            ...source,
            attempts: (source.attempts ?? 0) + 1,
            nextAttemptAt:
              now + Math.min(60000, 1000 * 2 ** ((source.attempts ?? 0) + 1)),
            issue: {
              path: entry.path,
              kind: "cache",
              message: `原图已接纳，显示缓存待重试：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          };
        }
      }
      for (const [id, entries] of ready) {
        if (!this.active()) break;
        try {
          const room = this.input.room;
          // Publish only this batch so a stale index snapshot cannot replace
          // metadata changed by another participant while decoding.
          room.publishAssetRecords(
            Object.fromEntries(
              entries.map((entry) => [entry.record.fileId, entry.record]),
            ),
          );
          const current = new Set(
            room.getSnapshot().scene.elements.map((element) => element.id),
          );
          const freshEntries = entries.filter(
            (entry) => !current.has(entry.element.id),
          );
          if (freshEntries.length) {
            const batchIds = new Set(entries.map((entry) => entry.element.id));
            const latestAnchor = getIntakeAnchor(
              room
                .getSnapshot()
                .scene.elements.filter((element) => !batchIds.has(element.id)),
            );
            const left = Math.min(
              ...freshEntries.map((entry) => Number(entry.element.x)),
            );
            const shift = Math.max(0, latestAnchor.x - left);
            if (shift) {
              for (const entry of freshEntries)
                entry.element = {
                  ...entry.element,
                  x: Number(entry.element.x) + shift,
                };
            }
          }
          const elements = freshEntries.map((entry) => entry.element);
          if (elements.length)
            room.applyExternalIntakeOperation({
              ...room.identity,
              operationId: `intake-${id}`,
              baseSequence: room.sequence,
              elements,
            });
          await room.flushPersistence();
          await this.input.checkpoint?.("scene-saved");
          for (const entry of entries) {
            entry.phase = "accepted";
            const source = state.sources[entry.path];
            state.sources[entry.path] =
              source?.issue?.kind === "cache"
                ? source
                : {
                    hash: entry.hash,
                    signature: source?.signature,
                  };
            this.knownHashes.set(entry.hash, entry.record.fileId);
          }
          await this.save(state);
        } catch (error) {
          for (const entry of entries)
            state.sources[entry.path] = {
              ...state.sources[entry.path],
              attempts: (state.sources[entry.path]?.attempts ?? 0) + 1,
              nextAttemptAt:
                now +
                Math.min(
                  60000,
                  1000 * 2 ** ((state.sources[entry.path]?.attempts ?? 0) + 1),
                ),
              issue: {
                path: entry.path,
                kind: "failed",
                message: error instanceof Error ? error.message : String(error),
              },
            };
          await this.save(state);
        }
      }
      await this.save(state);
    } catch (error) {
      this.discoveryIssues.push({
        path: ".",
        kind: "failed",
        message: String(error),
      });
      throw error;
    }
    return this.status();
  }
}
export const createExternalImageIntake = (input: ExternalImageIntakeInput) =>
  new ExternalImageIntake(input);
