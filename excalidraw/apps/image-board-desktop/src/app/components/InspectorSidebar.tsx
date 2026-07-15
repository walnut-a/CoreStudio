import type { ReactNode } from "react";

import type {
  ImagePromptReferenceRecord,
  ImageRecord,
} from "../../shared/projectTypes";
import type { ImageLineageEntry } from "../imageRelationships";
import type { GenerationTaskRecord } from "../generationTaskState";
import { copy } from "../copy";
import { ImageInspector } from "./ImageInspector";
import { SideDock } from "./SideDock";
import "./ImageInspector.css";

interface InspectorSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedShapeActions: ReactNode;
  shouldRenderSelectedShapeActions: boolean;
  record: ImageRecord | null;
  parentRecord: ImageRecord | null;
  ancestorRecords: ImageRecord[];
  descendantRecords: ImageLineageEntry[];
  task: GenerationTaskRecord | null;
  onCopyPrompt: () => void;
  onCopyTaskError: () => void;
  onLocateImageRecord: (fileId: string) => void;
  onLocatePromptReference: (reference: ImagePromptReferenceRecord) => void;
}

export const InspectorSidebar = ({
  open,
  onOpenChange,
  selectedShapeActions,
  shouldRenderSelectedShapeActions,
  record,
  parentRecord,
  ancestorRecords,
  descendantRecords,
  task,
  onCopyPrompt,
  onCopyTaskError,
  onLocateImageRecord,
  onLocatePromptReference,
}: InspectorSidebarProps) => {
  return (
    <SideDock
      side="right"
      title={copy.inspector.sidebarTitle}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="inspector-sidebar">
        <section className="inspector-sidebar__section inspector-sidebar__section--actions">
          <header className="inspector-sidebar__section-header">
            <h3>{copy.elementActions.title}</h3>
          </header>
          <div className="inspector-sidebar__section-body">
            {shouldRenderSelectedShapeActions ? (
              selectedShapeActions
            ) : (
              <p className="inspector-sidebar__empty">
                {copy.inspector.selectElementHint}
              </p>
            )}
          </div>
        </section>

        <section className="inspector-sidebar__section inspector-sidebar__section--image">
          <header className="inspector-sidebar__section-header">
            <h3>{copy.inspector.title}</h3>
          </header>
          <ImageInspector
            record={record}
            parentRecord={parentRecord}
            ancestorRecords={ancestorRecords}
            descendantRecords={descendantRecords}
            task={task}
            onCopyPrompt={onCopyPrompt}
            onCopyTaskError={onCopyTaskError}
            onLocateImageRecord={onLocateImageRecord}
            onLocatePromptReference={onLocatePromptReference}
          />
        </section>
      </div>
    </SideDock>
  );
};
