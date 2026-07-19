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
  onSelectRecord?: (fileId: string) => void;
}

export const GenerationHistorySidebar = ({
  open,
  onOpenChange,
  records,
  selectedFileId,
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
        onSelectRecord={onSelectRecord}
      />
    </div>
  </SideDock>
);
