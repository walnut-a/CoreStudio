import type { ReactNode } from "react";

import type {
  AgentImageResult,
  AgentMessage,
  AgentMessagePart,
  AgentThread,
  AgentToolCall,
  AgentToolStatus,
} from "../agentThreadModel";

interface AgentThreadTimelineProps {
  thread: AgentThread | null;
  onSelectImageResult?: (fileId: string) => void;
}

const getToolStatusLabel = (status: AgentToolStatus) => {
  switch (status) {
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    case "running":
      return "调用中";
    case "pending":
    default:
      return "等待";
  }
};

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
    image.referenceCount ? `${image.referenceCount} 张参考` : null,
  ]).join(" · ");

const formatToolValue = (value: unknown) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return trimmed;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const renderToolDetail = (label: string, value: unknown) => {
  if (value === undefined || value === null) {
    return null;
  }
  const formatted = formatToolValue(value);
  if (!formatted) {
    return null;
  }

  return (
    <div className="agent-thread-timeline__tool-detail">
      <span>{label}</span>
      <pre>{formatted}</pre>
    </div>
  );
};

const isSafeMarkdownHref = (href: string) => {
  if (!href) {
    return false;
  }
  try {
    const url = new URL(href);
    return ["https:", "http:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const renderPlainText = (text: string, keyPrefix: string): ReactNode[] =>
  text.split("\n").flatMap((line, index) => {
    if (index === 0) {
      return [line];
    }
    return [<br key={`${keyPrefix}-br-${index}`} />, line];
  });

const renderInlineMarkdown = (text: string, keyPrefix: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let index = 0;
  let plainStart = 0;

  const pushPlainText = (endIndex: number) => {
    if (endIndex <= plainStart) {
      return;
    }
    nodes.push(
      ...renderPlainText(
        text.slice(plainStart, endIndex),
        `${keyPrefix}-plain-${plainStart}`,
      ),
    );
  };

  while (index < text.length) {
    const renderSpan = (
      marker: string,
      className: string,
      renderContent: (content: string, key: string) => ReactNode,
    ) => {
      if (!text.startsWith(marker, index)) {
        return false;
      }
      const contentStart = index + marker.length;
      const closeIndex = text.indexOf(marker, contentStart);
      const content = text.slice(contentStart, closeIndex);
      if (closeIndex === -1 || !content.trim()) {
        return false;
      }
      pushPlainText(index);
      nodes.push(renderContent(content, `${keyPrefix}-${className}-${index}`));
      index = closeIndex + marker.length;
      plainStart = index;
      return true;
    };

    if (
      renderSpan("`", "code", (content, key) => (
        <code key={key} className="agent-thread-timeline__inline-code">
          {content}
        </code>
      ))
    ) {
      continue;
    }

    if (
      renderSpan("**", "strong", (content, key) => (
        <strong key={key}>
          {renderInlineMarkdown(content, `${key}-children`)}
        </strong>
      ))
    ) {
      continue;
    }

    if (text[index] === "[") {
      const labelEnd = text.indexOf("]", index + 1);
      const hrefStart = labelEnd + 1;
      const hrefEnd = text.indexOf(")", hrefStart + 1);
      const href = text.slice(hrefStart + 1, hrefEnd);

      if (
        labelEnd > index + 1 &&
        text[hrefStart] === "(" &&
        hrefEnd > hrefStart + 1 &&
        isSafeMarkdownHref(href)
      ) {
        const label = text.slice(index + 1, labelEnd);
        pushPlainText(index);
        nodes.push(
          <a
            key={`${keyPrefix}-link-${index}`}
            className="agent-thread-timeline__link"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {renderInlineMarkdown(label, `${keyPrefix}-link-${index}-label`)}
          </a>,
        );
        index = hrefEnd + 1;
        plainStart = index;
        continue;
      }
    }

    if (
      text[index] === "*" &&
      text[index + 1] !== "*" &&
      text[index - 1] !== "*" &&
      text.indexOf("*", index + 1) !== -1
    ) {
      const closeIndex = text.indexOf("*", index + 1);
      const content = text.slice(index + 1, closeIndex);

      if (content.trim() && content.trim() === content) {
        pushPlainText(index);
        nodes.push(
          <em key={`${keyPrefix}-em-${index}`}>
            {renderInlineMarkdown(content, `${keyPrefix}-em-${index}-children`)}
          </em>,
        );
        index = closeIndex + 1;
        plainStart = index;
        continue;
      }
    }

    index += 1;
  }

  pushPlainText(text.length);
  return nodes;
};

type AgentTextBlock =
  | {
      type: "prose";
      text: string;
    }
  | {
      type: "code";
      code: string;
      language: string;
    };

const FENCED_CODE_PATTERN = /```([A-Za-z0-9_-]*)[ \t]*\n?([\s\S]*?)```/g;
const ABSOLUTE_FILE_PATH_PATTERN =
  /\/(?:Users|Volumes|private|var|tmp|Applications|[A-Za-z0-9._-]+)\/[^\s，。；、,;!?！？)）\]}>"'`]+/g;

const pushProseBlocks = (blocks: AgentTextBlock[], text: string) => {
  text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .forEach((paragraph) => {
      blocks.push({
        type: "prose",
        text: paragraph,
      });
    });
};

const parseTextBlocks = (text: string): AgentTextBlock[] => {
  const blocks: AgentTextBlock[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(FENCED_CODE_PATTERN)) {
    pushProseBlocks(blocks, text.slice(lastIndex, match.index));
    blocks.push({
      type: "code",
      language: match[1].trim().toLowerCase(),
      code: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  pushProseBlocks(blocks, text.slice(lastIndex));
  return blocks;
};

const formatCodeBlock = (code: string, language: string) => {
  const trimmed = code.trim();
  if (!trimmed) {
    return "";
  }
  if (language === "json" || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
};

const renderProseBlock = (
  text: string,
  keyPrefix: string,
): ReactNode[] => {
  const nodes: ReactNode[] = [];
  const paragraphLines: string[] = [];

  const pushParagraph = () => {
    const paragraph = paragraphLines.join("\n").trim();
    if (!paragraph) {
      paragraphLines.length = 0;
      return;
    }

    nodes.push(
      <p
        key={`${keyPrefix}-paragraph-${nodes.length}`}
        className="agent-thread-timeline__text"
      >
        {renderInlineMarkdown(paragraph, `${keyPrefix}-${nodes.length}`)}
      </p>,
    );
    paragraphLines.length = 0;
  };

  const pushPathBlock = (path: string) => {
    nodes.push(
      <code
        key={`${keyPrefix}-path-${nodes.length}`}
        className="agent-thread-timeline__path-block"
      >
        {path}
      </code>,
    );
  };

  text.split("\n").forEach((line) => {
    let cursor = 0;
    let pathMatch: RegExpExecArray | null;
    let hasPath = false;

    ABSOLUTE_FILE_PATH_PATTERN.lastIndex = 0;
    while ((pathMatch = ABSOLUTE_FILE_PATH_PATTERN.exec(line)) !== null) {
      if (line[pathMatch.index - 1] === "/") {
        continue;
      }
      hasPath = true;
      const rawBeforePath = line.slice(cursor, pathMatch.index);
      const beforePath = rawBeforePath.endsWith("`")
        ? rawBeforePath.slice(0, -1).trimEnd()
        : rawBeforePath.trimEnd();
      if (beforePath) {
        paragraphLines.push(beforePath);
      }
      pushParagraph();
      pushPathBlock(pathMatch[0]);
      cursor = pathMatch.index + pathMatch[0].length;
      if (line[cursor] === "`") {
        cursor += 1;
        ABSOLUTE_FILE_PATH_PATTERN.lastIndex = cursor;
      }
    }

    if (hasPath) {
      const afterPath = line.slice(cursor).trimStart();
      if (afterPath) {
        paragraphLines.push(afterPath);
      }
    } else {
      paragraphLines.push(line);
    }
  });

  pushParagraph();
  return nodes;
};

const renderTextPart = (
  part: Extract<AgentMessagePart, { type: "text" }>,
): ReactNode[] => {
  const nodes: ReactNode[] = [];

  parseTextBlocks(part.text).forEach((block, index) => {
    if (block.type === "code") {
      const code = formatCodeBlock(block.code, block.language);
      if (!code) {
        return;
      }

      nodes.push(
        <pre
          key={`${part.id}-${index}`}
          className="agent-thread-timeline__code-block"
        >
          <code>{code}</code>
        </pre>,
      );
      return;
    }

    nodes.push(...renderProseBlock(block.text, `${part.id}-${index}`));
  });

  return nodes;
};

const renderStatusPart = (
  part: Extract<AgentMessagePart, { type: "status" }>,
) => (
  <p key={part.id} className="agent-thread-timeline__status-line">
    {renderInlineMarkdown(part.text, part.id)}
  </p>
);

const renderErrorPart = (
  part: Extract<AgentMessagePart, { type: "error" }>,
) => (
  <p key={part.id} className="agent-thread-timeline__error-line">
    {renderInlineMarkdown(part.message, part.id)}
  </p>
);

const renderToolPart = (part: Extract<AgentMessagePart, { type: "tool" }>) => {
  const tool: AgentToolCall = part.tool;
  const hasDetails =
    Boolean(tool.summary) ||
    tool.args !== undefined ||
    tool.result !== undefined ||
    Boolean(tool.errorMessage);

  return (
    <details
      key={part.id}
      open={tool.status === "failed"}
      className={[
        "agent-thread-timeline__tool",
        `agent-thread-timeline__tool--${tool.status}`,
      ].join(" ")}
    >
      <summary>
        <span className="agent-thread-timeline__tool-dot" aria-hidden="true" />
        <span className="agent-thread-timeline__tool-title">
          {tool.title || tool.name}
        </span>
        <span className="agent-thread-timeline__tool-status">
          {getToolStatusLabel(tool.status)}
        </span>
      </summary>
      {hasDetails ? (
        <div className="agent-thread-timeline__tool-body">
          {tool.summary ? <p>{tool.summary}</p> : null}
          {renderToolDetail("输入", tool.args)}
          {renderToolDetail("输出", tool.result)}
          {tool.errorMessage ? (
            <p className="agent-thread-timeline__tool-error">
              {tool.errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </details>
  );
};

const renderImageResultPart = (
  part: Extract<AgentMessagePart, { type: "image-result" }>,
  onSelectImageResult?: (fileId: string) => void,
) => {
  const image = part.image;
  const meta = getImageMeta(image);

  return (
    <button
      key={part.id}
      type="button"
      className="agent-thread-timeline__image-result"
      disabled={!onSelectImageResult}
      aria-label={`${image.title} ${meta}`}
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
        {meta ? <span>{meta}</span> : null}
      </span>
    </button>
  );
};

const renderPart = (
  part: AgentMessagePart,
  onSelectImageResult?: (fileId: string) => void,
): ReactNode[] => {
  switch (part.type) {
    case "text":
      return renderTextPart(part);
    case "tool":
      return [renderToolPart(part)];
    case "image-result":
      return [renderImageResultPart(part, onSelectImageResult)];
    case "status":
      return [renderStatusPart(part)];
    case "error":
      return [renderErrorPart(part)];
  }
};

const AgentThreadMessage = ({
  message,
  onSelectImageResult,
}: {
  message: AgentMessage;
  onSelectImageResult?: (fileId: string) => void;
}) => (
  <article
    className={[
      "agent-thread-timeline__message",
      `agent-thread-timeline__message--${message.role}`,
    ].join(" ")}
  >
    <div className="agent-thread-timeline__message-body">
      {message.parts.flatMap((part) => renderPart(part, onSelectImageResult))}
    </div>
  </article>
);

export const AgentThreadTimeline = ({
  thread,
  onSelectImageResult,
}: AgentThreadTimelineProps) => {
  if (!thread || thread.messages.length === 0) {
    return (
      <div
        className="agent-thread-timeline agent-thread-timeline--empty"
        aria-label="Agent 对话为空"
      />
    );
  }

  return (
    <div
      className="agent-thread-timeline"
      role="log"
      aria-label="Agent 对话时间线"
    >
      <div className="agent-thread-timeline__viewport">
        {thread.messages.map((message) => (
          <AgentThreadMessage
            key={message.id}
            message={message}
            onSelectImageResult={onSelectImageResult}
          />
        ))}
      </div>
    </div>
  );
};
