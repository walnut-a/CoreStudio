export interface ExternalImageIntakeIssue {
  path: string;
  kind: "waiting" | "failed" | "changed" | "needs-confirmation" | "cache";
  message: string;
  attempts?: number;
}
export interface ExternalImageIntakeStatus {
  issues: ExternalImageIntakeIssue[];
}
