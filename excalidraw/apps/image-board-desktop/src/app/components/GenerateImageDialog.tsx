import "./GenerateImageDialog.css";

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
  loading: boolean;
}

export const GenerateImageDialog = (props: GenerateImageDialogProps) => {
  const { open } = props;
  const {
    panelRef,
    handleSubmit,
    composerSectionProps,
    bodyProps,
    advancedSettingsProps,
  } = useGenerateImageDialogRuntime(props);

  if (!open) {
    return null;
  }

  return (
    <div className="floating-panel-layer">
      <section
        ref={panelRef}
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
