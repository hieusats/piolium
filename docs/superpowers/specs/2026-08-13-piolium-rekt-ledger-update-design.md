# Piolium Exploit-Class Rule Library (rekt-ledger-grounded) — Design Spec

**Date:** 2026-08-13
**Status:** Revised (stress-test pass 1 — engine/language feasibility verified against the installed toolchain)
**Author:** audit session (harmoney)
**Target package:** fork of `github.com/vigolium/piolium` (v0.0.13)

## Goal

Add a curated, rekt-ledger-grounded exploit-class detection library to piolium
(Semgrep rules + CodeQL queries) so that every future piolium audit — on any
Solidity / Go / Rust repo — automatically detects the recurring exploit classes
behind real on-chain incidents, not just generic registry rules.

## Verified Constraints (checked against the installed toolchain — the source of truth)

These were empirically confirmed; they override any earlier assumption.

| Constraint | Evidence | Consequence |
| --- | --- | --- |
| **CodeQL has NO Solidity extractor** | `codeql resolve languages` → ruby/js/actions/csharp/properties/html/**go**/java/swift/yaml/python/xml/cpp/csv/**rust**. No solidity. | **CodeQL queries are Go + Rust only. Solidity = Semgrep-only (+ Decurity 3rd-party).** |
| **CodeQL Rust extractor exists; query lib is thin** | `/home/hieusats/tools/codeql/rust`; `codeql resolve qlpacks` lists no `rust-queries` security suite (only go). | Rust CodeQL is **best-effort / experimental** — Rust rules are **Semgrep-primary**. |
| **Semgrep supports Rust** | probe `fn $F(...) -> $R` on `.rs` → 1 match (semgrep 1.172.0). | Rust Semgrep rules are feasible. |
| **Semgrep supports Solidity** | registry has `p/` + Decurity rules; solidity is a Semgrep language. | Solidity Semgrep rules are feasible. |
| **rekt `classified.json` carries text root-cause descriptions, NOT source** | `_rekt_work/classified.json` fields: `root_cause` (prose), `mechanism_tag`, `loss_type`, `attacker_model`. | "Real-incident-grounded" = **a vulnerable shape synthesized from the root-cause description, anchored to real source ONLY where it is publicly available** (Etherscan-verified Solidity, open-source Go/Rust bridges). Not "extracted from incident source." |
| **piolium semgrep scanner accepts a local path as `--config`** | `scanner-task-prompt.md`: `[RULESET]` = "Semgrep ruleset identifier or local clone path"; local paths are read in-place (not cloned/deleted). | A bundled rules dir can be auto-included via a `rulesets.md` baseline entry resolved to the package path. |
| **piolium codeql suite resolves packs via `from:`; `--search-path` not currently passed** | `run-all-suite.md` iterates `INSTALLED_THIRD_PARTY_PACKS` (`from: ${PACK}`); `run-analysis.md` analyze command has no `--search-path`. | Bundled CodeQL qlpacks need either `codeql pack install` (then add to INSTALLED list) OR a `run-analysis.md` edit adding `--search-path=<pkg>/skills/codeql/queries`. |
| **piolium declares skills via `"pi":{"skills":["./skills"]}`; skills load by directory** | `@vigolium/piolium/package.json`. | A git fork installed via `pi install git:...` **replaces** the npm piolium (same skill names → collision if both present). Fork must be the sole piolium. |

### Engine × Language feasibility matrix (drives the rule count)

| Language | Semgrep | CodeQL | Rule coverage this library |
| --- | --- | --- | --- |
| **Solidity** | ✅ | ❌ | Semgrep only |
| **Go** | ✅ | ✅ | Semgrep + CodeQL |
| **Rust** | ✅ | ✅ (thin) | Semgrep primary; CodeQL best-effort |

## Locked Requirements (from brainstorming, reconciled with constraints)

1. **Scope = statically-detectable classes only.** ~81 off-chain incidents (CEX key, insider/rug, social-engineering) excluded.
2. **Languages = Solidity + Go + Rust**, per the engine matrix above (CodeQL drops to Go + best-effort Rust; Solidity is Semgrep-only).
3. **Distribution = fork piolium as a git package** that **replaces** the npm install (single source of truth; track + rebase upstream). `pi install git:github.com/<user>/piolium`.
4. **Validation = incident-rooted** (not "incident-source-extracted"): ruleid = a vulnerable shape synthesized from the incident's `root_cause` text, anchored to real public source where it exists; ok = the fixed/known-safe shape.

## Architecture

Three components in the fork + two wiring edits.

### Components

| Component | Path in fork | Responsibility |
| --- | --- | --- |
| **Taxonomy** | `taxonomy/exploit-classes.json` + `.md` | Collapses 293 `mechanism_tag`s → 12 detectable classes (first-cut, each `mechanism_tag` mapped to a class or marked one-off-anchor). Each class: id, name, detection-signature, rekt anchors, applicable languages (per matrix), engine notes. |
| **Semgrep pack** | `skills/semgrep/rules/<class>/<lang>-<class>.{yaml,<ext>}` | One rule per YAML + one test file (`semgrep-rule-creator` convention; no `generic`; 100% `semgrep --test`). Solidity/Go/Rust. |
| **CodeQL pack** | `skills/codeql/queries/<lang>/` (+ `qlpack.yml`) | **Go only (Tier 1); Rust best-effort (Tier 2). No Solidity.** One `.ql` path-problem per class; `codeql test run` validated. |

### Wiring edits (core skill changes inside the fork)

1. **Semgrep** — `skills/semgrep/references/rulesets.md` + `workflows/scan-workflow.md`: add a "Piolium Curated Exploit-Class Rules" entry to the **always-include baseline**, value = `{baseDir}/rules` (resolved by the skill at scan time to the package's absolute path). Flows into the approved-rulesets JSON → scanner runs it in-place as a local `--config` (no clone, no delete).
2. **CodeQL** — `skills/codeql/workflows/run-analysis.md` Step 4: add `--search-path=<pkg>/skills/codeql/queries` to the `codeql database analyze` command, and append the bundled qlpack(s) to `INSTALLED_THIRD_PARTY_PACKS` in `run-all-suite.md` generation (or `codeql pack install` them during fork build). Go qlpack first.

Result: any piolium scan auto-loads both engines' curated rules; no per-audit manual step.

## Taxonomy — 12 detectable classes (first-cut; every mechanism_tag mapped)

| Class | loss_type | Rekt anchors | Langs (per matrix) |
| --- | --- | --- | --- |
| bridge-sig-bypass (verifier accepts zero/identity/forged sig or forged proof) | bridge_sig + logic | nomad, wormhole, bnb-bridge, polynetwork, harmony-CRIT, IBC-forged-deposit, mmr-missing-bounds | Go(S+C), Rust(S+C), Sol(S) |
| replay-missing-idempotency | logic + infinite_mint | mirror, harmony-CRIT-receipt, referral-no-epoch-replay, emergencyBurn-double | Go(S+C), Sol(S) |
| verify-gated-by-position | bridge_sig | harmony-H1 | Go(S+C) |
| oracle-spot-no-twap | oracle (44) | mango, bonq, pancakebunny, cream, woo, veefinance | Sol(S), Rust(S) |
| reentrancy-readonly-and-callback | reentrancy (21) | fei-rari, gmx, curve-vyper, readonly-curve | Sol(S) |
| access-control-unprotected | access_control (25) | hedgey, qubit-null-addr, unprotected-initialize, selfSwap-not-allowlisted | Sol(S), Rust(S), Go(S+C) |
| infinite-mint-unguarded | infinite_mint (11) | gala, cashio, aBNBc-deployer, alETH-no-debt, BONDLY | Sol(S), Go(S+C) |
| donation-share-inflation | price-per-share (7) | euler, cream, empty-4626, donate-WBTC | Sol(S) |
| overflow-rounding-invariant | overflow(3)+logic | cetus, uranium, alpha, balancer, getPurchasePrice-overflow | Sol(S), Rust(S), Go(S+C) |
| proxy-upgrade-reinit | upgrade (13) | munchables, meerkat, humanity, slot-collision, OP-Stack-reinit | Sol(S) |
| governance-flashloan-vote | governance (3) | beanstalk, makerdao-chief | Sol(S) |
| logic-invariant-break | logic | monox, self-transfer-balance, fee-on-transfer-skews, comp-scaling | Sol(S), Go(S+C) |

(S = Semgrep, C = CodeQL.) The 4 existing Go seed rules map to: bridge-sig-bypass (quorum-roster + empty-sig), replay-missing-idempotency (replay-key), verify-gated-by-position (batch-position).

## Rule Conventions

### Semgrep (per `semgrep-rule-creator`)

- One rule per YAML + one test file; concrete language (no `generic`); 100% `semgrep --test`.
- `// ruleid:` = vulnerable shape **rooted in the incident root-cause text** (+ real source where public); `// ok:` = fixed/known-safe shape; exactly one finding per ruleid, zero per ok; no `todook`/`todoruleid`.
- `metadata`: category=security, confidence, impact, cwe, technology, references (rekt slug(s)), class id.
- Each class×language rule is **authored independently** — patterns are language-specific (Go `len(mask.Publics)` ≠ Solidity array checks); `semgrep-rule-variant-creator` may assist but is not a mechanical port.
- Data-flow-heavy classes (oracle, access-control) under Semgrep-OSS are **intra-file only**; stronger under Semgrep Pro or (for Go) CodeQL. Solidity data-flow has no CodeQL fallback → relies on Semgrep Pro where available; documented as a limitation.

### CodeQL (Go primary; Rust best-effort; no Solidity)

- qlpack per language under `skills/codeql/queries/<lang>/` (`qlpack.yml` depends on `codeql/<lang>-all`).
- Each query: `path-problem` or `problem`; `@id piolium/<lang>/<class>`; test dir + `.expected`; `codeql test run` passes; validated on the Harmony Go DB.

## Validation (per rule, before merge)

1. `semgrep --test` / `codeql test run` — 100% pass.
2. Recall: fires on the incident-rooted vulnerable shape.
3. Precision: no fire on the fixed shape; ERROR-level rules noise-checked on a real repo (Harmony for Go; Damn-Vulnerable-DeFi/Ethernaut for Solidity; a Solana-program sample for Rust).
4. `metadata.references` links the rekt slug(s).

## Sequencing (MVP scoped to one plan; remainder follow-on)

Tier 1 is too large for a single bite-sized plan, so it is split per the writing-plans decomposition guidance:

- **Tier 1 MVP** (6 classes): bridge-sig-bypass, replay-missing-idempotency, verify-gated-by-position, oracle-spot-no-twap, reentrancy-readonly-callback, access-control-unprotected. Per the engine×language matrix this is **18 rule-units = 14 new + 4 reused Go seeds** (bridge-sig: Go×C + Rust×S + Rust×C-b.e. + Sol×S; replay: Go×C + Sol×S; position: Go×C; oracle: Sol×S + Rust×S; reentrancy: Sol×S; access-control: Sol×S + Rust×S + Go×S + Go×C), +2 optional Rust-CodeQL best-effort. The 4 existing Go seed rules are migrated into the fork and reused. Implemented as **per-class task-groups within one plan doc** (shared foundation tasks [fork, taxonomy, wiring] + one task-group per class) to keep each reviewable.
- **Tier 2** (4 classes): infinite-mint-unguarded, donation-share-inflation, overflow-rounding-invariant, proxy-upgrade-reinit.
- **Tier 3** (2 classes): governance-flashloan-vote, logic-invariant-break.

## Distribution & Durability

1. Prereq: user has a GitHub account + `gh auth` (to fork + push + open PR).
2. Fork `vigolium/piolium` → `github.com/<user>/piolium`.
3. Add taxonomy + Semgrep pack + CodeQL pack + the two wiring edits.
4. `codeql pack install` the Go qlpack (so `from:` resolves) OR rely on the added `--search-path`.
5. `pi remove npm:@vigolium/piolium`; `pi install git:github.com/<user>/piolium`. **The fork is the sole piolium** (avoids skill-name collision).
6. Validate: run a piolium semgrep + codeql scan on Harmony; confirm curated rules auto-load + fire on seed bugs (PAT-006/007/008/009) with 0 FP on fixed shapes.
7. Maintenance: rebase fork on `vigolium/piolium` regularly; upstream PR for long-term home.

## Out of Scope (YAGNI)

- Off-chain classes (~81 incidents). Compiler-version bugs (vyper lock-slot). Languages beyond Solidity/Go/Rust. Solidity CodeQL (no extractor). A custom taint engine. One-off `mechanism_tag`s that do not generalize (documented as anchors only).

## Open Risks (acknowledged, monitored)

- **R-1 CodeQL-Rust thinness:** the Rust CodeQL query lib is minimal; some Rust rules may be Semgrep-only even where CodeQL would be nicer. Acceptable — Rust is Semgrep-primary by design.
- **R-2 Solidity data-flow without CodeQL:** Solidity taint (oracle/access-control) is intra-file under Semgrep-OSS; needs Semgrep Pro for inter-procedural. Documented limitation, not a blocker.
- **R-3 Fork maintenance:** rebasing on upstream piolium is recurring work; upstream PR is the exit.
- **R-4 Wiring verification:** the `rulesets.md {baseDir}/rules` baseline + `run-analysis.md --search-path` edits are verified-feasible from the skill source but must be **empirically confirmed** by a successful end-to-end auto-load scan on Harmony in the first implementation task. If the resolution fails, fall back to a documented `--config`/`--search-path` per-audit invocation.

## Success Criteria

- Fork installs via `pi install git:...` as the sole piolium; both engines auto-load the curated library on any scan (R-4 confirmed empirically).
- Tier 1: all rule-units pass their engine test suite, incident-rooted; seed bugs fire on Harmony with 0 FP on fixed shapes.
- Taxonomy JSON is machine-readable; every rule's metadata references it + rekt slug(s).
- Upstream PR opened.
