import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

import type {
  ImagePromptReferenceRecord,
  ImageRecord,
} from "../../shared/projectTypes";
import type { ImageLineageEntry } from "../imageRelationships";
import type { GenerationTaskRecord } from "../generationTaskState";
import { copy } from "../copy";
import { cropImageIcon } from "./CoreStudioIcons";
import { ImageInspector } from "./ImageInspector";
import { SideDock } from "./SideDock";
import "./ImageInspector.css";

interface InspectorSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedShapeActions: ReactNode;
  shouldRenderSelectedShapeActions: boolean;
  isImageCropping: boolean;
  onFinishImageCropping: () => void;
  record: ImageRecord | null;
  ancestorRecords: ImageRecord[];
  descendantRecords: ImageLineageEntry[];
  task: GenerationTaskRecord | null;
  onCopyPrompt: () => void;
  onCopyTaskError: () => void;
  onLocateImageRecord: (fileId: string) => void;
  onLocatePromptReference: (reference: ImagePromptReferenceRecord) => void;
  onCopyImageId?: () => void;
  onRenameImage?: (displayName: string | null) => Promise<void> | void;
  rootRef?: Ref<HTMLElement>;
}

export const InspectorSidebar = ({
  open,
  onOpenChange,
  selectedShapeActions,
  shouldRenderSelectedShapeActions,
  isImageCropping,
  onFinishImageCropping,
  record,
  ancestorRecords,
  descendantRecords,
  task,
  onCopyPrompt,
  onCopyTaskError,
  onLocateImageRecord,
  onLocatePromptReference,
  onCopyImageId,
  onRenameImage,
  rootRef,
}: InspectorSidebarProps) => {
  const elementActionsHostRef = useRef<HTMLDivElement | null>(null);
  const [elementActionList, setElementActionList] =
    useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const nextActionList =
      isImageCropping && shouldRenderSelectedShapeActions
        ? elementActionsHostRef.current?.querySelector<HTMLElement>(
            ".selected-shape-actions fieldset:last-of-type .buttonList",
          ) ?? null
        : null;
    setElementActionList((current) =>
      current === nextActionList ? current : nextActionList,
    );
  }, [isImageCropping, selectedShapeActions, shouldRenderSelectedShapeActions]);

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
          <div
            ref={elementActionsHostRef}
            className="inspector-sidebar__section-body"
          >
            {shouldRenderSelectedShapeActions ? (
              selectedShapeActions
            ) : (
              <p className="inspector-sidebar__empty">
                {copy.inspector.selectElementHint}
              </p>
            )}
          </div>
          {elementActionList &&
            createPortal(
              <button
                type="button"
                className="ToolIcon ToolIcon_type_toggle ToolIcon_size_medium ToolIcon--checked inspector-sidebar__active-crop-action"
                title={copy.elementActions.finishCrop}
                aria-label={copy.elementActions.finishCrop}
                aria-pressed="true"
                onClick={onFinishImageCropping}
              >
                <span className="ToolIcon__icon" aria-hidden="true">
                  {cropImageIcon}
                </span>
              </button>,
              elementActionList,
            )}
        </section>

        <section className="inspector-sidebar__section inspector-sidebar__section--image">
          <header className="inspector-sidebar__section-header">
            <h3>{copy.inspector.title}</h3>
          </header>
          <ImageInspector
            record={record}
            ancestorRecords={ancestorRecords}
            descendantRecords={descendantRecords}
            task={task}
            onCopyPrompt={onCopyPrompt}
            onCopyTaskError={onCopyTaskError}
            onLocateImageRecord={onLocateImageRecord}
            onLocatePromptReference={onLocatePromptReference}
            onCopyImageId={onCopyImageId}
            onRenameImage={onRenameImage}
          />
        </section>
      </div>
    </SideDock>
  );
};
