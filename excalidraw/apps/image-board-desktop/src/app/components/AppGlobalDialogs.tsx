import type { ComponentProps } from "react";

import { AboutDialog } from "./AboutDialog";
import { ApplicationSettingsDialog } from "./ApplicationSettingsDialog";
import { GenerationErrorDetailsDialog } from "./GenerationErrorDetailsDialog";
import { ProjectDataReportDialog } from "./ProjectDataReportDialog";

export interface AppGlobalDialogsProps {
  about: ComponentProps<typeof AboutDialog>;
  appSettings: ComponentProps<typeof ApplicationSettingsDialog>;
  projectDataReport: ComponentProps<typeof ProjectDataReportDialog>;
  generationErrorDetails: ComponentProps<typeof GenerationErrorDetailsDialog>;
}

export const AppGlobalDialogs = ({
  about,
  appSettings,
  projectDataReport,
  generationErrorDetails,
}: AppGlobalDialogsProps) => (
  <>
    <AboutDialog {...about} />
    <ApplicationSettingsDialog {...appSettings} />
    <ProjectDataReportDialog {...projectDataReport} />
    <GenerationErrorDetailsDialog {...generationErrorDetails} />
  </>
);
