import "./GenerationHistorySidebar.css";

import { copy } from "../copy";
import {
  GenerationRecordSidebar,
  type GenerationRecordListItem,
} from "./GenerationRecordSidebar";
import { SideDock } from "./SideDock";

interface GenerationHistorySidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: readonly GenerationRecordListItem[];
  selectedFileId?: string | null;
  revealRequest?: { fileId: string; requestId: number } | null;
  onSelectRecord?: (fileId: string) => void;
}

export const GenerationHistorySidebar = ({
  open,
  onOpenChange,
  records,
  selectedFileId,
  revealRequest,
  onSelectRecord,
}: GenerationHistorySidebarProps) => (
  <SideDock
    side="left"
    title={copy.agentUi.generationRecordsTitle}
    open={open}
    onOpenChange={onOpenChange}
  >
    <div className="generation-history-sidebar">
      <GenerationRecordSidebar
        records={records}
        selectedFileId={selectedFileId}
        revealRequest={revealRequest}
        onSelectRecord={onSelectRecord}
      />
    </div>
  </SideDock>
);
