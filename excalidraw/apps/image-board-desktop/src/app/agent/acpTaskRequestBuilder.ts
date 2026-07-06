import type {
  DesktopAgentBridgeStatus,
  DesktopProjectBundle,
} from "../../shared/desktopBridgeTypes";
import { buildPromptTextWithInlineReferences } from "../../shared/promptReferences";
import type { AcpTaskRequest } from "../../shared/acpTypes";
import type {
  GenerationReferencePayload,
  GenerationRequest,
} from "../../shared/providerTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";

export const createAcpTaskId = () =>
  `acp-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createAcpThreadId = () =>
  `acp-thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getAcpBridgeBaseUrl = ({
  status,
  pageUrl,
}: {
  status: DesktopAgentBridgeStatus | null;
  pageUrl: string;
}): string | null => {
  const candidates = [status?.boardUrl, pageUrl].filter(
    (url): url is string => Boolean(url),
  );
  for (const candidate of candidates) {
    try {
      const bridgeBaseUrl = new URL(candidate).searchParams.get("bridge");
      if (bridgeBaseUrl) {
        return bridgeBaseUrl;
      }
    } catch {
      // Ignore malformed user-facing URLs and try the next candidate.
    }
  }
  return null;
};

const getAcpSelectionKind = (
  item: NonNullable<GenerationReferencePayload["items"]>[number],
): AcpTaskRequest["selection"]["items"][number]["kind"] => {
  if (item.kind === "image" || item.kind === "text") {
    return item.kind;
  }
  return item.label === "箭头" ? "arrow" : "shape";
};

export const buildAcpSelectionItems = (
  request: GenerationRequest,
  imageRecords: ImageRecordMap,
): AcpTaskRequest["selection"]["items"] => {
  const seenElementIds = new Set<string>();
  return [request.reference, ...(request.promptReferences ?? [])]
    .flatMap((reference) => reference?.items ?? [])
    .flatMap((item) => {
      if (seenElementIds.has(item.id)) {
        return [];
      }
      seenElementIds.add(item.id);
      const imageRecord = item.fileId ? imageRecords[item.fileId] : null;
      return [
        {
          index: item.index,
          elementId: item.id,
          kind: getAcpSelectionKind(item),
          label: item.label,
          ...(item.fileId ? { fileId: item.fileId } : {}),
          ...(imageRecord?.fileId ? { imageId: imageRecord.fileId } : {}),
        },
      ];
    });
};

export const getAcpTaskPromptText = (request: GenerationRequest) =>
  buildPromptTextWithInlineReferences(request).trim() || request.prompt;

export const buildAcpTaskRequest = ({
  request,
  project,
  status,
  pageUrl,
  agentId,
  threadId,
  taskId = createAcpTaskId(),
}: {
  request: GenerationRequest;
  project: DesktopProjectBundle;
  status: DesktopAgentBridgeStatus | null;
  pageUrl: string;
  agentId: string | null;
  threadId: string;
  taskId?: string;
}): AcpTaskRequest => {
  const bridgeBaseUrl = getAcpBridgeBaseUrl({ status, pageUrl });
  if (!bridgeBaseUrl) {
    throw new Error("Agent Bridge 地址尚未就绪。");
  }

  const items = buildAcpSelectionItems(request, project.imageRecords);
  return {
    taskId,
    threadId,
    agentId: agentId ?? "",
    userPrompt:
      getAcpTaskPromptText(request) || "请根据当前 CoreStudio 画板继续操作。",
    project: {
      name: project.project.name,
      projectPath: project.projectPath,
      token: project.project.agentAccess.token,
      bridgeBaseUrl,
      boardUrl: status?.boardUrl ?? null,
    },
    generation: {
      source: "agent",
    },
    selection: {
      elementCount: items.length,
      items,
    },
  };
};
