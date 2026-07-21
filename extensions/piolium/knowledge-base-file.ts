/**
 * The hand-curated, checked-in project-context file the audit treats as
 * **authoritative** (project type, trust boundaries, auth/authz primitives,
 * known false-positive sources, out-of-scope paths, spec commitments, recent
 * security context, and an optional pointer to external docs for Tier-1
 * ingestion).
 *
 * `piolium/KNOWLEDGE-BASE.md` is the current name; `piolium/INFO.md` is the
 * legacy name kept as a fallback so repos that already ship one keep working.
 * When both exist, KNOWLEDGE-BASE.md wins.
 *
 * This is the *trusted* Tier-0 context (a maintainer wrote it, so it is inlined
 * verbatim). It is distinct from the *untrusted* Tier-1 corpus ingested by
 * `knowledge-base-input.ts`, which is cited and verified against source.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

/** Current curated-context filename (repo-relative). */
export const KNOWLEDGE_BASE_FILE = "piolium/KNOWLEDGE-BASE.md";
/** Legacy filename, still honored as a fallback. */
export const LEGACY_KNOWLEDGE_BASE_FILE = "piolium/INFO.md";

/** Env var the `knowledge-base-builder` / `finding-triager` agents read. */
export const KNOWLEDGE_BASE_AVAILABLE_ENV = "PIOLIUM_KNOWLEDGE_BASE_AVAILABLE";

/**
 * Resolve the curated-context file for `cwd`, preferring the current name over
 * the legacy one. Returns the repo-relative path that exists, or `undefined`.
 */
export function resolveCuratedContextFile(cwd: string): string | undefined {
	if (existsSync(join(cwd, KNOWLEDGE_BASE_FILE))) return KNOWLEDGE_BASE_FILE;
	if (existsSync(join(cwd, LEGACY_KNOWLEDGE_BASE_FILE))) return LEGACY_KNOWLEDGE_BASE_FILE;
	return undefined;
}

/**
 * Set `PIOLIUM_KNOWLEDGE_BASE_AVAILABLE` (`"true"`/`"false"`) from the presence
 * of a curated-context file in `cwd`. Sub-agents run in-process and inherit
 * `process.env`, so this lets them branch on availability without re-statting.
 * Returns whether a file was found.
 */
export function applyKnowledgeBaseAvailableEnv(cwd: string): boolean {
	const present = resolveCuratedContextFile(cwd) !== undefined;
	process.env[KNOWLEDGE_BASE_AVAILABLE_ENV] = present ? "true" : "false";
	return present;
}
