# Piolium Exploit-Class Rule Library — Plan 1: Foundation + bridge-sig-bypass

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the forked-piolium rule library (taxonomy + Semgrep pack + CodeQL pack + auto-load wiring), empirically confirm rules auto-load + fire on the **pre-patch** target, and deliver the first exploit class (bridge-sig-bypass) across Go/Rust/Solidity.

**Architecture:** Fork `vigolium/piolium` to a git package that replaces the npm install; add `taxonomy/`, `skills/semgrep/rules/`, `skills/codeql/queries/`; wire both engines' scan skills to auto-include the bundled rules. This plan proves the pipeline end-to-end on bridge-sig-bypass (highest-value class; 2 existing Go seed rules to migrate). Remaining Tier-1 classes are Plans 2–6.

**Tech Stack:** Semgrep 1.172+ (Go/Solidity/Rust), CodeQL 2.26+ (Go; Rust best-effort), pi package system (`pi install git:...`).

## Global Constraints (from spec, verbatim)

- CodeQL has **no Solidity extractor** → Solidity is Semgrep-only.
- CodeQL Rust: extractor + `lib/`+`src/` exist, **no security query suite** → Rust CodeQL best-effort, Semgrep-primary.
- rekt `classified.json` = **text root-cause descriptions**, not source → tests synthesized from root-cause text + real public source where available.
- The fork **replaces** the npm piolium (single source of truth; skill-name collision otherwise).
- Every Semgrep rule: one rule/file + test, `semgrep --test` 100%, `// ruleid:` = incident-rooted vuln shape, `// ok:` = fixed shape, no `generic`.

## Verified Prerequisites (checked this session — do not re-verify)

- `gh` is installed and authenticated as **`hieusats`** (ssh protocol). → `<USER>` = `hieusats` everywhere below.
- `vigolium/piolium` is **PUBLIC** and forkable (`git@github.com:vigolium/piolium.git`).
- The 4 validated one-rule-per-file seed rules live at
  `/home/hieusats/.pi/agent/npm/node_modules/@vigolium/piolium/skills/semgrep/rules/piolium-go-*`
  (NOT in `harmoney/piolium/semgrep-rules/` — that holds the older harmony-specific multi-rule files). Migrate from the npm copy.
- Harmony HEAD is **patched** for the bridge-sig-bypass quorum bug: the seed rule returns **0 hits** on `consensus/quorum/` at HEAD. So empirical recall MUST target the **pre-patch** code (`db22d511d:consensus/quorum/verifier.go`), never HEAD. HEAD is the precision (0-hit) target.

---

## File Structure (Plan 1 scope)

**In the fork** (`github.com/hieusats/piolium`, branch `rekt-rules`):

- Create: `taxonomy/rekt-tags.json` — vendored copy of the 293 `mechanism_tag`s (self-contained, portable).
- Create: `taxonomy/map_tags.py`, `taxonomy/exploit-classes.json`, `taxonomy/exploit-classes.md`.
- Modify: `skills/semgrep/references/rulesets.md`, `skills/semgrep/workflows/scan-workflow.md`.
- Modify: `skills/codeql/workflows/run-analysis.md`, `skills/codeql/references/run-all-suite.md`.
- Create: `skills/semgrep/rules/bridge-sig-bypass/go-quorum-counts-roster-size-not-signers.{yaml,go}` (migrated seed).
- Create: `skills/semgrep/rules/bridge-sig-bypass/go-verify-accepts-empty-signature.{yaml,go}` (migrated seed).
- Create: `skills/semgrep/rules/bridge-sig-bypass/rust-verify-accepts-empty-signature.{yaml,rs}`.
- Create: `skills/semgrep/rules/bridge-sig-bypass/solidity-verify-accepts-empty-signature.{yaml,sol}`.
- Create: `skills/codeql/queries/go/qlpack.yml`, `skills/codeql/queries/go/bridge-sig-bypass/QuorumCountsRosterSize.ql` + `…/test/`.

---

## Task 1: Fork piolium + scaffold

**Files:** Fork repo root; `taxonomy/`, `skills/semgrep/rules/`, `skills/codeql/queries/go/`.

- [ ] **Step 1: Fork + clone onto a branch**

```bash
cd /home/hieusats/dev   # fresh writable dir OUTSIDE the read-only harmoney audit clone
gh repo fork vigolium/piolium --clone   # NOTE: --remote is unsupported with an explicit repo arg (Ruling 4); upstream remote added separately below
git remote add upstream https://github.com/vigolium/piolium.git
cd piolium
git checkout -b rekt-rules
```

- [ ] **Step 2: Scaffold component dirs**

```bash
mkdir -p taxonomy skills/semgrep/rules skills/codeql/queries/go/bridge-sig-bypass/test
```

- [ ] **Step 3: Verify upstream skills intact**

```bash
test -f skills/semgrep/SKILL.md && test -f skills/codeql/SKILL.md && echo OK
```

- [ ] **Step 4: Commit + push**

```bash
git add -A && git commit -m "scaffold: taxonomy + curated rule pack dirs"
git push -u origin rekt-rules
```

## Task 2: Taxonomy — systematic 293-tag → 12-class mapping (spec task 1)

**Files:** `taxonomy/rekt-tags.json`, `taxonomy/map_tags.py`, `taxonomy/exploit-classes.json`, `taxonomy/exploit-classes.md`.

- [ ] **Step 1: Vendor the tags (portable — no external dependency)**

```bash
jq '[.[] | {mechanism_tag, slug, loss_type, relevant_for_auditor}]' \
  /home/hieusats/dev/btc/solidity-auditor/pi-package/skills/solidity-auditor/_rekt_work/classified.json \
  > taxonomy/rekt-tags.json
```

- [ ] **Step 2: Write the mapper** (reads the VENDORED file by default)

```python
# taxonomy/map_tags.py
import json, re, pathlib
SRC = pathlib.Path(__file__).with_name("rekt-tags.json")  # portable
data = json.load(open(SRC))
RULES = [
  ("bridge-sig-bypass", r"(zero.?hash|sigset|signature.?spoof|forged.*(proof|merkle|sig)|quorum|verifier.*accept|mmr.*bound|ibc.*forged|crosschain.*manager)"),
  ("replay-missing-idempotency", r"(replay|duplicate.?call|double.*(withdraw|claim|spend)|no.?epoch.?replay|emergencyBurn)"),
  ("verify-gated-by-position", r"(batch.?position|%.*==.*0.*verify)"),
  ("oracle-spot-no-twap", r"(spot.*oracle|flashloan.*oracle|no.?twap|instant.?consume|stale.*oracle|decimals.*mismatch|spot.*amm)"),
  ("reentrancy-readonly-and-callback", r"(reentrancy|read.?only|callback.*reentrant)"),
  ("access-control-unprotected", r"(unprotected|missing.*msg.?sender|unvalidated.*(input|router|calldata)|permissionless|forged.*approval|initialize.*missing)"),
  ("infinite-mint-unguarded", r"(infinite.?mint|dormant.?minter|deployer.*mint|missing.*burn|mint.*unlimited|no.?debt.*recorded)"),
  ("donation-share-inflation", r"(donat|exchangeRate.*round|pricePerShare|share.*inflat|totalSupply.*0)"),
  ("overflow-rounding-invariant", r"(overflow|underflow|checked_shlw|rounding|fee.?divisor|k.?invariant|double.?decimal|debt.?share)"),
  ("proxy-upgrade-reinit", r"(reinit|proxy.*upgrade|upgradeTo|slot.*collision|initialize.*flag|version.*bump)"),
  ("governance-flashloan-vote", r"(flashloan.*governance|flashloan.*vote|no.?timelock|low.?vote.?lock)"),
  ("logic-invariant-break", r"(tokenIn.*tokenOut|self.?transfer.*balance|fee.?on.?transfer.*skew|comp.*scal|single.?token.?pool)"),
]
LANGS = {
  "bridge-sig-bypass": "Go(S+C),Rust(S+C-b.e.),Sol(S)",
  "replay-missing-idempotency": "Go(S+C),Sol(S)",
  "verify-gated-by-position": "Go(S+C)",
  "oracle-spot-no-twap": "Sol(S),Rust(S)",
  "reentrancy-readonly-and-callback": "Sol(S)",
  "access-control-unprotected": "Sol(S),Rust(S),Go(S+C)",
  "infinite-mint-unguarded": "Sol(S),Go(S+C)",
  "donation-share-inflation": "Sol(S)",
  "overflow-rounding-invariant": "Sol(S),Rust(S),Go(S+C)",
  "proxy-upgrade-reinit": "Sol(S)",
  "governance-flashloan-vote": "Sol(S)",
  "logic-invariant-break": "Sol(S),Go(S+C)",
}
out = {c: {"name": c, "languages": LANGS[c], "anchors": []} for c, _ in RULES}
residual = []
for r in data:
    tag, slug = r.get("mechanism_tag", ""), r.get("slug", "")
    cls = next((c for c, rx in RULES if re.search(rx, tag, re.I)), None)
    (out[cls]["anchors"].append(slug) if cls else residual.append(tag))
json.dump({"classes": list(out.values()), "residual_mechanism_tags": sorted(set(residual))},
          open(pathlib.Path(__file__).with_name("exploit-classes.json"), "w"), indent=2)
print(f"mapped={sum(len(c['anchors']) for c in out.values())} residual={len(set(residual))}")
```

- [ ] **Step 3: Run + sanity-check**

```bash
python3 taxonomy/map_tags.py
# Expect residual small (off-chain tags like cex-hot-wallet-* belong here). Refine regex if residual > ~40.
jq '.residual_mechanism_tags|length' taxonomy/exploit-classes.json
```

- [ ] **Step 4: Write `taxonomy/exploit-classes.md`** — one section per class (detection signature + anchors from JSON). **Hybrid sourcing:** most classes are rekt-grounded (anchors from `rekt-tags.json`); a few are audit-found with no rekt anchor (e.g. `verify-gated-by-position` from Harmony H1). Add a `source: rekt|audit` field per class in `exploit-classes.json`.
- [ ] **Step 5: Commit**

```bash
git add taxonomy && git commit -m "taxonomy: vendor 293 rekt tags + map to 12 detectable classes"
```

## Task 3: Semgrep wiring — concrete path resolution + auto-include

**Files:** Modify `skills/semgrep/references/rulesets.md`, `skills/semgrep/workflows/scan-workflow.md`.

> **Resolution mechanism (concrete):** the executing skill knows its own file path (`<PKG>/skills/semgrep/workflows/scan-workflow.md`). Derive `<PKG>` by applying `dirname()` three times to that workflow file's own path (`…/skills/semgrep/workflows/scan-workflow.md` → `workflows` → `semgrep` → `skills` → `<PKG>`). The curated rules dir = `<PKG>/skills/semgrep/rules` (absolute). Emit it into the ruleset JSON; the scanner reads it in-place as a local `--config` (no clone, no delete).

- [ ] **Step 1: Catalog row** in `rulesets.md` — add a "Piolium Curated Exploit-Class Rules" subsection marked **always included**, resolving to the bundled `skills/semgrep/rules` dir.
- [ ] **Step 2: Emit into baseline** in `scan-workflow.md` Step 2 — add: *"Curated exploit-class rules (always included): derive `<PKG>` from this skill file's location (3 dirs up); add the absolute path `<PKG>/skills/semgrep/rules` to the ruleset JSON under key `curated`. The scanner runs it as a local `--config` (no clone, no delete)."*
- [ ] **Step 3: Commit**

```bash
git add skills/semgrep && git commit -m "semgrep: auto-include curated rules via derived package path"
```

## Task 4: CodeQL wiring — search-path + suite entry

**Files:** Modify `skills/codeql/workflows/run-analysis.md`, `skills/codeql/references/run-all-suite.md`.

> Same derivation as Task 3: `<PKG>` = `dirname()` three times from `<PKG>/skills/codeql/workflows/run-analysis.md` (`workflows` → `codeql` → `skills` → `<PKG>`).

- [ ] **Step 1: Add `--search-path`** to the `codeql database analyze` command in `run-analysis.md` Step 4: insert `--search-path=<PKG>/skills/codeql/queries`. NOTE: the suite's `from: codeql/go-queries` also needs the standard CodeQL Go pack resolvable; if `codeql resolve qlpacks` does not list `codeql/go-queries`, run `codeql pack install codeql/go-queries` once first.
- [ ] **Step 2: Add the curated qlpack to the suite** in `run-all-suite.md` generation script, after the third-party loop: `- queries: .\n  from: piolium/go-exploit-queries`.
- [ ] **Step 3: Commit**

```bash
git add skills/codeql && git commit -m "codeql: --search-path + curated go qlpack in run-all suite"
```

## Task 5: Migrate the 2 Go seed rules (bridge-sig-bypass) — from the npm copy

**Files:** `skills/semgrep/rules/bridge-sig-bypass/go-quorum-counts-roster-size-not-signers.{yaml,go}`, `…/go-verify-accepts-empty-signature.{yaml,go}`.

> Do this BEFORE Task 6's `pi remove npm:piolium` — the seeds currently live only in the npm copy.

- [ ] **Step 1: Copy the two validated seed pairs from the npm copy**

```bash
NPM=/home/hieusats/.pi/agent/npm/node_modules/@vigolium/piolium/skills/semgrep/rules
mkdir -p skills/semgrep/rules/bridge-sig-bypass
cp $NPM/piolium-go-quorum-counts-roster-size-not-signers/* skills/semgrep/rules/bridge-sig-bypass/
cp $NPM/piolium-go-verify-accepts-empty-signature/*        skills/semgrep/rules/bridge-sig-bypass/
```

- [ ] **Step 2: Run the tests (must still pass after move)**

```bash
cd skills/semgrep/rules/bridge-sig-bypass
semgrep --test --metrics=off --config go-quorum-counts-roster-size-not-signers.yaml go-quorum-counts-roster-size-not-signers.go
semgrep --test --metrics=off --config go-verify-accepts-empty-signature.yaml go-verify-accepts-empty-signature.go
```

Expected: both `✓ All tests passed`.

- [ ] **Step 3: Commit + push**

```bash
git add skills/semgrep/rules/bridge-sig-bypass && git commit -m "bridge-sig-bypass: migrate go quorum-roster + empty-sig seed rules"
git push
```

## Task 6: Empirical validation — install fork + prove auto-load + recall + precision (R-4)

**Files:** None (produces evidence in `docs/rekt-ledger-update.md`).

> This is the R-4 gate. Three independent checks: (a) auto-load (curated rule appears in a skill scan's raw output with NO manual `--config`), (b) recall (rule fires on PRE-PATCH code), (c) precision (0 hits on HEAD).

- [ ] **Step 1: Install the fork as the sole piolium**

```bash
pi remove npm:@vigolium/piolium
# pi git refs must be TAGS or COMMITS (branches unsupported). For dev, install from the local clone path:
pi install /home/hieusats/dev/piolium
pi list | grep piolium   # expect the local fork, not npm
# Distribution: git tag v0.0.1-rekt && git push --tags, then `pi install git:github.com/hieusats/piolium@v0.0.1-rekt`.
```

- [ ] **Step 2: Prepare the pre-patch recall target (NOT HEAD)**

```bash
mkdir -p /tmp/pp-bridge && cd /home/hieusats/dev/btc/harmoney
git show db22d511d:consensus/quorum/verifier.go > /tmp/pp-bridge/verifier.go
```

- [ ] **Step 3: Recall — rule fires on pre-patch**

```bash
PKG=$(python3 -c "import glob,os;print(os.path.dirname(glob.glob('/home/hieusats/.pi/agent/git/**/piolium',recursive=True)[0]))" 2>/dev/null || echo /home/hieusats/.pi/agent/git/github.com/hieusats/piolium)
semgrep --metrics=off --config $PKG/skills/semgrep/rules/piolium-go-quorum-counts-roster-size-not-signers/piolium-go-quorum-counts-roster-size-not-signers.yaml --json /tmp/pp-bridge/verifier.go | jq '.results|length'
```

Expected: **≥1** (catches the pre-patch quorum bug).

- [ ] **Step 4: Precision — 0 hits on patched HEAD**

```bash
semgrep --metrics=off --config $PKG/skills/semgrep/rules/piolium-go-quorum-counts-roster-size-not-signers/piolium-go-quorum-counts-roster-size-not-signers.yaml --json /home/hieusats/dev/btc/harmoney/consensus/quorum/ | jq '.results|length'
```

Expected: **0** (HEAD is fixed).

- [ ] **Step 5: Auto-load — two concrete checks**

```bash
# (a) the wiring edit is present in the INSTALLED fork:
WFILE=$(grep -rl 'Curated exploit-class rules' ~/.pi/agent/git ~/.pi/agent/npm 2>/dev/null | grep workflows/scan-workflow.md | head -1)
PKG=$(python3 -c "import os,sys;print(os.path.dirname(os.path.dirname(os.path.dirname(sys.argv[1]))))" "$WFILE")
grep -q 'skills/semgrep/rules' "$PKG/skills/semgrep/workflows/scan-workflow.md" && echo "WIRING PRESENT" || echo "WIRING MISSING"
# (b) the curated path the skill would emit resolves + scans directly:
semgrep --metrics=off --config "$PKG/skills/semgrep/rules" --json /tmp/pp-bridge/verifier.go | jq '.results|length'
```

Full end-to-end skill auto-load (the skill emitting the curated path into its ruleset JSON during a real scan) is a **manual confirmation**: the user runs a piolium semgrep scan and checks the curated rule id appears in `$OUTPUT_DIR/raw/*.json` with no manual `--config`. If (a)/(b) pass but the manual scan doesn't auto-include, fall back to documenting a per-audit `--config $PKG/skills/semgrep/rules` invocation; do NOT abandon.

- [ ] **Step 6: Record result** in `docs/rekt-ledger-update.md` (recall N, precision 0, auto-load PASS/fallback).
- [ ] **Step 7: Commit**

```bash
git add docs && git commit -m "validate: bridge-sig-bypass recall/precision/auto-load (R-4)"
```

## Task 7: bridge-sig-bypass — Rust Semgrep rule

**Files:** `skills/semgrep/rules/bridge-sig-bypass/rust-verify-accepts-empty-signature.{yaml,rs}`.

- [ ] **Step 1: Write the test**

```rust
// rust-verify-accepts-empty-signature.rs
fn verify_signature(sig: &[u8], msg: &[u8]) -> bool {
    // ruleid: rust-verify-accepts-empty-signature
    if sig.is_empty() { return true; }
    bls_verify(sig, msg)
}
fn verify_signature_safe(sig: &[u8], msg: &[u8]) -> bool {
    // ok: rust-verify-accepts-empty-signature
    if sig.is_empty() { return false; }
    bls_verify(sig, msg)
}
fn bls_verify(_s:&[u8],_m:&[u8])->bool { true }
```

- [ ] **Step 2: Write the rule (distinct return shapes, no duplicates)**

```yaml
rules:
  - id: rust-verify-accepts-empty-signature
    languages: [rust]
    severity: ERROR
    metadata:
      category: security
      confidence: HIGH
      impact: HIGH
      cwe: "CWE-347: Improper Verification of Cryptographic Signature"
      technology: [rust, blockchain, crypto]
      references: [nomad-rekt, wormhole-rekt]
      class: bridge-sig-bypass
    message: >-
      Signature verification returns success on an empty signature; empty must
      be a hard rejection. Precedent: Nomad (zero-hash initializer), Wormhole.
    patterns:
      - pattern-inside: |
          fn $F(...) $R {
            ...
          }
      - metavariable-regex: {metavariable: $F, regex: "(?i).*(verify|check|valid).*(sig|sign|seal)|.*verify.*"}
      - pattern-either:
          - pattern: if $SIG.is_empty() { return true }
          - pattern: if $SIG.is_empty() { return Ok(()) }
          - pattern: if $SIG.is_empty() { return Ok(true) }
          - pattern: if $SIG.len() == 0 { return true }
```

- [ ] **Step 3: Run test + iterate Rust pattern syntax until `✓ All tests passed`**

```bash
semgrep --test --metrics=off --config rust-verify-accepts-empty-signature.yaml rust-verify-accepts-empty-signature.rs
```

- [ ] **Step 4: Noise check** — scan a known Solana/Rust program sample (e.g. clone a small audited program); confirm the rule only fires on genuinely empty-sig-accepting verify fns.
- [ ] **Step 5: Commit**

```bash
git add skills/semgrep/rules/bridge-sig-bypass/rust-* && git commit -m "bridge-sig-bypass: rust empty-signature rule"
```

## Task 8: bridge-sig-bypass — Solidity Semgrep rule

**Files:** `skills/semgrep/rules/bridge-sig-bypass/solidity-verify-accepts-empty-signature.{yaml,sol}`.

- [ ] **Step 1: Write the test**

```solidity
// solidity-verify-accepts-empty-signature.sol
contract C {
    function verify(bytes memory sig, bytes32 msgHash) public pure returns (bool) {
        // ruleid: solidity-verify-accepts-empty-signature
        if (sig.length == 0) { return true; }
        return true;
    }
    function verifySafe(bytes memory sig, bytes32 msgHash) public pure returns (bool) {
        // ok: solidity-verify-accepts-empty-signature
        if (sig.length == 0) { return false; }
        return true;
    }
}
```

- [ ] **Step 2: Write the rule (only the vuln shape — accepting empty as valid)**

```yaml
rules:
  - id: solidity-verify-accepts-empty-signature
    languages: [solidity]
    severity: ERROR
    metadata:
      category: security
      confidence: HIGH
      impact: HIGH
      cwe: "CWE-347"
      technology: [solidity, evm, bridge]
      references: [nomad-rekt]
      class: bridge-sig-bypass
    message: >-
      Signature verification returns true on an empty signature; empty must
      revert. Precedent: Nomad bridge (zero-hash initializer).
    pattern-either:
      - pattern: if ($SIG.length == 0) return true;
      - pattern: if ($SIG.length == 0) { return true; }
```

- [ ] **Step 3: Run test + iterate Solidity pattern syntax until `✓ All tests passed`**

```bash
semgrep --test --metrics=off --config solidity-verify-accepts-empty-signature.yaml solidity-verify-accepts-empty-signature.sol
```

- [ ] **Step 4: Noise check** — scan Damn-Vulnerable-DeFi / Ethernaut (clone); confirm sensible hits only.
- [ ] **Step 5: Commit**

```bash
git add skills/semgrep/rules/bridge-sig-bypass/solidity-* && git commit -m "bridge-sig-bypass: solidity empty-signature rule"
```

## Task 9: bridge-sig-bypass — Go CodeQL query (skeleton + iteration)

**Files:** `skills/codeql/queries/go/qlpack.yml`, `skills/codeql/queries/go/bridge-sig-bypass/QuorumCountsRosterSize.ql`, `…/test/`.

> The QL below is a **skeleton** — CodeQL Go API names (`DataFlow::CallNode`, comparison accessors) must be corrected against `codeql/go-all` in the query console. The task's deliverable is a **passing `codeql test run`**, not the skeleton verbatim.
>
> **R-5 (environment gate):** the qlpack depends on `codeql/go-all`, which ships as a SOURCE qlpack and must be built before this task. Run this first; if it fails, Task 9 is BLOCKED until the CodeQL env is fixed (Plan 1's Semgrep value is unaffected):
> ```bash
> codeql pack install codeql/go-all   # builds the standard Go library into the pack cache
> codeql resolve qlpacks | grep -E 'codeql/(go-all|go-queries)'   # confirm both now resolve
> ```

- [ ] **Step 1: Write qlpack.yml**

```yaml
name: piolium/go-exploit-queries
version: 0.0.1
dependencies:
  codeql/go-all: "*"
```

- [ ] **Step 2: Write the skeleton query**

```ql
/**
 * @name Quorum counts roster size, not signers
 * @description A quorum/threshold function compares len() of the full roster to a threshold instead of counting enabled signers; an empty signer set then satisfies quorum. Precedent: Poly Network, Wormhole, Nomad, Harmony CRIT-2026.
 * @kind problem
 * @id piolium/go/bridge-sig-bypass/quorum-roster-size
 * @problem.severity error
 * @metadata.security-severity 9.0
 */
import go

// SKELETON — correct predicate/API names against codeql/go-all in the query console.
from Function f, ComparisonOperation cmp
where
  f.getName().regexpMatch("(?i).*(quorum|threshold|verifysig|verifyseal|verifymask|attest).*") and
  cmp.getEnclosingFunction() = f and
  exists(DataFlow::CallNode call |
    call.getCallee().hasName("len") and
    cmp.getAnOperand() = call and
    call.getArgument(0).getStringValue().regexpMatch("(?i).*(publics|signers|signatures|pubkeys|validators|committee).*")
  )
select cmp, "Quorum compares roster len() to a threshold; count enabled signers instead."
```

- [ ] **Step 3: Write the test** — a Go file mirroring Harmony pre-patch `uniformVerifier.IsQuorumAchievedByMask` (`got := int64(len(mask.Publics)); return got > exp`) + the fixed loop, with `.expected` listing the vulnerable line only.
- [ ] **Step 4: Iterate to green**

```bash
codeql test run skills/codeql/queries/go/bridge-sig-bypass/test
# fix imports/predicates (e.g. getAnOperand vs getAComparator, getStringValue vs asString) until the test passes
```

- [ ] **Step 5: Validate on the pre-patch Harmony shape** — `codeql database analyze <db> --search-path=skills/codeql/queries -- suite-including-piolium/go-exploit-queries` on the `db22d511d` verifier.go; expect the vulnerable flagged, the HEAD fixed version not.
- [ ] **Step 6: Commit**

```bash
git add skills/codeql/queries/go && git commit -m "codeql: go bridge-sig-bypass quorum-roster-size query"
git push
```

---

## Self-Review (writing-plans)

- **Spec coverage:** Foundation (fork/taxonomy/2 wirings) = Tasks 1–4; seed migration = Task 5; R-4 empirical (recall+precision+auto-load) = Task 6; bridge-sig-bypass new rules = Tasks 7–9 (Rust S, Sol S, Go C). The 4 Go seeds → 2 migrated here (quorum, empty-sig); replay + position migrate in Plans 2–3. ✓
- **Placeholder scan:** `<USER>` resolved to `hieusats` (verified). No TBD/TODO/"similar to". CodeQL QL is explicitly a skeleton whose green `codeql test run` is the deliverable (not a hidden assumption). ✓
- **id/path consistency:** rule `id`s match across YAML/test; qlpack name `piolium/go-exploit-queries` consistent in Task 4 + Task 9. Seed file names preserved on migration. ✓
- **Dependency ordering:** Task 5 (migrate from npm copy) BEFORE Task 6 Step 1 (`pi remove npm:piolium`) — seeds are not lost. ✓ Task 6 recall targets PRE-PATCH (db22d511d), precision targets HEAD — matches the verified 0-on-HEAD fact. ✓

## Subsequent Plans (follow-on, same pattern)

- **Plan 2 — replay-missing-idempotency:** Go(S migrate seed + C) + Sol(S). Anchors: mirror, harmony-CRIT-receipt.
- **Plan 3 — verify-gated-by-position:** Go(S migrate seed + C). Anchor: harmony-H1.
- **Plan 4 — oracle-spot-no-twap:** Sol(S) + Rust(S). Anchors: mango, bonq, pancakebunny.
- **Plan 5 — reentrancy-readonly-and-callback:** Sol(S). Anchors: fei-rari, gmx, curve-vyper.
- **Plan 6 — access-control-unprotected:** Sol(S) + Rust(S) + Go(S+C). Anchors: hedgey, qubit-null-addr.

(Tier 2/3 classes follow after Tier 1.)

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-13-piolium-rekt-ledger-update.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.
2. **Inline Execution** — execute in this session via executing-plans, batch with checkpoints.

**Which approach?**
