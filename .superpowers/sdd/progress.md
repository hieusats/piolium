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
