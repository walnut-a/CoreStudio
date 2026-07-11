import type { ReactNode } from "react";

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

export const renderInlineAgentMarkdown = (
  text: string,
  keyPrefix: string,
): ReactNode[] => {
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
          {renderInlineAgentMarkdown(content, `${key}-children`)}
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
            {renderInlineAgentMarkdown(
              label,
              `${keyPrefix}-link-${index}-label`,
            )}
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
            {renderInlineAgentMarkdown(
              content,
              `${keyPrefix}-em-${index}-children`,
            )}
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

const renderProseBlock = (text: string, keyPrefix: string): ReactNode[] => {
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
        {renderInlineAgentMarkdown(paragraph, `${keyPrefix}-${nodes.length}`)}
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

export const AgentThreadMarkdownBlocks = ({
  text,
  idPrefix,
}: {
  text: string;
  idPrefix: string;
}) => {
  const nodes: ReactNode[] = [];

  parseTextBlocks(text).forEach((block, index) => {
    if (block.type === "code") {
      const code = formatCodeBlock(block.code, block.language);
      if (!code) {
        return;
      }

      nodes.push(
        <pre
          key={`${idPrefix}-${index}`}
          className="agent-thread-timeline__code-block"
        >
          <code>{code}</code>
        </pre>,
      );
      return;
    }

    nodes.push(...renderProseBlock(block.text, `${idPrefix}-${index}`));
  });

  return <>{nodes}</>;
};
