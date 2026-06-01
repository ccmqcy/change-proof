import test from "node:test";
import assert from "node:assert/strict";
import { classifyFileGroup, createChangedFile, detectRiskSignals } from "../dist/classify.js";

test("classifies common file groups", () => {
  assert.equal(classifyFileGroup("src/auth/login.ts"), "source");
  assert.equal(classifyFileGroup("src/auth/login.test.ts"), "test");
  assert.equal(classifyFileGroup("README.md"), "docs");
  assert.equal(classifyFileGroup(".github/workflows/ci.yml"), "config");
  assert.equal(classifyFileGroup("dist/bundle.js"), "generated");
  assert.equal(classifyFileGroup("public/logo.png"), "asset");
});

test("detects high-risk auth and money files", () => {
  const authRisks = detectRiskSignals("src/auth/session-token.ts");
  const moneyRisks = detectRiskSignals("src/billing/refund-ledger.ts");

  assert.ok(authRisks.some((risk) => risk.id === "security-auth" && risk.level === "high"));
  assert.ok(moneyRisks.some((risk) => risk.id === "money-flow" && risk.level === "high"));
});

test("creates normalized changed file records", () => {
  const changedFile = createChangedFile("src\\api\\orders.ts", "M");

  assert.equal(changedFile.path, "src/api/orders.ts");
  assert.equal(changedFile.kind, "modified");
  assert.equal(changedFile.group, "source");
  assert.ok(changedFile.risks.some((risk) => risk.id === "public-api"));
});
