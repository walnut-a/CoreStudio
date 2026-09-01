import type { ComponentProps } from "react";

import { ApplicationSettingsDialog } from "./ApplicationSettingsDialog";
import { GenerationErrorDetailsDialog } from "./GenerationErrorDetailsDialog";
import { ProjectDataReportDialog } from "./ProjectDataReportDialog";

export interface AppGlobalDialogsProps {
  appSettings: ComponentProps<typeof ApplicationSettingsDialog>;
  projectDataReport: ComponentProps<typeof ProjectDataReportDialog>;
  generationErrorDetails: ComponentProps<typeof GenerationErrorDetailsDialog>;
}

export const AppGlobalDialogs = ({
  appSettings,
  projectDataReport,
  generationErrorDetails,
}: AppGlobalDialogsProps) => (
  <>
    <ApplicationSettingsDialog {...appSettings} />
    <ProjectDataReportDialog {...projectDataReport} />
    <GenerationErrorDetailsDialog {...generationErrorDetails} />
  </>
);
