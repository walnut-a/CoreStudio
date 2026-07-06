import type {
  AgentImageResult,
  AgentImageResultPart as AgentImageResultPartModel,
} from "../agentThreadTypes";

const getImageSourceLabel = (source: AgentImageResult["source"]) => {
  switch (source) {
    case "acp-agent":
      return "ACP Agent";
    case "corestudio":
      return "CoreStudio";
    case "unknown":
    default:
      return "未知来源";
  }
};

const splitMetaParts = (meta?: string) =>
  meta
    ?.split("·")
    .map((part) => part.trim())
    .filter(Boolean) ?? [];

const getUniqueMetaParts = (
  parts: Array<string | number | null | undefined>,
) => {
  const seen = new Set<string>();

  return parts
    .map((part) => (part === undefined || part === null ? "" : String(part)))
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) {
        return false;
      }
      const key = part.toLocaleLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

const getImageMeta = (image: AgentImageResult) =>
  getUniqueMetaParts([
    getImageSourceLabel(image.source),
    ...splitMetaParts(image.meta),
    image.model,
    image.sizeLabel,
    image.statusLabel,
  ]).join(" · ");

const getReferenceLabel = (referenceCount?: number) => {
  if (!referenceCount) {
    return "";
  }
  return `参考图 ${referenceCount}`;
};

export const AgentImageResultPart = ({
  part,
  onSelectImageResult,
}: {
  part: AgentImageResultPartModel;
  onSelectImageResult?: (fileId: string) => void;
}) => {
  const image = part.image;
  const meta = getImageMeta(image);
  const referenceLabel = getReferenceLabel(image.referenceCount);
  const prompt = image.prompt?.trim();
  const ariaDetails = [meta, prompt, referenceLabel].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className="agent-thread-timeline__image-result"
      disabled={!onSelectImageResult}
      aria-label={`${image.title} ${ariaDetails}`}
      onClick={() => onSelectImageResult?.(image.fileId)}
    >
      {image.thumbnailDataUrl ? (
        <img src={image.thumbnailDataUrl} alt="" />
      ) : (
        <span
          className="agent-thread-timeline__image-placeholder"
          aria-hidden="true"
        />
      )}
      <span className="agent-thread-timeline__image-body">
        <strong>{image.title}</strong>
        {meta ? (
          <span className="agent-thread-timeline__image-meta">{meta}</span>
        ) : null}
        {prompt ? (
          <span className="agent-thread-timeline__image-prompt">
            提示词：{prompt}
          </span>
        ) : null}
        {referenceLabel ? (
          <span className="agent-thread-timeline__image-reference">
            {referenceLabel}
          </span>
        ) : null}
      </span>
    </button>
  );
};
