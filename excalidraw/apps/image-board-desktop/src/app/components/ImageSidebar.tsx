import { DefaultSidebar, Sidebar } from "@excalidraw/excalidraw";

import type { ImageRecord } from "../../shared/projectTypes";
import type { ImageLineageEntry } from "../imageRelationships";
import { copy } from "../copy";
import { ImageInspector } from "./ImageInspector";
import type { GenerationTaskRecord } from "./ImageInspector";

export const IMAGE_INFO_SIDEBAR_TAB = "image-board-image-info";

const imageInfoTabIcon = (
  <svg
    aria-hidden="true"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
    <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
    <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
  </svg>
);

interface ImageSidebarProps {
  record: ImageRecord | null;
  parentRecord: ImageRecord | null;
  ancestorRecords: ImageRecord[];
  descendantRecords: ImageLineageEntry[];
  task: GenerationTaskRecord | null;
  onCopyPrompt: () => void;
  onCopyTaskError: () => void;
  onReuseSettings: () => void;
}

export const ImageSidebar = ({
  record,
  parentRecord,
  ancestorRecords,
  descendantRecords,
  task,
  onCopyPrompt,
  onCopyTaskError,
  onReuseSettings,
}: ImageSidebarProps) => {
  return (
    <DefaultSidebar docked onDock={false}>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger
          tab={IMAGE_INFO_SIDEBAR_TAB}
          title={copy.inspector.title}
          aria-label={copy.inspector.title}
        >
          {imageInfoTabIcon}
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>

      <Sidebar.Tab tab={IMAGE_INFO_SIDEBAR_TAB}>
        <ImageInspector
          record={record}
          parentRecord={parentRecord}
          ancestorRecords={ancestorRecords}
          descendantRecords={descendantRecords}
          task={task}
          onCopyPrompt={onCopyPrompt}
          onCopyTaskError={onCopyTaskError}
          onReuseSettings={onReuseSettings}
        />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
