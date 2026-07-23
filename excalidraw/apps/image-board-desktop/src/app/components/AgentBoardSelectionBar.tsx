import { useEffect, useRef, useState } from "react";

import type { GenerationReferencePayload } from "../../shared/providerTypes";

import { buildAgentBoardSelectionContextViewModel } from "../agentBoardSelectionContext";
import { copyPlainTextToClipboard } from "../clipboardText";
import { copy } from "../copy";
import { checkIcon, clearSelectionIcon, copyLinkIcon } from "./CoreStudioIcons";
import { DesktopButton } from "./DesktopButton";

import "./AgentBoardSelectionBar.css";

const COPY_FEEDBACK_DURATION_MS = 1600;

interface AgentBoardSelectionBarProps {
  projectName: string;
  projectId: string;
  reference: GenerationReferencePayload | null;
  onClearSelection: () => void;
  copyText?: (text: string) => Promise<boolean>;
}

export const AgentBoardSelectionBar = ({
  projectName,
  projectId,
  reference,
  onClearSelection,
  copyText = copyPlainTextToClipboard,
}: AgentBoardSelectionBarProps) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const copyOperationIdRef = useRef(0);
  const viewModel = buildAgentBoardSelectionContextViewModel(
    reference,
    copy.agentBoard.selectionContext,
    projectName,
    projectId,
  );
  useEffect(() => {
    copyOperationIdRef.current += 1;
    setCopying(false);
    setFeedback(null);
  }, [reference]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timer = window.setTimeout(
      () => setFeedback(null),
      COPY_FEEDBACK_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const copyReference = async () => {
    if (!viewModel.clipboardText || copying) {
      return;
    }
    const operationId = ++copyOperationIdRef.current;
    setCopying(true);
    try {
      const copied = await copyText(viewModel.clipboardText);
      if (operationId !== copyOperationIdRef.current) {
        return;
      }
      setFeedback(
        copied
          ? copy.agentBoard.selectionContext.copySucceeded
          : copy.agentBoard.selectionContext.copyFailed,
      );
    } catch {
      if (operationId === copyOperationIdRef.current) {
        setFeedback(copy.agentBoard.selectionContext.copyFailed);
      }
    } finally {
      if (operationId === copyOperationIdRef.current) {
        setCopying(false);
      }
    }
  };

  return (
    <section
      className={`agent-board-selection-bar${
        viewModel.selected ? " agent-board-selection-bar--selected" : ""
      }`}
      aria-label={copy.agentBoard.selectionContext.label}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {viewModel.imagePreviews.length ||
      viewModel.counts.text ||
      viewModel.counts.shapes ? (
        <div
          className="agent-board-selection-bar__previews"
          aria-label={copy.agentBoard.selectionContext.previews}
        >
          {viewModel.imagePreviews.map((preview) =>
            preview.thumbnailDataUrl ? (
              <img
                key={preview.id}
                className="agent-board-selection-bar__thumbnail"
                src={preview.thumbnailDataUrl}
                alt={copy.agentBoard.selectionContext.imagePreview(
                  preview.index,
                )}
              />
            ) : (
              <span
                key={preview.id}
                className="agent-board-selection-bar__thumbnail agent-board-selection-bar__thumbnail--missing"
                role="img"
                aria-label={copy.agentBoard.selectionContext.imagePreview(
                  preview.index,
                )}
              >
                {copy.agentBoard.selectionContext.imagePlaceholder}
              </span>
            ),
          )}
          {viewModel.imagePreviewOverflow > 0 ? (
            <span className="agent-board-selection-bar__overflow">
              +{viewModel.imagePreviewOverflow}
            </span>
          ) : null}
          {viewModel.counts.text > 0 ? (
            <span
              className="agent-board-selection-bar__thumbnail agent-board-selection-bar__thumbnail--type"
              role="img"
              aria-label={copy.agentBoard.selectionContext.textIndicator(
                viewModel.counts.text,
              )}
            >
              T<small>{viewModel.counts.text}</small>
            </span>
          ) : null}
          {viewModel.counts.shapes > 0 ? (
            <span
              className="agent-board-selection-bar__thumbnail agent-board-selection-bar__thumbnail--type"
              role="img"
              aria-label={copy.agentBoard.selectionContext.shapeIndicator(
                viewModel.counts.shapes,
              )}
            >
              ◇<small>{viewModel.counts.shapes}</small>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="agent-board-selection-bar__body">
        <strong>{viewModel.summary}</strong>
        {feedback ? (
          <span
            className="agent-board-selection-bar__feedback"
            role="status"
            aria-live="polite"
          >
            {feedback}
          </span>
        ) : null}
      </div>

      {viewModel.selected ? (
        <div className="agent-board-selection-bar__actions">
          <DesktopButton
            size="small"
            type="button"
            onClick={() => void copyReference()}
            disabled={copying}
            className="agent-board-selection-bar__icon-button"
            aria-label={copy.agentBoard.selectionContext.copyReference}
            title={
              feedback === copy.agentBoard.selectionContext.copySucceeded
                ? copy.agentBoard.selectionContext.copySucceeded
                : copy.agentBoard.selectionContext.copyReference
            }
            data-copy-state={
              feedback === copy.agentBoard.selectionContext.copySucceeded
                ? "success"
                : feedback === copy.agentBoard.selectionContext.copyFailed
                ? "failure"
                : "idle"
            }
          >
            {feedback === copy.agentBoard.selectionContext.copySucceeded
              ? checkIcon
              : copyLinkIcon}
          </DesktopButton>
          <DesktopButton
            size="small"
            type="button"
            onClick={onClearSelection}
            className="agent-board-selection-bar__icon-button"
            aria-label={copy.agentBoard.selectionContext.clearSelection}
            title={copy.agentBoard.selectionContext.clearSelection}
          >
            {clearSelectionIcon}
          </DesktopButton>
        </div>
      ) : null}
    </section>
  );
};
