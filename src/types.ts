export type ChangeKind = "added" | "modified" | "deleted" | "renamed" | "copied" | "unmerged" | "unknown";

export type FileGroup = "source" | "test" | "docs" | "config" | "generated" | "asset" | "other";

export type RiskLevel = "low" | "medium" | "high";

export interface ChangedFile {
  path: string;
  originalPath?: string;
  status: string;
  kind: ChangeKind;
  group: FileGroup;
  risks: RiskSignal[];
}

export interface RiskSignal {
  id: string;
  label: string;
  level: RiskLevel;
  reason: string;
  nextCheck: string;
}

export interface GitDiffSnapshot {
  repoPath: string;
  base?: string;
  stat: string;
  changedFiles: ChangedFile[];
  untrackedFiles: ChangedFile[];
  gitWarnings: string[];
}

export interface VerificationRun {
  command: string;
  exitCode: number | null;
  passed: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface ChangeProofReport {
  generatedAt: string;
  repoPath: string;
  base?: string;
  snapshot: GitDiffSnapshot;
  verification?: VerificationRun;
  summary: {
    totalFiles: number;
    byGroup: Record<FileGroup, number>;
    riskCount: number;
    highRiskCount: number;
    hasTestsChanged: boolean;
    hasSourceChanged: boolean;
  };
  notVerified: string[];
}

export interface ReportOptions {
  repoPath: string;
  base?: string;
  outputPath: string;
  jsonPath?: string;
  testCommand?: string;
  failOnTestFailure: boolean;
}
