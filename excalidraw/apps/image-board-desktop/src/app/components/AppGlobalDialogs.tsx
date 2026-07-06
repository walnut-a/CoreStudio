import type { ComponentProps } from "react";

import { AboutDialog } from "./AboutDialog";
import { AcpRunLogDialog } from "./AcpRunLogDialog";
import { AgentIntegrationSettingsDialog } from "./AgentIntegrationSettingsDialog";
import { GenerationErrorDetailsDialog } from "./GenerationErrorDetailsDialog";
import { ProjectDataReportDialog } from "./ProjectDataReportDialog";

export interface AppGlobalDialogsProps {
  about: ComponentProps<typeof AboutDialog>;
  agentSettings: ComponentProps<typeof AgentIntegrationSettingsDialog>;
  acpRunLog: ComponentProps<typeof AcpRunLogDialog>;
  projectDataReport: ComponentProps<typeof ProjectDataReportDialog>;
  generationErrorDetails: ComponentProps<typeof GenerationErrorDetailsDialog>;
}

export const AppGlobalDialogs = ({
  about,
  agentSettings,
  acpRunLog,
  projectDataReport,
  generationErrorDetails,
}: AppGlobalDialogsProps) => (
  <>
    <AboutDialog {...about} />
    <AgentIntegrationSettingsDialog {...agentSettings} />
    <AcpRunLogDialog {...acpRunLog} />
    <ProjectDataReportDialog {...projectDataReport} />
    <GenerationErrorDetailsDialog {...generationErrorDetails} />
  </>
);
