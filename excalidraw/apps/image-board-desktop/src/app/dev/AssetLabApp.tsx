import { useMemo, useState } from "react";

import type { ImageRecord, ImageRecordMap } from "../../shared/projectTypes";
import { buildImageAssetItems } from "../imageAssetViewModel";
import { ImageAssetSidebar } from "../components/ImageAssetSidebar";
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

export const AssetLabApp = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [records, setRecords] = useState(initialRecords);
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
    [records],
  );
  const selectedRecord: ImageRecord | null = records[selectedFileId] ?? null;

  return (
    <main className="image-board-app asset-lab" data-theme={theme}>
      <header className="asset-lab__header">
        <div>
          <p>DEVELOPMENT ONLY</p>
          <h1>图片资产 Lab</h1>
          <span>生产组件 · 列表、筛选、详情与重命名</span>
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
        <p>选择左侧资产，在右侧查看提示词、重命名和技术信息。</p>
      </div>
      <ImageAssetSidebar
        open
        onOpenChange={() => undefined}
        records={items}
        selectedFileId={selectedFileId}
        onSelectRecord={setSelectedFileId}
      />
      <InspectorSidebar
        open
        onOpenChange={() => undefined}
        selectedShapeActions={null}
        shouldRenderSelectedShapeActions={false}
        isImageCropping={false}
        onFinishImageCropping={() => undefined}
        record={selectedRecord}
        ancestorRecords={[]}
        descendantRecords={[]}
        task={null}
        onCopyPrompt={() => undefined}
        onCopyTaskError={() => undefined}
        onLocateImageRecord={setSelectedFileId}
        onLocatePromptReference={() => undefined}
        onCopyImageId={() => undefined}
        onRenameImage={async (displayName) => {
          setRecords((current) => ({
            ...current,
            [selectedFileId]: {
              ...current[selectedFileId],
              ...(displayName ? { displayName } : { displayName: undefined }),
            },
          }));
        }}
      />
    </main>
  );
};
