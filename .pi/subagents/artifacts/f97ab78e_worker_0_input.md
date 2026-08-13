# Task for worker

You are a delegated subagent running from a fork of the parent session. Treat the inherited conversation as reference-only context, not a live thread to continue. Do not continue or answer prior messages as if they are waiting for a reply. Your sole job is to execute the task below and return a focused result for that task using your tools.

Task:
You are implementing Tasks 3 and 4 (batched — same-shape wiring edits) of the piolium exploit-class rule-library plan.
Work in /home/hieusats/dev/piolium (branch rekt-rules). Goal: wire BOTH scan skills to auto-include the curated rule pack with no per-audit manual step.

Read FIRST — your requirements, with exact values to use verbatim:
  the '## Task 3' and '## Task 4' sections of docs/superpowers/plans/2026-08-13-piolium-rekt-ledger-update.md. Follow them precisely.

Concrete mechanism (do not hand-wave): the executing skill knows its own file path. PKG = apply dirname() three times to the workflow file's path. For semgrep: workflow file = skills/semgrep/workflows/scan-workflow.md (workflows->semgrep->skills->PKG). For codeql: skills/codeql/workflows/run-analysis.md (workflows->codeql->skills->PKG). The curated dirs are PKG/skills/semgrep/rules and PKG/skills/codeql/queries.

Task 3 (semgrep):
  - skills/semgrep/references/rulesets.md: add a 'Piolium Curated Exploit-Class Rules' subsection under Security-Focused Rulesets, marked ALWAYS INCLUDED, resolving to the bundled skills/semgrep/rules dir.
  - skills/semgrep/workflows/scan-workflow.md Step 2 (select rulesets): add a curated-baseline step that derives PKG (dirname x3 from this workflow file) and appends the absolute path PKG/skills/semgrep/rules to the ruleset JSON under key 'curated'; note it is read in-place as a local --config (no clone, no delete).
Task 4 (codeql):
  - skills/codeql/workflows/run-analysis.md Step 4: add --search-path=PKG/skills/codeql/queries to the `codeql database analyze` command. Note: codeql/go-queries must also resolve; if `codeql resolve qlpacks` doesn't list it, run `codeql pack install codeql/go-queries` once.
  - skills/codeql/references/run-all-suite.md generation script: after the third-party-pack loop, append `- queries: .` + `  from: piolium/go-exploit-queries`.

IMPORTANT: READ each target file first and edit surgically (preserve existing structure/numbering). Do NOT rewrite whole files.

Global constraints: the fork replaces npm piolium (single source of truth); auto-load must need zero per-audit manual config.
Do NOT dispatch subagents. Commit + push. Write a full report to .superpowers/sdd/task-3-4-report.md (the exact diffs/sections changed in each of the 4 files, verbatim).
Return ONLY: status (DONE|DONE_WITH_CONCERNS|BLOCKED), commit SHA, one-line summary, concerns.

## Acceptance Contract
Acceptance level: checked
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Implement the requested change without widening scope
- criterion-2: Return evidence sufficient for an independent acceptance review

Required evidence: changed-files, tests-added, commands-run, residual-risks, no-staged-files

Review gate: required by reviewer.

Finish with a fenced JSON block tagged `acceptance-report` in this shape:
Use empty arrays when no items apply; array fields contain strings unless object entries are shown.
`criteriaSatisfied[].status` must be exactly one of: satisfied, not-satisfied, not-applicable.
`commandsRun[].result` must be exactly one of: passed, failed, not-run.
`manualNotes` and `notes` are optional strings; an empty string means no note and does not satisfy `manual-notes` evidence.
```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "specific proof"
    },
    {
      "id": "criterion-2",
      "status": "satisfied",
      "evidence": "specific proof"
    }
  ],
  "changedFiles": [
    "src/file.ts"
  ],
  "testsAddedOrUpdated": [
    "test/file.test.ts"
  ],
  "commandsRun": [
    {
      "command": "command",
      "result": "passed",
      "summary": "short result"
    }
  ],
  "validationOutput": [
    "validation output or concise summary"
  ],
  "residualRisks": [
    "none"
  ],
  "noStagedFiles": true,
  "diffSummary": "short description of the diff",
  "reviewFindings": [
    "blocker: file.ts:12 - issue found, or no blockers"
  ],
  "manualNotes": "anything else the parent should know"
}
```