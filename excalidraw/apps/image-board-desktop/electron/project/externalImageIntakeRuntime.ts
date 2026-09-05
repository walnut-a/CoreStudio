import { classifyExternalImagePath } from "./externalImageFiles";
import { watch, type FSWatcher } from "node:fs";
import type { ProjectRoom } from "../room/projectRoom";
import {
  createExternalImageIntake,
  type ExternalImageIntakeInput,
} from "./externalImageIntake";

// Each loaded Room owns one intake queue. A tab's focus and renderer lifetime are irrelevant.
export const createExternalImageIntakeRuntime = (
  dependencies: Omit<ExternalImageIntakeInput, "room">,
) => {
  let scanQueue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(work: () => Promise<T>) => {
    const pending = scanQueue.then(work, work);
    scanQueue = pending.catch(() => undefined);
    return pending;
  };
  const workers = new Map<
    ProjectRoom,
    {
      intake: ReturnType<typeof createExternalImageIntake>;
      stop: () => Promise<unknown>;
    }
  >();
  const attach = (room: ProjectRoom) => {
    if (room.lifecycle !== "active" && room.lifecycle !== "storage-error")
      throw new Error("项目已关闭，不能启动图片接纳。");
    const existing = workers.get(room);
    if (existing) return existing.intake;
    const intake = createExternalImageIntake({ ...dependencies, room });
    let closed = false,
      busy = false,
      nextDelay = 15000,
      scheduledAt = 0,
      timer: ReturnType<typeof setTimeout> | undefined,
      watcher: FSWatcher | undefined;
    const schedule = (delay = 1500) => {
      if (closed || busy) return;
      if (timer && scheduledAt <= Date.now() + delay) return;
      clearTimeout(timer);
      scheduledAt = Date.now() + delay;
      timer = setTimeout(run, delay);
      timer.unref?.();
    };
    const run = async () => {
      timer = undefined;
      if (closed) return;
      busy = true;
      try {
        const status = await enqueue(() => intake.scan());
        nextDelay = status.issues.some((issue) => issue.kind === "waiting")
          ? 1500
          : 15000;
      } catch (error) {
        console.warn("[image-intake]", room.identity.projectId, error);
      } finally {
        busy = false;
        schedule(nextDelay);
      }
    };
    try {
      watcher = watch(
        room.identity.canonicalProjectPath,
        { recursive: true },
        (_event, filename) => {
          if (
            !filename ||
            classifyExternalImagePath(filename.toString()) ||
            !filename.toString().includes(".")
          )
            schedule();
        },
      );
      watcher.on("error", () => {
        watcher?.close();
        watcher = undefined;
      });
    } catch {
      /* The periodic reconciliation remains available when watch is unsupported. */
    }
    workers.set(room, {
      intake,
      stop: async () => {
        closed = true;
        clearTimeout(timer);
        watcher?.close();
        await intake.drain();
        workers.delete(room);
      },
    });
    schedule(100);
    return intake;
  };
  return {
    attach,
    scan: (
      room: ProjectRoom,
      options?: Parameters<
        ReturnType<typeof createExternalImageIntake>["scan"]
      >[0],
    ) =>
      enqueue(async () => {
        const intake = attach(room);
        const status = await intake.scan(options);
        if (
          options?.forceRetry &&
          status.issues.some((issue) => issue.kind === "waiting")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1250));
          return intake.scan(options);
        }
        return status;
      }),
    stop: async (room: ProjectRoom) => workers.get(room)?.stop(),
  };
};
