import test from "node:test";
import assert from "node:assert/strict";
import { createChangedFile } from "../dist/classify.js";
import { createReport, renderMarkdown } from "../dist/report.js";

test("renders verification and not-verified sections", () => {
  const snapshot = {
    repoPath: "/tmp/repo",
    stat: " src/auth/session.ts | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)",
    changedFiles: [createChangedFile("src/auth/session.ts", "M")],
    untrackedFiles: [],
    gitWarnings: []
  };

  const report = createReport(snapshot);
  const markdown = renderMarkdown(report);

  assert.match(markdown, /# Change Proof Report/);
  assert.match(markdown, /Status: NOT RUN/);
  assert.match(markdown, /No dynamic verification command was run/);
  assert.match(markdown, /Auth or session boundary/);
});

test("marks passing verification as PASS", () => {
  const snapshot = {
    repoPath: "/tmp/repo",
    stat: "",
    changedFiles: [createChangedFile("tests/session.test.ts", "M")],
    untrackedFiles: [],
    gitWarnings: []
  };

  const report = createReport(snapshot, {
    command: "npm test",
    exitCode: 0,
    passed: true,
    durationMs: 12,
    stdout: "ok",
    stderr: ""
  });
  const markdown = renderMarkdown(report);

  assert.match(markdown, /Status: PASS/);
  assert.match(markdown, /Command: `npm test`/);
});
