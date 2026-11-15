import "./GenerateImageDialog.css";

import { useLayoutEffect } from "react";

import { copy } from "../copy";

import { GenerateDialogAdvancedSettings } from "./GenerateDialogAdvancedSettings";
import { GenerateDialogBody } from "./GenerateDialogBody";
import { GenerateDialogComposerSection } from "./GenerateDialogComposerSection";
import {
  useGenerateImageDialogRuntime,
  type UseGenerateImageDialogRuntimeInput,
} from "./GenerateImageDialogRuntime";

export interface GenerateImageDialogProps
  extends UseGenerateImageDialogRuntimeInput {
  expanded?: boolean;
  loading: boolean;
  onPanelElementChange?: (element: HTMLElement | null) => void;
  onOcclusionHeightChange?: (height: number) => void;
}

export const GenerateImageDialog = (props: GenerateImageDialogProps) => {
  const { open, expanded = true, onOcclusionHeightChange } = props;
  const {
    panelRef,
    handleSubmit,
    composerSectionProps,
    bodyProps,
    advancedSettingsProps,
  } = useGenerateImageDialogRuntime(props);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const layer = panel?.parentElement;
    if (!open || !expanded || !panel || !layer || !onOcclusionHeightChange) {
      onOcclusionHeightChange?.(0);
      return;
    }

    const body = panel.querySelector<HTMLElement>(".generate-panel__body");
    const updateOcclusion = () => {
      if (!layer.getClientRects().length) {
        onOcclusionHeightChange(0);
        return;
      }
      // Layout offsets exclude the panel's collapse/expand transform.
      const top =
        layer.getBoundingClientRect().top +
        panel.offsetTop +
        Math.min(0, body?.offsetTop ?? 0);
      onOcclusionHeightChange(Math.max(0, window.innerHeight - top));
    };
    const observer = new ResizeObserver(updateOcclusion);
    observer.observe(layer);
    if (body) {
      observer.observe(body);
    }
    window.addEventListener("resize", updateOcclusion);
    updateOcclusion();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOcclusion);
      onOcclusionHeightChange(0);
    };
  }, [bodyProps.show, expanded, onOcclusionHeightChange, open, panelRef]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={[
        "floating-panel-layer",
        expanded ? "" : "floating-panel-layer--collapsed",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!expanded}
      inert={!expanded}
    >
      <section
        ref={(element) => {
          panelRef.current = element;
          props.onPanelElementChange?.(element);
        }}
        className={[
          "generate-panel",
          bodyProps.show
            ? "generate-panel--expanded"
            : "generate-panel--compact",
        ].join(" ")}
        role="dialog"
        aria-modal="false"
        aria-label={copy.generateDialog.title}
      >
        <form className="generate-panel__form" onSubmit={handleSubmit}>
          <GenerateDialogComposerSection {...composerSectionProps} />
        </form>

        <GenerateDialogBody
          {...bodyProps}
          advancedContent={
            <GenerateDialogAdvancedSettings {...advancedSettingsProps} />
          }
        />
      </section>
    </div>
  );
};
