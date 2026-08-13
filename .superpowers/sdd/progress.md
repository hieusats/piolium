# SDD ledger — plan: docs/superpowers/plans/2026-08-13-piolium-rekt-ledger-update.md

Work repo: /home/hieusats/dev/piolium (fork github.com/hieusats/piolium, branch rekt-rules).
Plan/spec copied into fork docs/superpowers/{specs,plans}/.

## Rulings (controller decisions; cost-if-wrong in parens)

- Ruling 1 (workspace): work repo = the fork, not the read-only harmoney clone. (cost: SDD scripts that assume plan's repo won't auto-find commits — mitigated by running SDD in the fork.)
- Ruling 2 (public fork): pre-authorized by spec choice + execute → created hieusats/piolium. (cost: a public fork exists; reversible via gh repo delete.)
- Ruling 3 (defer destructive pi-remove): Task 6's `pi remove npm:@vigolium/piolium` deferred — validate auto-load WITHOUT removing the live session's npm piolium (install fork alongside / test paths directly); "replace npm piolium" left as a final user-confirmed step. (cost: full end-to-end "sole piolium" not proven in-session; documented as manual confirm.)
- Ruling 4 (gh fork flag): `gh repo fork <repo> --remote` is unsupported with an explicit repo arg → dropped `--remote`; added upstream remote manually. (cost: none — upstream tracking present.)

## Progress

Task 1: complete (controller workspace setup; fork created+pushed, scaffolded, plan/spec copied; commit 8c0ed6fb on rekt-rules).

Task 2: complete (commits 53cf8e5..0af248c7, controller-review clean).
  - Minor (deferred to final review): Ronin misclassified into bridge-sig-bypass via `quorum` regex token (Ronin was off-chain key-compromise). Fix: drop `quorum` from bridge-sig-bypass regex in map_tags.py; no legitimate anchor lost. Misleads future rule references if unfixed.
Ruling 5: controller-reviews low-risk data/config tasks; full reviewer-subagent reserved for rule-authoring (T7-9) + R-4/R-5 validation (T6).

Task 3+4: complete (commits 0af248c7..4faf18c7, controller-review clean). Risk for T6: "curated" JSON key may not be consumed by scanner -> fallback merge into baseline.
Task 5: complete (controller; migrated 2 go seeds, semgrep --test both pass).

Task 6 (R-4 validation): PASS (controller; no pi-install/pi-remove per Ruling 3).
  - wiring present (scan-workflow curated emission + run-analysis --search-path) ✓
  - recall: `semgrep --config skills/semgrep/rules` fires piolium-go-quorum-counts-roster-size-not-signers @ line 76 on pre-patch verifier.go ✓
  - precision: 0 hits on patched HEAD consensus/quorum/ ✓
  - curated dir loads + validates ✓
  - NOTE: earlier single-rule 0s were a path TYPO (assumed non-existent nested subdir); files are flat under bridge-sig-bypass/. Not a defect.
  - DEFERRED (Ruling 3): full skill auto-load (pi agent emitting curated into a real scan) = manual user confirm; "replace npm piolium" = final user-confirmed step.

Task 7+8: complete (commits d7e2ba8..f7f10dd5, controller-review clean; both rust+solidity rules pass semgrep --test, metadata correct).
  - Deferred (final review): corpus noise check on a real Solidity/Rust repo (none on machine).

Task 9 (CodeQL Go query): DEFERRED (BLOCKED at R-5).
  Ruling: codeql/go-all does not resolve in this env by any mechanism (pack install by name + from source + resolve qlpacks + database analyze --search-path at 3 locations — all "could not resolve module go"). This is a real environment gap, not a plan defect; the plan explicitly gated Task 9 on R-5 with this outcome. Parked: CodeQL Go query deferred to a follow-on (Plan 1.5) gated on resolving codeql/go-all (likely needs the full CodeQL Go query pack distribution installed, or a CodeQL CLI rebuild). Plan 1's deliverables are complete without it.
