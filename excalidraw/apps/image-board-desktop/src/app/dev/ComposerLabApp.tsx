import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";
import { flushSync } from "react-dom";

import { GenerateDialogComposerSection } from "../components/GenerateDialogComposerSection";
import type { InlinePromptEditorHandle } from "../components/InlinePromptEditor";
import {
  handleGenerateComposerFormSubmit,
  handleGenerateComposerPromptKeyDown,
  stopGenerateInputEventPropagation,
} from "../generateComposerEvents";
import { filterPromptReferencesForParts } from "../generatePromptRequest";

import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferencePayload,
} from "../../shared/providerTypes";

import "./ComposerLabApp.css";

type ComposerLabScenarioId =
  | "empty"
  | "short-text"
  | "long-text"
  | "one-reference"
  | "mixed-three"
  | "reference-limit"
  | "pending-reference";

interface ComposerLabScenario {
  id: ComposerLabScenarioId;
  label: string;
  parts: GenerationPromptPart[];
  references: GenerationPromptReferencePayload[];
  pendingReference: GenerationReferencePayload | null;
  referenceLimitMessage: string | null;
}

interface ComposerLabMock {
  selectReference: (index: number) => Promise<GenerationPromptReferencePayload>;
  submit: (parts: readonly GenerationPromptPart[]) => Promise<void>;
}

interface ComposerLabMeasurements {
  composerHeight: number | null;
  editorHeight: number | null;
  referenceHeight: number | null;
  lineHeight: number | null;
  referenceMarginStart: number | null;
  referenceMarginEnd: number | null;
  editorPaddingTop: number | null;
  editorPaddingBottom: number | null;
  referenceGapTop: number | null;
  referenceGapBottom: number | null;
  textGapTop: number | null;
  textGapBottom: number | null;
  controlsGapTop: number | null;
  controlsGapBottom: number | null;
  renderedLineCount: number;
  domReferenceCount: number;
  contentSummary: string;
}

const emptyMeasurements: ComposerLabMeasurements = {
  composerHeight: null,
  editorHeight: null,
  referenceHeight: null,
  lineHeight: null,
  referenceMarginStart: null,
  referenceMarginEnd: null,
  editorPaddingTop: null,
  editorPaddingBottom: null,
  referenceGapTop: null,
  referenceGapBottom: null,
  textGapTop: null,
  textGapBottom: null,
  controlsGapTop: null,
  controlsGapBottom: null,
  renderedLineCount: 0,
  domReferenceCount: 0,
  contentSummary: "空",
};

const readCssPixelValue = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundMeasurement = (value: number) => Math.round(value * 10) / 10;

const formatMeasurement = (value: number | null) =>
  value === null ? "—" : `${roundMeasurement(value)} px`;

const formatPairMeasurement = (start: number | null, end: number | null) => {
  if (start === null || end === null) {
    return "—";
  }
  return `${roundMeasurement(start)} + ${roundMeasurement(end)} px`;
};

const hasUnevenMeasurementPair = (start: number | null, end: number | null) =>
  start !== null && end !== null && Math.abs(start - end) > 0.5;

const readVerticalGaps = (
  container: HTMLElement | null,
  element: HTMLElement | null,
) => {
  if (!container || !element) {
    return [null, null] as const;
  }
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return [
    roundMeasurement(elementRect.top - containerRect.top),
    roundMeasurement(containerRect.bottom - elementRect.bottom),
  ] as const;
};

export const summarizeComposerLabContent = (root: ParentNode | null) => {
  if (!root) {
    return "空";
  }

  const tokens = Array.from(
    root.querySelectorAll(
      [
        ".generate-composer__prompt-editor-content [data-reference-id]",
        '.generate-composer__prompt-editor-content [data-lexical-text="true"]',
        ".generate-composer__reference-chip--pending",
      ].join(", "),
    ),
  )
    .map((element) => {
      if (element.matches("[data-reference-id]")) {
        const label = element.getAttribute("aria-label") ?? "";
        const index = label.match(/^\d+/)?.[0];
        return index ? `图 ${index}` : "图片";
      }
      if (element.matches(".generate-composer__reference-chip--pending")) {
        return "待确认图片";
      }
      return element.textContent?.replace(/\s+/g, " ").trim() ?? "";
    })
    .filter(Boolean);

  return tokens.length > 0 ? tokens.join(" · ") : "空";
};

export const countComposerLabRenderedLines = (
  rects: readonly Pick<DOMRect, "top" | "height">[],
  lineHeight: number | null,
) => {
  const threshold = Math.max(4, (lineHeight ?? 16) * 0.45);
  const lineCenters: number[] = [];

  rects
    .map((rect) => rect.top + rect.height / 2)
    .sort((first, second) => first - second)
    .forEach((center) => {
      if (
        !lineCenters.some(
          (existingCenter) => Math.abs(existingCenter - center) <= threshold,
        )
      ) {
        lineCenters.push(center);
      }
    });

  return lineCenters.length;
};

const measureRenderedLineCount = (
  root: ParentNode,
  lineHeight: number | null,
) => {
  const elements = Array.from(
    root.querySelectorAll(
      [
        ".generate-composer__prompt-editor-content > p > :not(br)",
        ".generate-composer__reference-chip--pending",
      ].join(", "),
    ),
  );
  const renderedRects: Pick<DOMRect, "top" | "height">[] = [];

  elements.forEach((element) => {
    Array.from(element.getClientRects()).forEach((rect) => {
      if (rect.width > 0 || rect.height > 0) {
        renderedRects.push(rect);
      }
    });
  });

  return Math.max(1, countComposerLabRenderedLines(renderedRects, lineHeight));
};

const readComposerLabMeasurements = (
  root: HTMLElement | null,
): ComposerLabMeasurements => {
  if (!root) {
    return emptyMeasurements;
  }

  const composer = root.querySelector<HTMLElement>(".generate-composer");
  const editor = root.querySelector<HTMLElement>(
    ".generate-composer__prompt-editor",
  );
  const referenceChip = root.querySelector<HTMLElement>(
    ".generate-composer__reference-chip",
  );
  const text = root.querySelector<HTMLElement>(
    '.generate-composer__prompt-editor-content [data-lexical-text="true"]',
  );
  const controls = root.querySelector<HTMLElement>(
    ".generate-composer__controls",
  );
  const referenceNode =
    root.querySelector<HTMLElement>(".generate-composer__reference-node") ??
    root.querySelector<HTMLElement>(
      ".generate-composer__reference-chip--pending",
    );
  const editorStyle = editor ? window.getComputedStyle(editor) : null;
  const referenceStyle = referenceNode
    ? window.getComputedStyle(referenceNode)
    : null;
  const lineHeight = editorStyle
    ? readCssPixelValue(editorStyle.lineHeight)
    : null;
  const [referenceGapTop, referenceGapBottom] = readVerticalGaps(
    composer,
    referenceChip,
  );
  const [textGapTop, textGapBottom] = readVerticalGaps(composer, text);
  const [controlsGapTop, controlsGapBottom] = readVerticalGaps(
    composer,
    controls,
  );

  return {
    composerHeight: composer
      ? roundMeasurement(composer.getBoundingClientRect().height)
      : null,
    editorHeight: editor
      ? roundMeasurement(editor.getBoundingClientRect().height)
      : null,
    referenceHeight: referenceChip
      ? roundMeasurement(referenceChip.getBoundingClientRect().height)
      : null,
    lineHeight,
    referenceMarginStart: referenceStyle
      ? readCssPixelValue(referenceStyle.marginInlineStart)
      : null,
    referenceMarginEnd: referenceStyle
      ? readCssPixelValue(referenceStyle.marginInlineEnd)
      : null,
    editorPaddingTop: editorStyle
      ? readCssPixelValue(editorStyle.paddingTop)
      : null,
    editorPaddingBottom: editorStyle
      ? readCssPixelValue(editorStyle.paddingBottom)
      : null,
    referenceGapTop,
    referenceGapBottom,
    textGapTop,
    textGapBottom,
    controlsGapTop,
    controlsGapBottom,
    renderedLineCount: measureRenderedLineCount(root, lineHeight),
    domReferenceCount: root.querySelectorAll("[data-reference-id]").length,
    contentSummary: summarizeComposerLabContent(root),
  };
};

const thumbnailDataUrl = (index: number) => {
  const color = ["#6965db", "#d97757", "#4f8f70", "#a65bb5"][index % 4];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="${color}"/><path d="M13 45 26 29l9 10 7-8 10 14H13Z" fill="white" opacity=".92"/><circle cx="43" cy="19" r="6" fill="white" opacity=".78"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const createReference = (index: number): GenerationPromptReferencePayload => ({
  id: `lab-reference-${index}`,
  label: "图片",
  enabled: true,
  elementCount: 1,
  textCount: 0,
  thumbnailDataUrl: thumbnailDataUrl(index),
  items: [
    {
      id: `lab-image-${index}`,
      index,
      kind: "image",
      label: "图片",
      thumbnailDataUrl: thumbnailDataUrl(index),
    },
  ],
});

const toPendingReference = (
  reference: GenerationPromptReferencePayload,
): GenerationReferencePayload => ({
  enabled: true,
  elementCount: 1,
  textCount: 0,
  items: reference.items,
});

const references = [1, 2, 3, 4].map(createReference);

const scenarios: ComposerLabScenario[] = [
  {
    id: "empty",
    label: "空输入框",
    parts: [],
    references: [],
    pendingReference: null,
    referenceLimitMessage: null,
  },
  {
    id: "short-text",
    label: "单行文字",
    parts: [{ type: "text", text: "一台结构简洁的桌面 CNC" }],
    references: [],
    pendingReference: null,
    referenceLimitMessage: null,
  },
  {
    id: "long-text",
    label: "长文字与自动换行",
    parts: [
      {
        type: "text",
        text: "设计一台面向小型工作室的桌面 CNC，机身紧凑，采用阳极氧化铝外壳和透明观察窗，强调结构层次、加工区域与操作安全。",
      },
    ],
    references: [],
    pendingReference: null,
    referenceLimitMessage: null,
  },
  {
    id: "one-reference",
    label: "一张参考图",
    parts: [
      { type: "reference", referenceId: references[0].id },
      { type: "text", text: "保持产品比例" },
    ],
    references: references.slice(0, 1),
    pendingReference: null,
    referenceLimitMessage: null,
  },
  {
    id: "mixed-three",
    label: "三张参考图与文字",
    parts: [
      { type: "reference", referenceId: references[0].id },
      { type: "text", text: "工业设计渲染" },
      { type: "reference", referenceId: references[1].id },
      { type: "text", text: "保留结构关系" },
      { type: "reference", referenceId: references[2].id },
    ],
    references: references.slice(0, 3),
    pendingReference: null,
    referenceLimitMessage: null,
  },
  {
    id: "reference-limit",
    label: "参考图达到上限",
    parts: [
      { type: "reference", referenceId: references[0].id },
      { type: "reference", referenceId: references[1].id },
      { type: "reference", referenceId: references[2].id },
      { type: "text", text: "继续调整产品细节" },
    ],
    references: references.slice(0, 3),
    pendingReference: null,
    referenceLimitMessage: "当前模型最多可插入 3 张参考图。",
  },
  {
    id: "pending-reference",
    label: "待确认参考图",
    parts: [{ type: "text", text: "在此处插入参考图" }],
    references: [],
    pendingReference: toPendingReference(references[0]),
    referenceLimitMessage: null,
  },
];

const scenarioById = new Map(
  scenarios.map((scenario) => [scenario.id, scenario]),
);

const readInitialScenario = () => {
  const scenarioId = new URLSearchParams(window.location.search).get(
    "scenario",
  ) as ComposerLabScenarioId | null;
  if (!scenarioId) {
    return scenarios[0];
  }
  return scenarioById.get(scenarioId) ?? scenarios[0];
};

const readInitialTheme = () =>
  new URLSearchParams(window.location.search).get("theme") === "dark"
    ? "dark"
    : "light";

const readInitialWidth = () => {
  const width = Number(
    new URLSearchParams(window.location.search).get("width"),
  );
  return [360, 480, 640].includes(width) ? width : 640;
};

const createComposerLabMock = (): ComposerLabMock => ({
  selectReference: async (index) => createReference(index),
  submit: async () => undefined,
});

const syncQuery = ({
  scenario,
  theme,
  width,
}: {
  scenario: ComposerLabScenarioId;
  theme: "light" | "dark";
  width: number;
}) => {
  const url = new URL(window.location.href);
  url.searchParams.set("scenario", scenario);
  url.searchParams.set("theme", theme);
  url.searchParams.set("width", String(width));
  window.history.replaceState(null, "", url);
};

export const getComposerLabActiveReferences = (
  cachedReferences: readonly GenerationPromptReferencePayload[],
  parts: readonly GenerationPromptPart[],
) => filterPromptReferencesForParts(cachedReferences, parts);

export const ComposerLabApp = () => {
  const initialScenario = useMemo(readInitialScenario, []);
  const mockRef = useRef<ComposerLabMock>(createComposerLabMock());
  const editorRef = useRef<InlinePromptEditorHandle | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scenarioId, setScenarioId] = useState(initialScenario.id);
  const [parts, setParts] = useState<GenerationPromptPart[]>(
    initialScenario.parts,
  );
  const [promptReferences, setPromptReferences] = useState<
    GenerationPromptReferencePayload[]
  >(initialScenario.references);
  const promptReferenceCacheRef = useRef<GenerationPromptReferencePayload[]>(
    initialScenario.references,
  );
  const [pendingReference, setPendingReference] =
    useState<GenerationReferencePayload | null>(
      initialScenario.pendingReference,
    );
  const pendingReferenceRef = useRef<GenerationReferencePayload | null>(
    initialScenario.pendingReference,
  );
  const [referenceLimitMessage, setReferenceLimitMessage] = useState<
    string | null
  >(initialScenario.referenceLimitMessage);
  const [resetKey, setResetKey] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(readInitialTheme);
  const [stageWidth, setStageWidth] = useState(readInitialWidth);
  const [activity, setActivity] = useState("等待操作");
  const [measurements, setMeasurements] =
    useState<ComposerLabMeasurements>(emptyMeasurements);

  const updateMeasurements = useCallback(() => {
    setMeasurements(readComposerLabMeasurements(stageRef.current));
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    let animationFrame = window.requestAnimationFrame(updateMeasurements);
    const scheduleMeasurement = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateMeasurements);
    };
    const mutationObserver = new MutationObserver(scheduleMeasurement);
    mutationObserver.observe(stage, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleMeasurement);
    resizeObserver?.observe(stage);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    };
  }, [
    parts,
    pendingReference,
    promptReferences,
    referenceLimitMessage,
    resetKey,
    stageWidth,
    updateMeasurements,
  ]);

  const applyScenario = (nextScenarioId: ComposerLabScenarioId) => {
    const scenario = scenarioById.get(nextScenarioId) ?? scenarios[0];
    setScenarioId(scenario.id);
    setParts(scenario.parts);
    setPromptReferences(scenario.references);
    promptReferenceCacheRef.current = scenario.references;
    pendingReferenceRef.current = scenario.pendingReference;
    setPendingReference(scenario.pendingReference);
    setReferenceLimitMessage(scenario.referenceLimitMessage);
    setResetKey((current) => current + 1);
    setActivity("场景已切换");
    syncQuery({ scenario: scenario.id, theme, width: stageWidth });
  };

  const selectReference = async () => {
    const nextReference = await mockRef.current.selectReference(
      promptReferences.length + 1,
    );
    const nextPendingReference = toPendingReference(nextReference);
    pendingReferenceRef.current = nextPendingReference;
    setPendingReference(nextPendingReference);
    setReferenceLimitMessage(null);
    setActivity("已模拟选图，点击输入框确认");
  };

  const discardPendingReference = () => {
    pendingReferenceRef.current = null;
    setPendingReference(null);
    setActivity("待确认参考已移除");
  };

  const commitPendingReference = async () => {
    const pendingReferenceToCommit = pendingReferenceRef.current;
    if (!pendingReferenceToCommit) {
      return;
    }
    const item = pendingReferenceToCommit.items?.[0];
    if (!item) {
      return;
    }
    pendingReferenceRef.current = null;
    const nextReference = createReference(promptReferences.length + 1);
    const referenceWithPendingIdentity = {
      ...nextReference,
      id: item.id,
      items: pendingReferenceToCommit.items,
    };
    const nextParts = editorRef.current?.confirmPendingReference(
      referenceWithPendingIdentity.id,
    ) ?? [
      ...parts,
      {
        type: "reference" as const,
        referenceId: referenceWithPendingIdentity.id,
      },
    ];
    flushSync(() => {
      setPendingReference(null);
      setPromptReferences((current) => [
        ...current,
        referenceWithPendingIdentity,
      ]);
      promptReferenceCacheRef.current = [
        ...promptReferenceCacheRef.current.filter(
          (reference) => reference.id !== referenceWithPendingIdentity.id,
        ),
        referenceWithPendingIdentity,
      ];
      setParts(nextParts);
    });
    setActivity("参考图已插入");
  };

  const updatePromptParts = (nextParts: GenerationPromptPart[]) => {
    setParts(nextParts);
    setPromptReferences(
      getComposerLabActiveReferences(
        promptReferenceCacheRef.current,
        nextParts,
      ),
    );
  };

  const submit = async () => {
    if (!configured || parts.length === 0) {
      setActivity("当前状态不可发送");
      return;
    }
    pendingReferenceRef.current = null;
    setPendingReference(null);
    await mockRef.current.submit(parts);
    setActivity("已模拟发送");
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    handleGenerateComposerFormSubmit(event, () => {
      void submit();
    });
  };

  const onPromptKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    handleGenerateComposerPromptKeyDown(event, {
      submit: () => {
        void submit();
      },
    });
  };

  const onStopInputEvent = (event: SyntheticEvent<HTMLElement>) => {
    stopGenerateInputEventPropagation(event);
  };

  const canSubmit = Boolean(
    configured && parts.length > 0 && !referenceLimitMessage,
  );
  const classNames = [
    "generate-composer",
    promptReferences.length > 0 || pendingReference
      ? "generate-composer--with-reference"
      : "",
    referenceLimitMessage ? "generate-composer--with-notice" : "",
  ].filter(Boolean);

  const updateTheme = (nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
    syncQuery({ scenario: scenarioId, theme: nextTheme, width: stageWidth });
  };

  const updateWidth = (nextWidth: number) => {
    setStageWidth(nextWidth);
    syncQuery({ scenario: scenarioId, theme, width: nextWidth });
  };

  return (
    <main
      className="image-board-app composer-lab"
      data-theme={theme}
      data-testid="composer-lab-root"
    >
      <header className="composer-lab__header">
        <div>
          <p className="composer-lab__eyebrow">DEVELOPMENT ONLY</p>
          <h1>Composer Lab</h1>
          <p>直接测试客户端正在使用的输入框组件、样式和设计 token。</p>
        </div>
        <div className="composer-lab__theme-switch" aria-label="主题">
          {(["light", "dark"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-label={option === "light" ? "浅色" : "深色"}
              aria-pressed={theme === option}
              onClick={() => updateTheme(option)}
            >
              {option === "light" ? "浅色" : "深色"}
            </button>
          ))}
        </div>
      </header>

      <div className="composer-lab__workspace">
        <aside className="composer-lab__controls">
          <label>
            <span>测试场景</span>
            <select
              aria-label="测试场景"
              value={scenarioId}
              onChange={(event) =>
                applyScenario(event.target.value as ComposerLabScenarioId)
              }
            >
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend>输入框宽度</legend>
            <div className="composer-lab__segmented">
              {[360, 480, 640].map((width) => (
                <button
                  key={width}
                  type="button"
                  aria-label={`${width}px`}
                  aria-pressed={stageWidth === width}
                  onClick={() => updateWidth(width)}
                >
                  {width}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="composer-lab__checkbox">
            <input
              type="checkbox"
              checked={configured}
              onChange={(event) => setConfigured(event.target.checked)}
            />
            <span>服务已配置</span>
          </label>

          <button
            className="composer-lab__mock-action"
            type="button"
            onClick={() => void selectReference()}
          >
            模拟选择图片
          </button>

          <section
            className="composer-lab__panel-section"
            aria-labelledby="composer-lab-runtime-heading"
          >
            <h2 id="composer-lab-runtime-heading">运行状态</h2>
            <dl className="composer-lab__telemetry">
              <div>
                <dt>状态</dt>
                <dd>{activity}</dd>
              </div>
              <div>
                <dt>引用</dt>
                <dd>{promptReferences.length}</dd>
              </div>
              <div>
                <dt>可发送</dt>
                <dd>{canSubmit ? "是" : "否"}</dd>
              </div>
            </dl>
          </section>

          <section
            className="composer-lab__panel-section"
            aria-labelledby="composer-lab-measurements-heading"
          >
            <h2 id="composer-lab-measurements-heading">实时测量</h2>
            <dl className="composer-lab__telemetry composer-lab__measurements">
              <div>
                <dt>外框高度</dt>
                <dd>{formatMeasurement(measurements.composerHeight)}</dd>
              </div>
              <div>
                <dt>编辑区高度</dt>
                <dd>{formatMeasurement(measurements.editorHeight)}</dd>
              </div>
              <div>
                <dt>图片元素高度</dt>
                <dd>{formatMeasurement(measurements.referenceHeight)}</dd>
              </div>
              <div>
                <dt>文字行高</dt>
                <dd>{formatMeasurement(measurements.lineHeight)}</dd>
              </div>
              <div>
                <dt>图片左右间距</dt>
                <dd>
                  {formatPairMeasurement(
                    measurements.referenceMarginStart,
                    measurements.referenceMarginEnd,
                  )}
                </dd>
              </div>
              <div>
                <dt>编辑区上下内边距</dt>
                <dd>
                  {formatPairMeasurement(
                    measurements.editorPaddingTop,
                    measurements.editorPaddingBottom,
                  )}
                </dd>
              </div>
              <div>
                <dt>图片上下留白</dt>
                <dd
                  className={
                    hasUnevenMeasurementPair(
                      measurements.referenceGapTop,
                      measurements.referenceGapBottom,
                    )
                      ? "composer-lab__measurement-mismatch"
                      : undefined
                  }
                >
                  {formatPairMeasurement(
                    measurements.referenceGapTop,
                    measurements.referenceGapBottom,
                  )}
                </dd>
              </div>
              <div>
                <dt>文字上下留白</dt>
                <dd
                  className={
                    hasUnevenMeasurementPair(
                      measurements.textGapTop,
                      measurements.textGapBottom,
                    )
                      ? "composer-lab__measurement-mismatch"
                      : undefined
                  }
                >
                  {formatPairMeasurement(
                    measurements.textGapTop,
                    measurements.textGapBottom,
                  )}
                </dd>
              </div>
              <div>
                <dt>按钮上下留白</dt>
                <dd
                  className={
                    hasUnevenMeasurementPair(
                      measurements.controlsGapTop,
                      measurements.controlsGapBottom,
                    )
                      ? "composer-lab__measurement-mismatch"
                      : undefined
                  }
                >
                  {formatPairMeasurement(
                    measurements.controlsGapTop,
                    measurements.controlsGapBottom,
                  )}
                </dd>
              </div>
              <div>
                <dt>实际行数</dt>
                <dd>{measurements.renderedLineCount}</dd>
              </div>
              <div>
                <dt>DOM 引用</dt>
                <dd
                  className={
                    measurements.domReferenceCount !== promptReferences.length
                      ? "composer-lab__measurement-mismatch"
                      : undefined
                  }
                >
                  {measurements.domReferenceCount} / 状态{" "}
                  {promptReferences.length}
                </dd>
              </div>
            </dl>
            <div className="composer-lab__content-summary">
              <span>实机内容</span>
              <div data-testid="composer-lab-content-summary">
                {measurements.contentSummary}
              </div>
            </div>
          </section>
        </aside>

        <section className="composer-lab__preview" aria-label="输入框预览">
          <div className="composer-lab__ruler">
            <span>{stageWidth}px</span>
          </div>
          <div
            ref={stageRef}
            className="composer-lab__stage"
            data-testid="composer-lab-stage"
            style={{ width: `${stageWidth}px` }}
          >
            <form onSubmit={onSubmit}>
              <GenerateDialogComposerSection
                classNames={classNames}
                promptEditorRef={editorRef}
                promptEditorParts={parts}
                promptReferences={promptReferences}
                pendingReference={pendingReference}
                promptEditorResetKey={resetKey}
                referenceLimitMessage={referenceLimitMessage}
                advancedOpen={advancedOpen}
                canSubmit={canSubmit}
                onStopInputEvent={onStopInputEvent}
                onCommitPendingReference={commitPendingReference}
                onPromptChange={updatePromptParts}
                onPendingReferenceDiscard={discardPendingReference}
                onPromptKeyPressCapture={onStopInputEvent}
                onPromptKeyUpCapture={onStopInputEvent}
                onPromptKeyDown={onPromptKeyDown}
                setAdvancedOpen={setAdvancedOpen}
              />
            </form>
          </div>
          <p className="composer-lab__hint">
            可直接测试输入、粘贴、撤销、退格、连续增删和换行。
          </p>
        </section>
      </div>
    </main>
  );
};
