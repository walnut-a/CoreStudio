import type { ImageRecord } from "../../shared/projectTypes";
import type { ImageLineageEntry } from "../imageRelationships";
import { copy } from "../copy";
import { ImageInspector } from "./ImageInspector";
import type { GenerationTaskRecord } from "./ImageInspector";
import { SideDock } from "./SideDock";

interface ImageSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ImageRecord | null;
  parentRecord: ImageRecord | null;
  ancestorRecords: ImageRecord[];
  descendantRecords: ImageLineageEntry[];
  task: GenerationTaskRecord | null;
  onCopyPrompt: () => void;
  onCopyTaskError: () => void;
}

export const ImageSidebar = ({
  open,
  onOpenChange,
  record,
  parentRecord,
  ancestorRecords,
  descendantRecords,
  task,
  onCopyPrompt,
  onCopyTaskError,
}: ImageSidebarProps) => {
  return (
    <SideDock
      side="right"
      title={copy.inspector.title}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ImageInspector
        record={record}
        parentRecord={parentRecord}
        ancestorRecords={ancestorRecords}
        descendantRecords={descendantRecords}
        task={task}
        onCopyPrompt={onCopyPrompt}
        onCopyTaskError={onCopyTaskError}
      />
    </SideDock>
  );
};
