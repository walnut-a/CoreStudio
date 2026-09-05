import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

// 同一台机器上比较变更前后；仅测房间操作，不包含 IPC、渲染和磁盘。
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const bundle = buildSync({
  stdin: {
    contents:
      'export {createProjectRoom} from "./apps/image-board-desktop/electron/room/projectRoom"; export {generateNKeysBetween} from "./packages/fractional-indexing/src/index";',
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  alias: {
    "@excalidraw/fractional-indexing": path.join(
      root,
      "packages/fractional-indexing/src/index.ts",
    ),
  },
});
const { createProjectRoom, generateNKeysBetween } = await import(
  `data:text/javascript;base64,${Buffer.from(
    bundle.outputFiles[0].text,
  ).toString("base64")}`
);
for (const count of [500, 2000, 5000]) {
  const elements = generateNKeysBetween(null, null, count).map((index, i) => ({
    id: `e${i}`,
    type: "rectangle",
    index,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    x: i,
    y: 0,
    width: 100,
    height: 100,
    angle: 0,
    strokeColor: "#000",
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
    boundElements: [],
    updated: 0,
    link: null,
    locked: false,
  }));
  const identity = {
    projectId: "p",
    canonicalProjectPath: "/synthetic",
    roomId: "r",
    sessionEpoch: 1,
  };
  const room = createProjectRoom({
    identity,
    initialScene: { elements, sharedSceneConfig: {} },
    persistedSequence: 0,
    projectRevision: "0",
  });
  try {
    room.join({
      actorId: "desktop",
      sessionId: "s",
      transport: "ipc",
      role: "desktop-editor",
      displayLabel: "benchmark",
    });
    const times = [];
    for (let i = 0; i < 45; i++) {
      const start = performance.now();
      room.applySceneOperation("s", {
        ...identity,
        operationId: `op${i}`,
        baseSequence: i,
        elements: [{ ...elements[0], version: i + 2, x: i }],
      });
      if (i >= 5) times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    console.log(
      JSON.stringify({
        elements: count,
        changedElements: 1,
        samples: times.length,
        medianMs: +times[20].toFixed(3),
        p95Ms: +times[38].toFixed(3),
      }),
    );
  } finally {
    room.close();
  }
}
