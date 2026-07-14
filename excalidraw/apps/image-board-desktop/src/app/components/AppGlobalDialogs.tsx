import type { ComponentProps } from "react";

import { AboutDialog } from "./AboutDialog";
import { AcpRunLogDialog } from "./AcpRunLogDialog";
import { ApplicationSettingsDialog } from "./ApplicationSettingsDialog";
import { GenerationErrorDetailsDialog } from "./GenerationErrorDetailsDialog";
import { ProjectDataReportDialog } from "./ProjectDataReportDialog";

export interface AppGlobalDialogsProps {
  about: ComponentProps<typeof AboutDialog>;
  appSettings: ComponentProps<typeof ApplicationSettingsDialog>;
  acpRunLog: ComponentProps<typeof AcpRunLogDialog>;
  projectDataReport: ComponentProps<typeof ProjectDataReportDialog>;
  generationErrorDetails: ComponentProps<typeof GenerationErrorDetailsDialog>;
}

export const AppGlobalDialogs = ({
  about,
  appSettings,
  acpRunLog,
  projectDataReport,
  generationErrorDetails,
}: AppGlobalDialogsProps) => (
  <>
    <AboutDialog {...about} />
    <ApplicationSettingsDialog {...appSettings} />
    <AcpRunLogDialog {...acpRunLog} />
    <ProjectDataReportDialog {...projectDataReport} />
    <GenerationErrorDetailsDialog {...generationErrorDetails} />
  </>
);
