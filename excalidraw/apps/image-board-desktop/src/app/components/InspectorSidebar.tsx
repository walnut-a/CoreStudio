import { type ReactNode, type Ref } from "react";

import type {
  ImagePromptReferenceRecord,
  ImageRecord,
} from "../../shared/projectTypes";
import type { ImageLineageEntry } from "../imageRelationships";
import type { GenerationTaskRecord } from "../generationTaskState";
import { copy } from "../copy";
import { DesktopButton } from "./DesktopButton";
import { ImagePalette, type ReadPaletteOriginal } from "./ImagePalette";
import { ImageInspector } from "./ImageInspector";
import { SideDock } from "./SideDock";
import "./ImageInspector.css";

interface InspectorSidebarProps {
  readOriginal?: ReadPaletteOriginal;
  onCopyColor?: (hex: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedShapeActions: ReactNode;
  shouldRenderSelectedShapeActions: boolean;
  isImageCropping: boolean;
  onFinishImageCropping: () => void;
  projectPath?: string | null;
  record: ImageRecord | null;
  ancestorRecords: ImageRecord[];
  descendantRecords: ImageLineageEntry[];
  task: GenerationTaskRecord | null;
  onCopyPrompt: () => void;
  onCopyTaskError: () => void;
  onLocateImageRecord: (fileId: string) => void;
  onLocatePromptReference: (reference: ImagePromptReferenceRecord) => void;
  onCopyImageId?: () => void;
  rootRef?: Ref<HTMLElement>;
}

export const InspectorSidebar = ({
  readOriginal,
  onCopyColor,
  open,
  onOpenChange,
  selectedShapeActions,
  shouldRenderSelectedShapeActions,
  isImageCropping,
  onFinishImageCropping,
  projectPath,
  record,
  ancestorRecords,
  descendantRecords,
  task,
  onCopyPrompt,
  onCopyTaskError,
  onLocateImageRecord,
  onLocatePromptReference,
  onCopyImageId,
  rootRef,
}: InspectorSidebarProps) => {
  return (
    <SideDock
      side="right"
      title={copy.inspector.sidebarTitle}
      open={open}
      onOpenChange={onOpenChange}
      rootRef={rootRef}
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
          {isImageCropping && shouldRenderSelectedShapeActions && (
            <div className="inspector-sidebar__crop-footer">
              <DesktopButton
                type="button"
                size="small"
                variant="primary"
                onClick={onFinishImageCropping}
              >
                {copy.elementActions.finishCrop}
              </DesktopButton>
            </div>
          )}
        </section>

        <ImageInspector
          colorProperties={
            record && readOriginal && onCopyColor ? (
              <ImagePalette
                projectPath={projectPath}
                fileId={record.fileId}
                readOriginal={readOriginal}
                onCopyColor={onCopyColor}
              />
            ) : undefined
          }
          projectPath={projectPath}
          record={record}
          ancestorRecords={ancestorRecords}
          descendantRecords={descendantRecords}
          task={task}
          onCopyPrompt={onCopyPrompt}
          onCopyTaskError={onCopyTaskError}
          onLocateImageRecord={onLocateImageRecord}
          onLocatePromptReference={onLocatePromptReference}
          onCopyImageId={onCopyImageId}
        />
      </div>
    </SideDock>
  );
};
