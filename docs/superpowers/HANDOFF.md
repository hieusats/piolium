# HANDOFF — piolium rekt-ledger rule library (resume here)

**Read this FIRST in the fresh session.** It is the single source of truth for state + resume.

## Where the work lives
- **Repo:** `/home/hieusats/dev/piolium` — fork of `github.com/vigolium/piolium` → `github.com/hieusats/piolium`, branch **`rekt-rules`**.
- **Spec:** `docs/superpowers/specs/2026-08-13-piolium-rekt-ledger-update-design.md` (authority).
- **Plan:** `docs/superpowers/plans/2026-08-13-piolium-rekt-ledger-update.md` (Plans 1-6; Plan 1 = Foundation+bridge-sig-bypass, Plans 2-6 = the other Tier-1 classes).
- **Taxonomy:** `taxonomy/exploit-classes.json` (12 classes, `source:rekt|audit`, anchors) + `taxonomy/rekt-tags.json` (vendored 303 tags) + `taxonomy/map_tags.py`.
- **Local SDD ledger (gitignored scratch):** `.superpowers/sdd/progress.md` — the durable record is THIS file + git history.

## DONE — Tier 1 complete (13 Semgrep rules, 6 classes, all `semgrep --test` ✓)

| Class | Go | Rust | Solidity |
|---|---|---|---|
| bridge-sig-bypass | quorum-roster, empty-sig | empty-sig | empty-sig |
| replay-missing-idempotency | replay-key | — | transfer-before-state-zero |
| verify-gated-by-position | batch-position | — | (Go-only) |
| oracle-spot-no-twap | — | spot-balance-as-price | spot-reserve-as-price |
| reentrancy-readonly-and-callback | — | — | external-call-before-state-write |
| access-control-unprotected | privileged-handler-without-auth | privileged-without-signer-check | privileged-fn-missing-owner |

- **Wiring DONE + R-4 validated**: `skills/semgrep/workflows/scan-workflow.md` emits `"curated": ["<PKG>/skills/semgrep/rules"]` into the ruleset JSON (PKG = `dirname()`×3 from the workflow file); `skills/codeql/workflows/run-analysis.md` adds `--search-path`; `skills/codeql/references/run-all-suite.md` adds `from: piolium/go-exploit-queries`. R-4: curated pack fires the quorum rule @ line 76 on `git show db22d511d:consensus/quorum/verifier.go` (pre-patch), 0 on patched HEAD.
- **Library is LIVE**: any piolium semgrep scan auto-runs the 13 rules with zero per-audit config (once the fork is installed — see "replace npm piolium" below).

## NEXT — deferred work (do in this order)

### 1. CodeQL Go queries (BLOCKED on env — investigate first)
**R-5 blocker:** `codeql/go-all` does NOT resolve (`codeql pack install codeql/go-all`, from-source, `resolve qlpacks`, `database analyze --search-path` at 3 locations — all fail "could not resolve module go"). The library lives at `/home/hieusats/tools/codeql-queries/go/ql/lib/` (qlpack `codeql/go-all`, source only, not compiled).
**Try in the fresh session:** `codeql pack download codeql/go-all` (from GitHub Container Registry), or point `--search-path` at `/home/hieusats/tools/codeql-queries/go/ql/lib`'s parent, or rebuild the CodeQL distribution with query packs. Once `codeql resolve qlpacks | grep codeql/go-all` succeeds → author the Go CodeQL query for each class (skeleton in Plan Task 9; iterate via `codeql test run`). CodeQL is Go-only (no Solidity extractor); Rust best-effort.

### 2. Tier 2/3 classes (6 classes — Semgrep, same TDD idiom as Tier 1)
Per `taxonomy/exploit-classes.json`. Each: `skills/semgrep/rules/<class>/<lang>-<rule>.{yaml,<ext>}`, TDD (ruleid=incident-rooted vuln, ok=fixed), `semgrep --test` green, metadata (class/references/cwe).
- **infinite-mint-unguarded** (refs: gala, cashio, aBNBc) — Sol + Go.
- **donation-share-inflation** (refs: euler, cream, empty-4626) — Sol.
- **overflow-rounding-invariant** (refs: cetus, uranium, alpha, balancer) — Sol + Rust + Go.
- **proxy-upgrade-reinit** (refs: munchables, meerkat, humanity) — Sol.
- **governance-flashloan-vote** (refs: beanstalk, makerdao-chief) — Sol.
- **logic-invariant-break** (refs: monox, self-transfer-balance, comp-scaling) — Sol + Go.

### 3. Cleanup / polish
- **Ronin taxonomy nit:** drop `quorum` from the bridge-sig-bypass regex in `taxonomy/map_tags.py` (Ronin was off-chain key-compromise; no legit anchor lost). Re-run map_tags.py.
- **Corpus noise checks:** clone Damn-Vulnerable-DeFi/Ethernaut (Sol) + a Solana program (Rust); run the rules, confirm sensible hits only.
- **"Replace npm piolium" (destructive — ask user):** `pi remove npm:@vigolium/piolium && pi install /home/hieusats/dev/piolium`. Then run a real piolium scan and confirm the curated rules auto-appear in `$OUTPUT_DIR/raw/*.json` (full R-4 end-to-end, currently only structurally validated).
- **Upstream PR:** open `vigolium/piolium` ← `hieusats/piolium:rekt-rules` once CodeQL + Tier 2/3 land (or now for the Tier-1 contribution).

## Gotchas / rulings (carry forward)
- **Solidity/Rust Semgrep is stricter than Go:** Rust needs `-> $RET` return metavar + trailing `;` on statements; Solidity `if (x) return y;` works. Iterate patterns; `semgrep --test` is the gate.
- **Tests = incident-rooted, not source-extracted:** `classified.json` has text root_cause, not code — synthesize the vuln shape from the description + real public source where available.
- **Pre-patch vs HEAD:** recall targets use `git show db22d511d:<path>` (pre-patch); patched HEAD is the 0-hit precision target. Do NOT expect rules to fire on HEAD.
- **`gh repo fork <repo> --remote` is invalid** (use `--clone` only; add upstream remote manually).
- **pi git refs = tags/commits only** (no branches): dev install via local path `pi install /home/hieusats/dev/piolium`; distribution via `git:...@<tag>`.

## Resume commands
```bash
cd /home/hieusats/dev/piolium && git status && git log --oneline -5
cat docs/superpowers/plans/2026-08-13-piolium-rekt-ledger-update.md   # the plan
# verify Tier 1 still green:
semgrep --metrics=off --validate --config skills/semgrep/rules && echo "pack VALID"
for y in $(find skills/semgrep/rules -name '*.yaml'); do semgrep --test --metrics=off --config "$y" "${y%.yaml}".{go,rs,sol} 2>/dev/null | grep -q 'All tests passed' && echo "OK $y"; done
# then start NEXT item 1 (CodeQL env) or item 2 (Tier 2/3 class)
```
