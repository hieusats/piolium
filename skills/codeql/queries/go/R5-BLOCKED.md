# CodeQL Go query (bridge-sig-bypass) — DEFERRED on R-5 environment blocker

**Status:** BLOCKED at the environment level (R-5). The Semgrep deliverables of
Plan 1 are complete; this CodeQL query is the only deferred item.

## The blocker

`codeql/go-all` (the CodeQL Go query library that `import go` resolves from)
**does not resolve in this environment**. A custom qlpack depending on it
therefore cannot be compiled or tested here.

## Evidence — 5 resolution attempts, all failed

1. `codeql pack install codeql/go-all` → `ERROR: The path does not exist.
   (…/piolium/codeql/go-all:1,1-1)` — treats `codeql/go-all` as a local path;
   no registry to fetch from.
2. `codeql pack install` run from the source dir
   (`/home/hieusats/tools/codeql-queries/go/ql/lib`) → "Dependencies resolved …
   Nothing to install / Nothing downloaded." — source qlpack not built into the
   pack cache.
3. `codeql resolve qlpacks` → lists `codeql-go-consistency-queries`,
   `codeql/go-tests`, `codeql/go-examples` but NOT `codeql/go-all` or
   `codeql/go-queries`.
4. `codeql database analyze … --search-path=/home/hieusats/tools/codeql-queries`
   on a trivial `import go` query → `ERROR: could not resolve module go`.
5. Same with `--search-path` at `…/go/ql/lib` and `…/go/ql` → same
   `could not resolve module go` error.

The source qlpacks exist under `/home/hieusats/tools/codeql-queries/go/ql/`, but
this CodeQL CLI (2.26.2) cannot compile/resolve them for custom query authoring.
(The Harmony audit's `go-security-and-quality` suite run used pre-built suites,
not a custom qlpack — a different resolution path.)

## What's needed to resume (out of scope here)

A CodeQL environment where `codeql pack install codeql/go-all` succeeds and
`import go` resolves (e.g., a CLI with GitHub Container Registry access, or the
packs pre-built into the cache). Then execute Plan 1 Task 9:

1. `skills/codeql/queries/go/qlpack.yml` — `name: piolium/go-exploit-queries`,
   `dependencies: codeql/go-all: "*"`.
2. `skills/codeql/queries/go/bridge-sig-bypass/QuorumCountsRosterSize.ql` — the
   skeleton in the plan's Task 9; correct the Go API names (comparison operands,
   call/data-flow node predicates) against `codeql/go-all`, iterating via
   `codeql test run` until green (vulnerable flagged, fixed not).
3. Test dir with a Go file mirroring Harmony pre-patch
   `uniformVerifier.IsQuorumAchievedByMask`
   (`got := int64(len(mask.Publics)); return got > exp`) + the fixed loop, and a
   `.expected` listing the vulnerable line only.
4. Validate against the pre-patch shape
   (`git show db22d511d:consensus/quorum/verifier.go`).

## Wiring note (already in place)

The CodeQL scan-skill wiring (Task 4) — `--search-path` on the analyze command +
`from: piolium/go-exploit-queries` in the run-all suite — is present and correct;
it will activate automatically once this qlpack exists and `codeql/go-all`
resolves. No wiring change needed to resume.
