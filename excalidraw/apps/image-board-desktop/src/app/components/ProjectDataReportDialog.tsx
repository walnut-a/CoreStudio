import type {
  ProjectHealthIssue,
  ProjectHealthReport,
  ProjectRepairFileDetail,
} from "../../shared/desktopBridgeTypes";
import type { ProjectRepairReport } from "../project/projectMaintenanceController";
import { DesktopButton } from "./DesktopButton";

import "./ProjectDataReportDialog.css";

const PROJECT_HEALTH_SEVERITY_LABELS: Record<
  ProjectHealthIssue["severity"],
  string
> = {
  error: "错误",
  warning: "警告",
  info: "提示",
};

const PROJECT_HEALTH_RESOLUTION_LABELS: Record<
  NonNullable<ProjectHealthIssue["resolution"]>["status"],
  string
> = {
  repairable: "可修复",
  manual: "需手动",
  info: "说明",
};

const PROJECT_HEALTH_ISSUE_META: Record<
  ProjectHealthIssue["code"],
  {
    title: string;
    description: string;
    suggestion: string;
  }
> = {
  "scene-parse-failed": {
    title: "画板文件无法解析",
    description: "scene.excalidraw.json 不是有效的画板数据。",
    suggestion: "需要从备份或历史版本恢复画板文件。",
  },
  "missing-image-record": {
    title: "画板图片缺少索引记录",
    description: "画布上有图片元素，但 image-records.json 里找不到对应记录。",
    suggestion: "需要补索引或重新导入这张图片。",
  },
  "missing-asset-file": {
    title: "图片原始文件缺失",
    description: "索引记录还在，但 assets 里的原始图片文件已经找不到。",
    suggestion: "需要从备份恢复原始图片，或删除对应记录。",
  },
  "missing-thumbnail-cache": {
    title: "图片缓存待重建",
    description: "原始图片存在，但用于快速打开项目的显示缓存不完整。",
    suggestion: "运行项目数据修复会重建这部分缓存。",
  },
  "missing-preview-cache": {
    title: "预览缓存尚未生成",
    description: "高清预览缓存还没有生成，不影响项目数据完整性。",
    suggestion: "通常无需手动处理。",
  },
  "orphan-image-record": {
    title: "项目图片未显示在画板",
    description: "图片记录和资产文件存在，但当前画板没有对应图片元素。",
    suggestion: "运行项目数据修复会把可读取的图片放回画板。",
  },
  "orphan-generated-record": {
    title: "生成图未显示在画板",
    description:
      "生成图的资产和记录存在，但当前画板没有对应图片元素，所以从生成记录列表点击时可能无法定位。",
    suggestion: "运行项目数据修复会把可读取的生成图放回画板。",
  },
  "unwritten-acp-output": {
    title: "ACP 生成结果未写入项目",
    description:
      "ACP Agent 已经在本地生成图片，但写回 CoreStudio 项目时中断或失败。",
    suggestion: "运行项目数据修复会把这张本地生成图补进项目资产和画板。",
  },
  "incomplete-generation-record": {
    title: "生成记录元数据不完整",
    description:
      "生成图缺少来源字段。提示词允许为空，但来源不能为空，否则后续无法判断它来自 CoreStudio、内置画板还是 ACP Agent。",
    suggestion:
      "旧项目修复会把这类记录补为 CoreStudio 来源；新写入会在保存前直接校验并拒绝不完整数据。",
  },
  "broken-parent-link": {
    title: "图片编辑链前序缺失",
    description: "一张图片记录指向了不存在的父图片。",
    suggestion: "需要恢复父图片记录，或清理这条链路关系。",
  },
  "broken-prompt-reference": {
    title: "提示词引用缺少索引记录",
    description: "生成记录里引用的参考图片，在 image-records.json 中不存在。",
    suggestion: "需要恢复参考图片索引，或清理这条引用。",
  },
};

type ProjectHealthIssueGroupKey =
  | "project-file"
  | "missing-file"
  | "record-metadata"
  | "missing-board-element"
  | "acp-output"
  | "display-cache";

const PROJECT_HEALTH_ISSUE_GROUP_META: Record<
  ProjectHealthIssueGroupKey,
  {
    title: string;
    description: string;
    suggestion: string;
    order: number;
  }
> = {
  "project-file": {
    title: "项目画板文件异常",
    description: "项目画板文件本身无法被正常解析，画布内容可能无法完整读取。",
    suggestion: "需要从备份或历史版本恢复画板文件，再重新检查项目数据。",
    order: 0,
  },
  "missing-file": {
    title: "图片文件缺失",
    description: "项目记录仍然存在，但本地图片文件已经找不到。",
    suggestion: "需要从备份恢复原始图片，或确认后清理对应记录。",
    order: 1,
  },
  "missing-board-element": {
    title: "画板缺少图片元素",
    description:
      "图片资产和记录存在，但当前画板没有对应图片元素，所以列表点击时可能无法定位。",
    suggestion: "运行项目数据修复会把可读取的图片补回画板。",
    order: 2,
  },
  "record-metadata": {
    title: "记录元数据不完整",
    description:
      "图片记录、生成记录或引用关系缺少必要信息，后续可能无法判断来源或上下文。",
    suggestion:
      "能自动补齐的旧记录会通过项目数据修复处理；无法确认的关系需要手动检查。",
    order: 3,
  },
  "acp-output": {
    title: "ACP 结果未写入项目",
    description:
      "ACP Agent 已经在本地生成图片，但写回 CoreStudio 项目时中断或失败。",
    suggestion: "运行项目数据修复会把可读取的 ACP 输出补进项目资产和画板。",
    order: 4,
  },
  "display-cache": {
    title: "显示缓存需要处理",
    description: "原始图片仍在，但缩略图或预览缓存不完整。",
    suggestion: "运行项目数据修复会重建可恢复的显示缓存。",
    order: 5,
  },
};

const PROJECT_HEALTH_ISSUE_GROUP_BY_CODE: Record<
  ProjectHealthIssue["code"],
  ProjectHealthIssueGroupKey
> = {
  "scene-parse-failed": "project-file",
  "missing-image-record": "record-metadata",
  "missing-asset-file": "missing-file",
  "missing-thumbnail-cache": "display-cache",
  "missing-preview-cache": "display-cache",
  "orphan-image-record": "missing-board-element",
  "orphan-generated-record": "missing-board-element",
  "unwritten-acp-output": "acp-output",
  "incomplete-generation-record": "record-metadata",
  "broken-parent-link": "record-metadata",
  "broken-prompt-reference": "record-metadata",
};

const PROJECT_REPAIR_REASON_LABELS: Record<
  ProjectRepairFileDetail["reason"],
  string
> = {
  "record-missing": "缺少图片记录",
  "thumbnail-not-needed": "无需处理",
  "thumbnail-cache-exists": "缓存已存在",
  "thumbnail-rebuild-failed": "缓存重建失败",
  "board-restore-failed": "画板补回失败",
  "acp-output-import-failed": "ACP 输出导入失败",
};

const PROJECT_REPAIR_NEXT_ACTIONS: Record<
  ProjectRepairFileDetail["reason"],
  string
> = {
  "record-missing": "这张图片缺少项目索引记录；请确认原始文件是否仍需要保留，必要时重新导入。",
  "thumbnail-not-needed": "不用处理这张图片；它不需要额外显示缓存。",
  "thumbnail-cache-exists": "不用处理这张图片；显示缓存已经存在。",
  "thumbnail-rebuild-failed": "请确认原始图片文件可读取，再重新运行项目数据修复。",
  "board-restore-failed": "请确认原始图片文件仍在项目 assets 中；恢复文件后再重新运行项目数据修复。",
  "acp-output-import-failed": "请确认 ACP 输出文件仍存在且可读取，再重新运行项目数据修复。",
};

const getProjectHealthIssueGroups = (report: ProjectHealthReport) => {
  const groupsByKey = new Map<ProjectHealthIssueGroupKey, ProjectHealthIssue[]>();

  report.issues.forEach((issue) => {
    const groupKey = PROJECT_HEALTH_ISSUE_GROUP_BY_CODE[issue.code];
    const issues = groupsByKey.get(groupKey) ?? [];
    issues.push(issue);
    groupsByKey.set(groupKey, issues);
  });

  return Array.from(groupsByKey.entries())
    .sort(
      ([leftKey], [rightKey]) =>
        PROJECT_HEALTH_ISSUE_GROUP_META[leftKey].order -
        PROJECT_HEALTH_ISSUE_GROUP_META[rightKey].order,
    )
    .map(([key, issues]) => ({
      key,
      meta: PROJECT_HEALTH_ISSUE_GROUP_META[key],
      issues,
      repairableCount: issues.filter((issue) => issue.repairable).length,
      manualCount: issues.filter(
        (issue) => issue.resolution?.status === "manual",
      ).length,
      infoCount: issues.filter((issue) => issue.resolution?.status === "info")
        .length,
    }));
};

const getDialogTitle = (
  healthReport: ProjectHealthReport | null,
  repairReport: ProjectRepairReport | null,
) => {
  if (healthReport && repairReport) {
    return "数据检查与修复详情";
  }
  return repairReport ? "数据修复详情" : "数据检查详情";
};

const getRecordExplanationSummary = (report: ProjectHealthReport) => {
  const explanations = Object.values(report.recordExplanations ?? {});
  if (!explanations.length) {
    return null;
  }

  return {
    onBoardCount: explanations.filter(
      (explanation) => explanation.code === "board-element",
    ).length,
    repairableCount: explanations.filter(
      (explanation) => explanation.status === "repairable",
    ).length,
    manualCount: explanations.filter(
      (explanation) => explanation.status === "manual",
    ).length,
  };
};

const renderRepairDetailList = (
  title: string,
  details: ProjectRepairFileDetail[],
  severity: ProjectHealthIssue["severity"],
) => {
  if (!details.length) {
    return null;
  }

  return (
    <section className="project-health-group" aria-label={title}>
      <div className="project-health-group__header">
        <div>
          <strong>{title}</strong>
          <p>这里列出项目数据修复过程中需要关注的图片。</p>
        </div>
        <span>{details.length} 项</span>
      </div>
      <div className="project-health-issue-list">
        {details.map((detail, index) => (
          <article
            className="project-health-issue"
            key={`${detail.reason}:${detail.fileId}:${detail.path ?? index}`}
          >
            <span
              className={[
                "project-health-issue__severity",
                `project-health-issue__severity--${severity}`,
              ].join(" ")}
            >
              {PROJECT_REPAIR_REASON_LABELS[detail.reason]}
            </span>
            <div className="project-health-issue__body">
              <strong>{detail.message}</strong>
              <div className="project-health-issue__meta">
                <span>File ID: {detail.fileId}</span>
                {detail.path ? <span>路径: {detail.path}</span> : null}
                <span>原因: {PROJECT_REPAIR_REASON_LABELS[detail.reason]}</span>
                <span>下一步: {PROJECT_REPAIR_NEXT_ACTIONS[detail.reason]}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

interface ProjectDataReportDialogProps {
  open: boolean;
  healthReport: ProjectHealthReport | null;
  repairReport: ProjectRepairReport | null;
  onClose: () => void;
}

export function ProjectDataReportDialog({
  open,
  healthReport,
  repairReport,
  onClose,
}: ProjectDataReportDialogProps) {
  if (!open || (!healthReport && !repairReport)) {
    return null;
  }

  const issueGroups = healthReport ? getProjectHealthIssueGroups(healthReport) : [];
  const recordExplanationSummary = healthReport
    ? getRecordExplanationSummary(healthReport)
    : null;
  const infoCount =
    healthReport?.issues.filter((issue) => issue.severity === "info").length ??
    0;
  const title = getDialogTitle(healthReport, repairReport);

  return (
    <div className="dialog-backdrop">
      <div
        className="dialog-card dialog-card--wide project-health-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-data-report-title"
      >
        <div className="dialog-card__header">
          <div>
            <span className="dialog-card__eyebrow">项目数据</span>
            <h2 id="project-data-report-title">{title}</h2>
          </div>
          <DesktopButton
            type="button"
            className="dialog-card__close"
            onClick={onClose}
          >
            关闭
          </DesktopButton>
        </div>

        {healthReport ? (
          <>
            <div className="project-health-dialog__summary">
              <div>
                <span>错误</span>
                <strong>{healthReport.summary.errorCount}</strong>
              </div>
              <div>
                <span>警告</span>
                <strong>{healthReport.summary.warningCount}</strong>
              </div>
              <div>
                <span>提示</span>
                <strong>{infoCount}</strong>
              </div>
              <div>
                <span>可修复项</span>
                <strong>{healthReport.summary.repairableCount}</strong>
              </div>
            </div>

            <p className="project-health-dialog__description">
              当前项目共有 {healthReport.imageRecordCount} 条图片记录，其中{" "}
              {healthReport.generatedImageRecordCount} 条生成记录，画板中引用了{" "}
              {healthReport.sceneImageFileCount} 张图片。
            </p>

            {recordExplanationSummary ? (
              <section className="project-health-record-state" aria-label="图片状态">
                <div className="project-health-group__header">
                  <div>
                    <strong>图片状态</strong>
                    <p>
                      图片状态按项目资产、画板元素和生成记录之间的关系计算。
                    </p>
                  </div>
                </div>
                <div className="project-health-dialog__summary project-health-dialog__summary--compact">
                  <div>
                    <span>已在画板</span>
                    <strong>{recordExplanationSummary.onBoardCount}</strong>
                  </div>
                  <div>
                    <span>可通过修复处理</span>
                    <strong>{recordExplanationSummary.repairableCount}</strong>
                  </div>
                  <div>
                    <span>需要手动确认</span>
                    <strong>{recordExplanationSummary.manualCount}</strong>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {repairReport ? (
          <section className="project-repair-report" aria-label="上次修复结果">
            <div className="project-health-group__header">
              <div>
                <strong>上次修复结果</strong>
                <p>
                  修复过程只在详情中展示具体原因，完成提示保持简洁。
                </p>
              </div>
            </div>
            <div className="project-health-dialog__summary">
              <div>
                <span>重建缓存</span>
                <strong>{repairReport.generatedCount}</strong>
              </div>
              <div>
                <span>跳过</span>
                <strong>{repairReport.skippedCount}</strong>
              </div>
              <div>
                <span>失败</span>
                <strong>{repairReport.failedCount}</strong>
              </div>
              <div>
                <span>补回画板</span>
                <strong>{repairReport.restoredImageRecordCount}</strong>
              </div>
            </div>
            {repairReport.repairedGenerationRecordCount ||
            repairReport.repairedAcpOutputCount ||
            repairReport.skippedImageRecordCount ||
            repairReport.backupPath ? (
              <div className="project-health-issue__meta">
                {repairReport.repairedGenerationRecordCount ? (
                  <span>
                    补全来源：{repairReport.repairedGenerationRecordCount} 条
                  </span>
                ) : null}
                {repairReport.repairedAcpOutputCount ? (
                  <span>补入 ACP 输出：{repairReport.repairedAcpOutputCount} 张</span>
                ) : null}
                {repairReport.skippedImageRecordCount ? (
                  <span>未补回画板：{repairReport.skippedImageRecordCount} 张</span>
                ) : null}
                {repairReport.backupPath ? (
                  <span>备份：{repairReport.backupPath}</span>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="project-health-dialog__groups">
          {healthReport ? (
            issueGroups.length ? (
              issueGroups.map((group) => (
                <section
                  className="project-health-group"
                  key={group.key}
                  aria-label={group.meta.title}
                >
                  <div className="project-health-group__header">
                    <div>
                      <strong>{group.meta.title}</strong>
                      <p>{group.meta.description}</p>
                    </div>
                    <span>
                      {group.issues.length} 项
                      {group.repairableCount
                        ? ` · ${group.repairableCount} 项可修复`
                        : ""}
                      {group.manualCount ? ` · ${group.manualCount} 项需手动` : ""}
                      {group.infoCount ? ` · ${group.infoCount} 条说明` : ""}
                    </span>
                  </div>
                  <p className="project-health-group__suggestion">
                    {group.meta.suggestion}
                  </p>
                  <div className="project-health-issue-list">
                    {group.issues.map((issue, index) => (
                      <article
                        className="project-health-issue"
                        key={`${issue.code}:${
                          issue.fileId ?? issue.elementId ?? issue.path ?? index
                        }`}
                      >
                        <span
                          className={[
                            "project-health-issue__severity",
                            `project-health-issue__severity--${issue.severity}`,
                          ].join(" ")}
                        >
                          {PROJECT_HEALTH_SEVERITY_LABELS[issue.severity]}
                        </span>
                        <div className="project-health-issue__body">
                          <strong>{issue.message}</strong>
                          <div className="project-health-issue__meta">
                            <span>类型: {PROJECT_HEALTH_ISSUE_META[issue.code].title}</span>
                            {issue.fileId ? (
                              <span>File ID: {issue.fileId}</span>
                            ) : null}
                            {issue.elementId ? (
                              <span>Element ID: {issue.elementId}</span>
                            ) : null}
                            {issue.path ? <span>路径: {issue.path}</span> : null}
                            {issue.resolution ? (
                              <span>
                                {
                                  PROJECT_HEALTH_RESOLUTION_LABELS[
                                    issue.resolution.status
                                  ]
                                }
                                ：{issue.resolution.summary}
                              </span>
                            ) : (
                              <span>
                                {issue.repairable
                                  ? "可修复：项目数据修复会尝试处理。"
                                  : "需手动：请根据上方建议确认。"}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <p className="project-health-dialog__empty">
                没有发现需要处理的问题。
              </p>
            )
          ) : null}

          {repairReport
            ? renderRepairDetailList(
                "修复失败",
                repairReport.failedDetails,
                "error",
              )
            : null}
          {repairReport
            ? renderRepairDetailList(
                "跳过说明",
                repairReport.skippedDetails,
                "info",
              )
            : null}
        </div>
      </div>
    </div>
  );
}
