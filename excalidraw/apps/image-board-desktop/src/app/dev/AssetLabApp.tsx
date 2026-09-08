import { useMemo, useState } from "react";

import type { ImageRecord, ImageRecordMap } from "../../shared/projectTypes";
import type { GenerationTaskRecord } from "../generationTaskState";
import { buildImageAssetItems } from "../imageAssetViewModel";
import { ImageAssetSidebar } from "../components/ImageAssetSidebar";
import { ImageBrowseView } from "../components/ImageBrowseView";
import { createImageAssetThumbnailStore } from "../imageAssetThumbnailStore";
import { buildImageBrowseItems } from "../imageBrowseModel";
import { InspectorSidebar } from "../components/InspectorSidebar";

import "./AssetLabApp.css";

const createThumbnail = (from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
      <rect width="100" height="100" rx="18" fill="url(#g)"/>
      <circle cx="68" cy="30" r="12" fill="white" fill-opacity=".72"/>
      <path d="M16 78 42 46l18 19 10-9 16 22Z" fill="white" fill-opacity=".78"/>
    </svg>
  `)}`;

const initialRecords: ImageRecordMap = {
  "imported-reference": {
    fileId: "imported-reference",
    assetPath: "assets/2026-09-04_imported-reference.png",
    sourceType: "imported",
    sourceFileName: "工业设计参考图.png",
    width: 541.7333333333333,
    height: 707.824497257769,
    createdAt: "2026-09-04T08:31:00.000Z",
    mimeType: "image/png",
  },
  "agent-result": {
    fileId: "agent-result",
    assetPath: "assets/2026-09-04_agent-result.png",
    sourceType: "generated",
    generationOrigin: "agent-board",
    provider: "openai",
    model: "gpt-image-1",
    prompt: "把参考图调整成更克制、更精致的桌面级工业设备主视觉",
    width: 1024,
    height: 1024,
    createdAt: "2026-09-04T08:42:00.000Z",
    mimeType: "image/png",
    promptReferences: [
      {
        id: "lab-reference",
        index: 1,
        label: "参考图 1",
        kind: "image",
        fileIds: ["imported-reference"],
      },
    ],
  },
  "unused-concept": {
    fileId: "unused-concept",
    assetPath: "assets/2026-09-04_unused-concept.webp",
    displayName: "桌面 CNC 早期概念",
    sourceFileName: "concept-v2.webp",
    sourceType: "generated",
    generationOrigin: "corestudio",
    generationSource: "builtin",
    provider: "gemini",
    model: "gemini-2.5-flash-image",
    prompt: "桌面 CNC 设备早期概念草图",
    width: 1280,
    height: 853.3333333333334,
    createdAt: "2026-09-04T07:52:00.000Z",
    mimeType: "image/webp",
  },
};

const thumbnails = {
  "imported-reference": createThumbnail("#d9e7ff", "#6c91d8"),
  "agent-result": createThumbnail("#ffd4be", "#dd7658"),
  "unused-concept": createThumbnail("#d4d0ff", "#695fba"),
};

const pendingTask: GenerationTaskRecord = {
  status: "pending",
  provider: "openai",
  model: "openai/gpt-image-2",
  prompt:
    "保持产品结构，生成一张克制的工业设计渲染图，优化金属、玻璃和摄影棚光影。",
  negativePrompt: "",
  seed: null,
  aspectRatio: "3:2",
  width: 1536,
  height: 1024,
  startedAt: "2026-09-08T10:47:22.000Z",
};

export const AssetLabApp = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const scenario = searchParams.get("scenario") ?? "generated";
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    new URLSearchParams(window.location.search).get("theme") === "dark"
      ? "dark"
      : "light",
  );
  const records = initialRecords;
  const [selectedFileId, setSelectedFileId] = useState("agent-result");
  const items = useMemo(
    () =>
      buildImageAssetItems({
        imageRecords: records,
        sceneImageFileIds: ["agent-result"],
      }).map((item) => ({
        ...item,
        thumbnailDataUrl: thumbnails[item.fileId as keyof typeof thumbnails],
      })),
    [],
  );
  const task =
    scenario === "task-pending"
      ? pendingTask
      : scenario === "task-error"
      ? {
          ...pendingTask,
          status: "error" as const,
          errorMessage: "图片输入无法读取",
          rawError: "HTTP 400 INVALID_IMAGE",
          stack: "at requestImage (generation.ts:184:17)",
        }
      : null;
  const isCropping = scenario === "crop";
  const selectedRecord: ImageRecord | null = task
    ? null
    : records[selectedFileId] ?? null;
  const browseFixture = useMemo(() => {
    const store = createImageAssetThumbnailStore();
    const useColorFixture = new URLSearchParams(window.location.search).has(
      "colors",
    );
    const assets = Object.entries(thumbnails).map(([fileId, url], index) => {
      if (useColorFixture) {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 400;
        const ctx = canvas.getContext("2d")!;
        const colors =
          index === 0
            ? ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FFFFFF", "#222222"]
            : index === 1
            ? ["#E9E1D4", "#B6A58B", "#81766A", "#2E2722", "#8B4A3B", "#D8D8DA"]
            : ["#888888"];
        colors.forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.fillRect((i * 800) / colors.length, 0, 800 / colors.length, 400);
        });
        return {
          fileId,
          mimeType: "image/png",
          width: 800,
          height: 400,
          dataBase64: canvas.toDataURL("image/png").split(",")[1],
          createdAt: "2026-09-07",
        };
      }
      return {
        fileId,
        mimeType: "image/svg+xml",
        width: 100,
        height: 100,
        dataBase64: btoa(decodeURIComponent(url.split(",")[1])),
        createdAt: "2026-09-07",
      };
    });
    store.replace("/asset-lab", assets);
    return {
      store,
      readOriginal: async (fileId: string) => {
        // Slow I/O fixture makes an empty switching frame easy to detect.
        await new Promise((resolve) => setTimeout(resolve, 900));
        return assets.find((asset) => asset.fileId === fileId);
      },
    };
  }, []);
  if (new URLSearchParams(window.location.search).has("browse")) {
    return (
      <main className="image-board-app asset-lab" data-theme={theme}>
        <ImageBrowseView
          items={buildImageBrowseItems(Object.keys(records), records)}
          imageRecords={records}
          projectPath="/asset-lab"
          thumbnailStore={browseFixture.store}
          readOriginal={browseFixture.readOriginal}
          onVisibleFileIdsChange={() => undefined}
          onBackToCanvas={() => window.location.assign("/asset-lab.html")}
          onLocateImage={setSelectedFileId}
          onCopyText={(text) => {
            void navigator.clipboard.writeText(text);
          }}
          onCopyColor={(hex) => {
            void navigator.clipboard.writeText(hex);
          }}
        />
      </main>
    );
  }

  return (
    <main className="image-board-app asset-lab" data-theme={theme}>
      <header className="asset-lab__header">
        <div>
          <p>DEVELOPMENT ONLY</p>
          <h1>图片资产 Lab</h1>
          <span>生产组件 · 图片信息、配色、生成状态与编辑链</span>
        </div>
        <button
          type="button"
          onClick={() =>
            setTheme((value) => (value === "light" ? "dark" : "light"))
          }
        >
          {theme === "light" ? "切换深色" : "切换浅色"}
        </button>
      </header>
      <div className="asset-lab__canvas">
        <p>选择左侧资产，在右侧查看统一排版后的图片属性。</p>
      </div>
      <ImageAssetSidebar
        open
        onOpenChange={() => undefined}
        records={items}
        selectedFileId={selectedFileId}
        onSelectRecord={setSelectedFileId}
      />
      <InspectorSidebar
        readOriginal={browseFixture.readOriginal}
        onCopyColor={(hex) => {
          void navigator.clipboard.writeText(hex);
        }}
        projectPath="/Users/designer/Documents/工业设计项目"
        open
        onOpenChange={() => undefined}
        selectedShapeActions={
          isCropping ? (
            <div className="selected-shape-actions">
              <div className="Island">裁切区域与比例控件</div>
            </div>
          ) : null
        }
        shouldRenderSelectedShapeActions={isCropping}
        isImageCropping={isCropping}
        onFinishImageCropping={() => undefined}
        record={selectedRecord}
        ancestorRecords={[]}
        descendantRecords={[]}
        task={task}
        onCopyPrompt={() => undefined}
        onCopyTaskError={() => undefined}
        onLocateImageRecord={setSelectedFileId}
        onLocatePromptReference={() => undefined}
        onCopyImageId={() => undefined}
      />
    </main>
  );
};
