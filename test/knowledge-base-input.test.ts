import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initAudit, mutateAuditState } from "../extensions/piolium/audit-state.ts";
import {
	type KnowledgeBaseReference,
	isGitWorktreeCleanForKnowledgeBaseReuse,
	loadStagedKnowledgeBase,
	resolveKnowledgeBaseInput,
	stageKnowledgeBaseInput,
} from "../extensions/piolium/knowledge-base-input.ts";

let tmpRoot: string;
let docs: string;

beforeEach(() => {
	tmpRoot = mkdtempSync(join(tmpdir(), "piolium-kbin-"));
	docs = join(tmpRoot, "docs");
	mkdirSync(docs, { recursive: true });
});

afterEach(() => {
	rmSync(tmpRoot, { recursive: true, force: true });
});

function resultsDir(): string {
	return join(tmpRoot, "piolium");
}

describe("resolveKnowledgeBaseInput — input validation", () => {
	it("rejects path + raw together", async () => {
		await expect(
			resolveKnowledgeBaseInput({ targetDir: tmpRoot, path: join(docs, "a.md"), raw: "x" }),
		).rejects.toThrow(/mutually exclusive/);
	});

	it("rejects empty, oversized, and NUL raw input", async () => {
		await expect(resolveKnowledgeBaseInput({ targetDir: tmpRoot, raw: "   " })).rejects.toThrow(
			/must not be empty/,
		);
		await expect(
			resolveKnowledgeBaseInput({ targetDir: tmpRoot, raw: "a".repeat(1024 * 1024 + 1) }),
		).rejects.toThrow(/exceeds/);
		await expect(resolveKnowledgeBaseInput({ targetDir: tmpRoot, raw: "ok\0bad" })).rejects.toThrow(
			/NUL byte/,
		);
	});

	it("accepts valid raw markdown", async () => {
		const resolved = await resolveKnowledgeBaseInput({ targetDir: tmpRoot, raw: "# hi\n" });
		expect(resolved?.sourceKind).toBe("raw");
		expect(resolved?.files).toHaveLength(1);
		expect(resolved?.files[0]?.logicalPath).toBe("command-line-raw.md");
	});
});

describe("resolveKnowledgeBaseInput — explicit path", () => {
	it("accepts a markdown file", async () => {
		writeFileSync(join(docs, "a.md"), "# A\ncontent\n");
		const resolved = await resolveKnowledgeBaseInput({
			targetDir: tmpRoot,
			path: join(docs, "a.md"),
		});
		expect(resolved?.sourceKind).toBe("explicit-file");
		expect(resolved?.files).toHaveLength(1);
		expect(resolved?.aggregateSha256).toMatch(/^[a-f0-9]{64}$/);
	});

	it("rejects a non-markdown file", async () => {
		writeFileSync(join(docs, "a.txt"), "nope");
		await expect(
			resolveKnowledgeBaseInput({ targetDir: tmpRoot, path: join(docs, "a.txt") }),
		).rejects.toThrow(/\.md or \.mdx/);
	});

	it("rejects a symlinked path", async () => {
		writeFileSync(join(docs, "real.md"), "# real\n");
		symlinkSync(join(docs, "real.md"), join(docs, "link.md"));
		await expect(
			resolveKnowledgeBaseInput({ targetDir: tmpRoot, path: join(docs, "link.md") }),
		).rejects.toThrow(/symbolic link/);
	});

	it("rejects a missing path", async () => {
		await expect(
			resolveKnowledgeBaseInput({ targetDir: tmpRoot, path: join(docs, "missing.md") }),
		).rejects.toThrow(/cannot read/);
	});

	it("collects a directory of markdown, sorted, and skips symlinks + non-markdown", async () => {
		writeFileSync(join(docs, "b.md"), "# B\n");
		writeFileSync(join(docs, "a.mdx"), "# A\n");
		writeFileSync(join(docs, "ignore.txt"), "skip");
		writeFileSync(join(docs, "real.md"), "# real\n");
		symlinkSync(join(docs, "real.md"), join(docs, "z-link.md"));
		const resolved = await resolveKnowledgeBaseInput({ targetDir: tmpRoot, path: docs });
		expect(resolved?.sourceKind).toBe("explicit-directory");
		expect(resolved?.files.map((f) => f.logicalPath)).toEqual([
			"docs/a.mdx",
			"docs/b.md",
			"docs/real.md",
		]);
	});

	it("rejects a directory with no markdown", async () => {
		writeFileSync(join(docs, "only.txt"), "x");
		await expect(resolveKnowledgeBaseInput({ targetDir: tmpRoot, path: docs })).rejects.toThrow(
			/no \.md or \.mdx/,
		);
	});
});

describe("resolveKnowledgeBaseInput — content guards", () => {
	it("rejects an oversized file (> per-file cap)", async () => {
		writeFileSync(join(docs, "big.md"), "a".repeat(512 * 1024 + 1));
		await expect(resolveKnowledgeBaseInput({ targetDir: tmpRoot, path: docs })).rejects.toThrow(
			/per-file cap/,
		);
	});

	it("rejects invalid UTF-8", async () => {
		writeFileSync(join(docs, "bad.md"), Buffer.from([0xff, 0xfe, 0x00]));
		await expect(
			resolveKnowledgeBaseInput({ targetDir: tmpRoot, path: join(docs, "bad.md") }),
		).rejects.toThrow(/UTF-8|NUL byte/);
	});
});

describe("stage + load round trip", () => {
	it("stages a manifest/corpus/sources tree that loads back identically", async () => {
		writeFileSync(join(docs, "a.md"), "# A\nalpha\n");
		writeFileSync(join(docs, "b.md"), "# B\nbeta\n");
		const resolved = await resolveKnowledgeBaseInput({ targetDir: tmpRoot, path: docs });
		if (!resolved) throw new Error("expected resolved input");

		const reference = await stageKnowledgeBaseInput(resultsDir(), resolved);
		expect(reference.file_count).toBe(2);
		expect(reference.manifest_path).toBe("piolium/attack-surface/knowledge-base-input/manifest.json");

		const manifestRaw = await readFile(
			join(resultsDir(), "attack-surface", "knowledge-base-input", "manifest.json"),
			"utf8",
		);
		const manifest = JSON.parse(manifestRaw);
		expect(manifest.schema_version).toBe(1);
		expect(manifest.files).toHaveLength(2);
		expect(manifest.aggregate_sha256).toBe(resolved.aggregateSha256);

		const reloaded = await loadStagedKnowledgeBase(resultsDir());
		expect(reloaded?.aggregateSha256).toBe(resolved.aggregateSha256);
		expect(reloaded?.files.map((f) => f.logicalPath)).toEqual(
			resolved.files.map((f) => f.logicalPath),
		);
	});

	it("rejects a staged source whose bytes were tampered after staging", async () => {
		const resolved = await resolveKnowledgeBaseInput({ targetDir: tmpRoot, raw: "# seed\n" });
		if (!resolved) throw new Error("expected resolved input");
		await stageKnowledgeBaseInput(resultsDir(), resolved);
		const sourcesDir = join(resultsDir(), "attack-surface", "knowledge-base-input", "sources");
		// Overwrite the staged source so its sha no longer matches the manifest.
		writeFileSync(join(sourcesDir, "001-command-line-raw.md"), "# tampered\n");
		await expect(loadStagedKnowledgeBase(resultsDir())).rejects.toThrow(/hash check/);
	});
});

describe("auto-discovery", () => {
	it("finds a top-level knowledge-base/ dir and excludes piolium/ and node_modules", async () => {
		mkdirSync(join(tmpRoot, "knowledge-base"), { recursive: true });
		writeFileSync(join(tmpRoot, "knowledge-base", "guide.md"), "# guide\n");
		mkdirSync(join(tmpRoot, "piolium", "knowledge-base"), { recursive: true });
		writeFileSync(join(tmpRoot, "piolium", "knowledge-base", "out.md"), "# excluded\n");
		mkdirSync(join(tmpRoot, "node_modules", "knowledge-base"), { recursive: true });
		writeFileSync(join(tmpRoot, "node_modules", "knowledge-base", "dep.md"), "# excluded\n");

		const resolved = await resolveKnowledgeBaseInput({ targetDir: tmpRoot });
		expect(resolved?.sourceKind).toBe("auto-discovered");
		expect(resolved?.files.map((f) => f.logicalPath)).toEqual(["knowledge-base/guide.md"]);
	});

	it("returns undefined when there is nothing to discover or adopt", async () => {
		const resolved = await resolveKnowledgeBaseInput({ targetDir: tmpRoot });
		expect(resolved).toBeUndefined();
	});
});

describe("resume gauntlet", () => {
	async function seedResumableAudit(reference: KnowledgeBaseReference): Promise<string> {
		const audit = await initAudit(tmpRoot, { mode: "knowledge-base", agent_sdk: "pi" });
		await mutateAuditState(tmpRoot, (state) => ({
			...state,
			audits: state.audits.map((a) =>
				a.audit_id === audit.audit_id ? { ...a, status: "failed", knowledge_base: reference } : a,
			),
		}));
		return audit.audit_id;
	}

	it("throws when resuming with no matching audit record", async () => {
		await expect(
			resolveKnowledgeBaseInput({ targetDir: tmpRoot, resume: true, resumeMode: "knowledge-base" }),
		).rejects.toThrow(/no matching non-complete audit/);
	});

	it("returns the staged corpus when the recorded reference matches", async () => {
		const resolved = await resolveKnowledgeBaseInput({ targetDir: tmpRoot, raw: "# seed\n" });
		if (!resolved) throw new Error("expected resolved input");
		const reference = await stageKnowledgeBaseInput(resultsDir(), resolved);
		await seedResumableAudit(reference);

		const resumed = await resolveKnowledgeBaseInput({
			targetDir: tmpRoot,
			resume: true,
			resumeMode: "knowledge-base",
		});
		expect(resumed?.aggregateSha256).toBe(resolved.aggregateSha256);
	});

	it("throws when the staged corpus changed since the audit started", async () => {
		const first = await resolveKnowledgeBaseInput({ targetDir: tmpRoot, raw: "# seed one\n" });
		if (!first) throw new Error("expected resolved input");
		const reference = await stageKnowledgeBaseInput(resultsDir(), first);
		await seedResumableAudit(reference);
		// Re-stage a different corpus so the live staging no longer matches the record.
		const second = await resolveKnowledgeBaseInput({ targetDir: tmpRoot, raw: "# seed two\n" });
		if (!second) throw new Error("expected resolved input");
		await stageKnowledgeBaseInput(resultsDir(), second);

		await expect(
			resolveKnowledgeBaseInput({ targetDir: tmpRoot, resume: true, resumeMode: "knowledge-base" }),
		).rejects.toThrow(/does not match/);
	});
});

describe("isGitWorktreeCleanForKnowledgeBaseReuse", () => {
	it("returns null outside a git worktree (fail-safe: not reusable)", () => {
		expect(isGitWorktreeCleanForKnowledgeBaseReuse(tmpRoot)).toBeNull();
	});
});
