# Task for worker

You are a delegated subagent running from a fork of the parent session. Treat the inherited conversation as reference-only context, not a live thread to continue. Do not continue or answer prior messages as if they are waiting for a reply. Your sole job is to execute the task below and return a focused result for that task using your tools.

Task:
You are implementing Task 2 of the piolium exploit-class rule-library plan.
Work in /home/hieusats/dev/piolium (already on branch rekt-rules; this is your fork github.com/hieusats/piolium).
Goal of this task: build the 12-class exploit taxonomy from the rekt ledger.

Read FIRST — your requirements, with exact values to use verbatim:
  the '## Task 2' section of docs/superpowers/plans/2026-08-13-piolium-rekt-ledger-update.md (in this repo). Follow its steps verbatim (Step1 vendor tags via jq; Step2 write taxonomy/map_tags.py exactly as shown; Step3 run it + sanity-check residual; Step4 write taxonomy/exploit-classes.md AND add a source:rekt|audit field per class in exploit-classes.json; Step5 commit + push).

Key input path: /home/hieusats/dev/btc/solidity-auditor/pi-package/skills/solidity-auditor/_rekt_work/classified.json (READ-ONLY — do not modify; Step1's jq copies the tags into taxonomy/rekt-tags.json).

Global constraints that bind this task:
  - taxonomy is the FIRST implementation deliverable (spec task 1).
  - Most classes are rekt-grounded; a few are audit-found with no rekt anchor (e.g. verify-gated-by-position from Harmony H1) -> add `source: rekt|audit` per class.
  - Off-chain tags (cex-hot-wallet-*, insider/rug, social-engineering) belong in `residual_mechanism_tags`; do NOT force-map them into a class.

Do NOT dispatch any subagents.
After committing, write a full report to .superpowers/sdd/task-2-report.md covering: files created, the map_tags.py stdout (mapped=N residual=M), any regex you refined and why, and the commit SHA.
Return ONLY: status (DONE | DONE_WITH_CONCERNS | BLOCKED), commit SHA, one-line summary, and any concerns.

## Acceptance Contract
Acceptance level: attested
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Return concrete findings with file paths and severity when applicable

Required evidence: review-findings, residual-risks

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