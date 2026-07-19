import type {
  ProjectHealthIssue,
  ProjectHealthReport,
  ProjectRepairFileDetail,
} from "../../shared/desktopBridgeTypes";
import type { ProjectRepairReport } from "../project/projectMaintenanceController";
import { copy } from "../copy";
import { DesktopButton } from "./DesktopButton";

import "./ProjectDataReportDialog.css";

type ProjectHealthIssueGroupKey =
  | "project-file"
  | "missing-file"
  | "record-metadata"
  | "missing-board-element"
  | "display-cache";

const PROJECT_HEALTH_ISSUE_GROUP_ORDER: Record<
  ProjectHealthIssueGroupKey,
  number
> = {
  "project-file": 0,
  "missing-file": 1,
  "missing-board-element": 2,
  "record-metadata": 3,
  "display-cache": 4,
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
  "incomplete-generation-record": "record-metadata",
  "broken-parent-link": "record-metadata",
  "broken-prompt-reference": "record-metadata",
  "inconsistent-provenance": "record-metadata",
  "record-key-mismatch": "record-metadata",
  "invalid-record-field": "record-metadata",
  "invalid-provider-metadata": "record-metadata",
  "invalid-writeback-journal": "project-file",
};

const getProjectHealthIssueGroups = (report: ProjectHealthReport) => {
  const groupsByKey = new Map<
    ProjectHealthIssueGroupKey,
    ProjectHealthIssue[]
  >();

  report.issues.forEach((issue) => {
    const groupKey = PROJECT_HEALTH_ISSUE_GROUP_BY_CODE[issue.code];
    const issues = groupsByKey.get(groupKey) ?? [];
    issues.push(issue);
    groupsByKey.set(groupKey, issues);
  });

  return Array.from(groupsByKey.entries())
    .sort(
      ([leftKey], [rightKey]) =>
        PROJECT_HEALTH_ISSUE_GROUP_ORDER[leftKey] -
        PROJECT_HEALTH_ISSUE_GROUP_ORDER[rightKey],
    )
    .map(([key, issues]) => ({
      key,
      meta: copy.projectDataReport.groups[key],
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
    return copy.projectDataReport.title.checkAndRepair;
  }
  return repairReport
    ? copy.projectDataReport.title.repair
    : copy.projectDataReport.title.check;
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
          <p>{copy.projectDataReport.repairResult.detailDescription}</p>
        </div>
        <span>{copy.projectDataReport.count.items(details.length)}</span>
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
              {copy.projectDataReport.repairReasons[detail.reason]}
            </span>
            <div className="project-health-issue__body">
              <strong>{detail.message}</strong>
              <div className="project-health-issue__meta">
                <span>File ID: {detail.fileId}</span>
                {detail.path ? (
                  <span>{copy.projectDataReport.fields.path(detail.path)}</span>
                ) : null}
                <span>
                  {copy.projectDataReport.fields.reason(
                    copy.projectDataReport.repairReasons[detail.reason],
                  )}
                </span>
                <span>
                  {copy.projectDataReport.fields.nextStep(
                    copy.projectDataReport.repairNextActions[detail.reason],
                  )}
                </span>
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

  const issueGroups = healthReport
    ? getProjectHealthIssueGroups(healthReport)
    : [];
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
            <span className="dialog-card__eyebrow">
              {copy.projectDataReport.eyebrow}
            </span>
            <h2 id="project-data-report-title">{title}</h2>
          </div>
          <DesktopButton
            type="button"
            className="dialog-card__close"
            onClick={onClose}
          >
            {copy.projectDataReport.close}
          </DesktopButton>
        </div>

        {healthReport ? (
          <>
            <div className="project-health-dialog__summary">
              <div>
                <span>{copy.projectDataReport.severity.error}</span>
                <strong>{healthReport.summary.errorCount}</strong>
              </div>
              <div>
                <span>{copy.projectDataReport.severity.warning}</span>
                <strong>{healthReport.summary.warningCount}</strong>
              </div>
              <div>
                <span>{copy.projectDataReport.severity.info}</span>
                <strong>{infoCount}</strong>
              </div>
              <div>
                <span>{copy.projectDataReport.summary.repairable}</span>
                <strong>{healthReport.summary.repairableCount}</strong>
              </div>
            </div>

            <p className="project-health-dialog__description">
              {copy.projectDataReport.summary.projectCounts(
                healthReport.imageRecordCount,
                healthReport.generatedImageRecordCount,
                healthReport.sceneImageFileCount,
              )}
            </p>

            {recordExplanationSummary ? (
              <section
                className="project-health-record-state"
                aria-label={copy.projectDataReport.recordState.title}
              >
                <div className="project-health-group__header">
                  <div>
                    <strong>{copy.projectDataReport.recordState.title}</strong>
                    <p>{copy.projectDataReport.recordState.description}</p>
                  </div>
                </div>
                <div className="project-health-dialog__summary project-health-dialog__summary--compact">
                  <div>
                    <span>{copy.projectDataReport.recordState.onBoard}</span>
                    <strong>{recordExplanationSummary.onBoardCount}</strong>
                  </div>
                  <div>
                    <span>{copy.projectDataReport.recordState.repairable}</span>
                    <strong>{recordExplanationSummary.repairableCount}</strong>
                  </div>
                  <div>
                    <span>{copy.projectDataReport.recordState.manual}</span>
                    <strong>{recordExplanationSummary.manualCount}</strong>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {repairReport ? (
          <section
            className="project-repair-report"
            aria-label={copy.projectDataReport.repairResult.title}
          >
            <div className="project-health-group__header">
              <div>
                <strong>{copy.projectDataReport.repairResult.title}</strong>
                <p>{copy.projectDataReport.repairResult.description}</p>
              </div>
            </div>
            <div className="project-health-dialog__summary">
              <div>
                <span>{copy.projectDataReport.repairResult.rebuiltCache}</span>
                <strong>{repairReport.generatedCount}</strong>
              </div>
              <div>
                <span>{copy.projectDataReport.repairResult.skipped}</span>
                <strong>{repairReport.skippedCount}</strong>
              </div>
              <div>
                <span>{copy.projectDataReport.repairResult.failed}</span>
                <strong>{repairReport.failedCount}</strong>
              </div>
              <div>
                <span>
                  {copy.projectDataReport.repairResult.restoredToBoard}
                </span>
                <strong>{repairReport.restoredImageRecordCount}</strong>
              </div>
            </div>
            {repairReport.repairedGenerationRecordCount ||
            repairReport.skippedImageRecordCount ||
            repairReport.backupPath ? (
              <div className="project-health-issue__meta">
                {repairReport.repairedGenerationRecordCount ? (
                  <span>
                    {copy.projectDataReport.repairResult.repairedSources(
                      repairReport.repairedGenerationRecordCount,
                    )}
                  </span>
                ) : null}
                {repairReport.skippedImageRecordCount ? (
                  <span>
                    {copy.projectDataReport.repairResult.notRestoredToBoard(
                      repairReport.skippedImageRecordCount,
                    )}
                  </span>
                ) : null}
                {repairReport.backupPath ? (
                  <span>
                    {copy.projectDataReport.repairResult.backup(
                      repairReport.backupPath,
                    )}
                  </span>
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
                      {copy.projectDataReport.count.items(group.issues.length)}
                      {group.repairableCount
                        ? ` · ${copy.projectDataReport.count.repairable(
                            group.repairableCount,
                          )}`
                        : ""}
                      {group.manualCount
                        ? ` · ${copy.projectDataReport.count.manual(
                            group.manualCount,
                          )}`
                        : ""}
                      {group.infoCount
                        ? ` · ${copy.projectDataReport.count.info(
                            group.infoCount,
                          )}`
                        : ""}
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
                          {copy.projectDataReport.severity[issue.severity]}
                        </span>
                        <div className="project-health-issue__body">
                          <strong>{issue.message}</strong>
                          <div className="project-health-issue__meta">
                            <span>
                              {copy.projectDataReport.fields.type(
                                copy.projectDataReport.issueMeta[issue.code]
                                  .title,
                              )}
                            </span>
                            {issue.fileId ? (
                              <span>File ID: {issue.fileId}</span>
                            ) : null}
                            {issue.elementId ? (
                              <span>Element ID: {issue.elementId}</span>
                            ) : null}
                            {issue.path ? (
                              <span>
                                {copy.projectDataReport.fields.path(issue.path)}
                              </span>
                            ) : null}
                            {issue.resolution ? (
                              <span>
                                {copy.projectDataReport.fields.resolution(
                                  copy.projectDataReport.resolution[
                                    issue.resolution.status
                                  ],
                                  issue.resolution.summary,
                                )}
                              </span>
                            ) : (
                              <span>
                                {issue.repairable
                                  ? copy.projectDataReport.fallbackResolution
                                      .repairable
                                  : copy.projectDataReport.fallbackResolution
                                      .manual}
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
                {copy.projectDataReport.healthy}
              </p>
            )
          ) : null}

          {repairReport
            ? renderRepairDetailList(
                copy.projectDataReport.repairResult.failedDetails,
                repairReport.failedDetails,
                "error",
              )
            : null}
          {repairReport
            ? renderRepairDetailList(
                copy.projectDataReport.repairResult.skippedDetails,
                repairReport.skippedDetails,
                "info",
              )
            : null}
        </div>
      </div>
    </div>
  );
}
