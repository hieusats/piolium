# Task 3+4 report — wiring (semgrep + codeql auto-include)

Commit: 4faf18c3dfed867e941469960ee34bba019b8195

## Task 3 — Semgrep

- skills/semgrep/references/rulesets.md:
  - Added "### Piolium Curated Exploit-Class Rules (Always Included)" subsection (before CI/CD) with a table row: ruleset `skills/semgrep/rules`, always included, resolved to package absolute path, run in-place as local --config.
  - Added a baseline bullet under Step 1 (Always Include Security Baseline): `skills/semgrep/rules` always included.
- skills/semgrep/workflows/scan-workflow.md:
  - Added a `"curated": ["<PKG>/skills/semgrep/rules"]` key to the Step 2 output ruleset JSON.
  - Added a derivation note: PKG = dirname() x3 from the workflow file (workflows->semgrep->skills->PKG); scanner runs it in-place (no clone, no delete).

## Task 4 — CodeQL

- skills/codeql/workflows/run-analysis.md:
  - Added a note before the analyze command: derive PKG_ROOT (dirname x3 from run-analysis.md); pass --search-path="$PKG_ROOT/skills/codeql/queries"; codeql/go-queries must resolve (codeql pack install if missing).
  - Inserted the `--search-path="$PKG_ROOT/skills/codeql/queries"` flag into the `codeql database analyze` command.
- skills/codeql/references/run-all-suite.md:
  - Appended a curated-qlpack block to the suite generation script (after the third-party loop, before FILTERS): `- queries: .` / `from: piolium/go-exploit-queries`.

## Verification

- grep counts confirm each change landed (rulesets 1, scan-workflow 2 curated refs; run-analysis 2 search-path refs; run-all-suite 1 qlpack ref).
- No per-audit manual config required: curated dir is auto-derived + always included.
