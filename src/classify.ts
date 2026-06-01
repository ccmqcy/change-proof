import type { ChangeKind, ChangedFile, FileGroup, RiskLevel, RiskSignal } from "./types.js";

const SOURCE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".go",
  ".h",
  ".hpp",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".m",
  ".mm",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".svelte",
  ".swift",
  ".ts",
  ".tsx",
  ".vue"
]);

const ASSET_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mp3",
  ".mp4",
  ".otf",
  ".png",
  ".svg",
  ".ttf",
  ".webm",
  ".woff",
  ".woff2"
]);

const GENERATED_DIR_PATTERNS = [
  /(^|\/)dist\//i,
  /(^|\/)build\//i,
  /(^|\/)coverage\//i,
  /(^|\/)generated\//i,
  /(^|\/)__generated__\//i
];

interface RiskRule {
  id: string;
  label: string;
  level: RiskLevel;
  pattern: RegExp;
  reason: string;
  nextCheck: string;
}

const RISK_RULES: RiskRule[] = [
  {
    id: "security-auth",
    label: "Auth or session boundary",
    level: "high",
    pattern: /auth|login|logout|session|token|jwt|oauth|sso|password|credential/i,
    reason: "Authentication, sessions, or credentials can change access behavior.",
    nextCheck: "Run positive and negative auth checks, including unauthorized and expired-token cases."
  },
  {
    id: "permission-access",
    label: "Permission or access control",
    level: "high",
    pattern: /permission|policy|acl|rbac|role|guard|middleware|tenant|scope/i,
    reason: "Access-control changes can expose data or block legitimate users.",
    nextCheck: "Verify allowed and denied paths, including cross-tenant or out-of-scope access where relevant."
  },
  {
    id: "money-flow",
    label: "Money or order flow",
    level: "high",
    pattern: /payment|billing|invoice|price|pricing|ledger|finance|refund|checkout|order/i,
    reason: "Money and order changes can affect balances, billing, or customer-visible transactions.",
    nextCheck: "Verify successful flow, failed flow, and persisted data or ledger state."
  },
  {
    id: "database-state",
    label: "Database or persisted state",
    level: "high",
    pattern: /migration|schema|database|db|sql|prisma|sequelize|typeorm|entity|model|repository/i,
    reason: "Persistence changes can affect existing data, migrations, and rollback behavior.",
    nextCheck: "Run migration or data-shape checks, then read back affected records."
  },
  {
    id: "public-api",
    label: "Public API or route contract",
    level: "medium",
    pattern: /api|route|router|controller|endpoint|handler|openapi|swagger/i,
    reason: "API changes can break callers or change request and response contracts.",
    nextCheck: "Verify method, path, status codes, and request/response shape for affected endpoints."
  },
  {
    id: "ci-release",
    label: "CI, release, or automation",
    level: "medium",
    pattern: /(^|\/)\.github\/workflows\/|release|publish|deploy|dockerfile|container|ci|pipeline/i,
    reason: "Automation changes can affect build, test, deploy, or release behavior.",
    nextCheck: "Run the impacted workflow locally where possible or verify the CI run after pushing."
  },
  {
    id: "dependency",
    label: "Dependency or package surface",
    level: "medium",
    pattern: /package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|requirements\.txt|pyproject\.toml|poetry\.lock|cargo\.toml|cargo\.lock|go\.mod|go\.sum/i,
    reason: "Dependency changes can alter runtime, security posture, and install behavior.",
    nextCheck: "Run install, build, and relevant tests from a clean dependency state."
  },
  {
    id: "environment-config",
    label: "Environment or runtime config",
    level: "medium",
    pattern: /(^|\/)\.env|config|settings|vite\.config|webpack|rollup|tsconfig|eslint|prettier/i,
    reason: "Configuration changes can alter local, CI, or production behavior.",
    nextCheck: "Verify the affected runtime mode and document any required environment variable changes."
  }
];

export function classifyChangeKind(status: string): ChangeKind {
  const code = status.trim().charAt(0).toUpperCase();

  switch (code) {
    case "A":
      return "added";
    case "M":
      return "modified";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "C":
      return "copied";
    case "U":
      return "unmerged";
    case "?":
      return "unknown";
    default:
      return "unknown";
  }
}

export function classifyFileGroup(filePath: string): FileGroup {
  const normalized = normalizePath(filePath);
  const lower = normalized.toLowerCase();
  const extension = extensionOf(lower);
  const basename = lower.split("/").pop() ?? lower;

  if (GENERATED_DIR_PATTERNS.some((pattern) => pattern.test(lower))) {
    return "generated";
  }

  if (
    lower.includes("/__tests__/") ||
    lower.includes("/tests/") ||
    lower.includes("/test/") ||
    /\.test\.[^.]+$/i.test(lower) ||
    /\.spec\.[^.]+$/i.test(lower) ||
    basename.startsWith("test_")
  ) {
    return "test";
  }

  if (
    lower.startsWith("docs/") ||
    basename === "readme.md" ||
    basename === "changelog.md" ||
    basename === "contributing.md" ||
    basename === "security.md" ||
    extension === ".md" ||
    extension === ".mdx" ||
    extension === ".rst" ||
    extension === ".txt"
  ) {
    return "docs";
  }

  if (
    lower.startsWith(".github/") ||
    lower.startsWith(".vscode/") ||
    lower.startsWith(".idea/") ||
    basename.startsWith(".") ||
    basename.endsWith(".config.js") ||
    basename.endsWith(".config.ts") ||
    basename.endsWith(".config.mjs") ||
    basename.endsWith(".config.cjs") ||
    basename === "package.json" ||
    basename === "package-lock.json" ||
    basename === "pnpm-lock.yaml" ||
    basename === "yarn.lock" ||
    basename === "bun.lockb" ||
    basename === "tsconfig.json" ||
    basename === "dockerfile" ||
    extension === ".json" ||
    extension === ".yaml" ||
    extension === ".yml" ||
    extension === ".toml" ||
    extension === ".ini"
  ) {
    return "config";
  }

  if (SOURCE_EXTENSIONS.has(extension)) {
    return "source";
  }

  if (ASSET_EXTENSIONS.has(extension)) {
    return "asset";
  }

  return "other";
}

export function detectRiskSignals(filePath: string): RiskSignal[] {
  const normalized = normalizePath(filePath);
  return RISK_RULES.filter((rule) => rule.pattern.test(normalized)).map(({ pattern: _pattern, ...rule }) => rule);
}

export function createChangedFile(path: string, status: string, originalPath?: string): ChangedFile {
  const normalized = normalizePath(path);
  return {
    path: normalized,
    originalPath: originalPath ? normalizePath(originalPath) : undefined,
    status,
    kind: classifyChangeKind(status),
    group: classifyFileGroup(normalized),
    risks: detectRiskSignals(normalized)
  };
}

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function extensionOf(filePath: string): string {
  const slashIndex = filePath.lastIndexOf("/");
  const dotIndex = filePath.lastIndexOf(".");

  if (dotIndex <= slashIndex) {
    return "";
  }

  return filePath.slice(dotIndex);
}
