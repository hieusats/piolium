import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	KNOWLEDGE_BASE_AVAILABLE_ENV,
	KNOWLEDGE_BASE_FILE,
	LEGACY_KNOWLEDGE_BASE_FILE,
	applyKnowledgeBaseAvailableEnv,
	resolveCuratedContextFile,
} from "../extensions/piolium/knowledge-base-file.ts";

let tmpRoot: string;

beforeEach(() => {
	tmpRoot = mkdtempSync(join(tmpdir(), "piolium-kbfile-"));
	mkdirSync(join(tmpRoot, "piolium"), { recursive: true });
});

afterEach(() => {
	rmSync(tmpRoot, { recursive: true, force: true });
	delete process.env[KNOWLEDGE_BASE_AVAILABLE_ENV];
});

function write(rel: string): void {
	writeFileSync(join(tmpRoot, rel), "# curated\n");
}

describe("resolveCuratedContextFile", () => {
	it("returns undefined when neither file exists", () => {
		expect(resolveCuratedContextFile(tmpRoot)).toBeUndefined();
	});

	it("resolves the current KNOWLEDGE-BASE.md name", () => {
		write(KNOWLEDGE_BASE_FILE);
		expect(resolveCuratedContextFile(tmpRoot)).toBe(KNOWLEDGE_BASE_FILE);
	});

	it("falls back to the legacy INFO.md name", () => {
		write(LEGACY_KNOWLEDGE_BASE_FILE);
		expect(resolveCuratedContextFile(tmpRoot)).toBe(LEGACY_KNOWLEDGE_BASE_FILE);
	});

	it("prefers KNOWLEDGE-BASE.md when both exist", () => {
		write(KNOWLEDGE_BASE_FILE);
		write(LEGACY_KNOWLEDGE_BASE_FILE);
		expect(resolveCuratedContextFile(tmpRoot)).toBe(KNOWLEDGE_BASE_FILE);
	});
});

describe("applyKnowledgeBaseAvailableEnv", () => {
	it("sets the env var to 'true' and returns true when a file is present", () => {
		write(KNOWLEDGE_BASE_FILE);
		expect(applyKnowledgeBaseAvailableEnv(tmpRoot)).toBe(true);
		expect(process.env[KNOWLEDGE_BASE_AVAILABLE_ENV]).toBe("true");
	});

	it("sets the env var to 'false' and returns false when absent", () => {
		expect(applyKnowledgeBaseAvailableEnv(tmpRoot)).toBe(false);
		expect(process.env[KNOWLEDGE_BASE_AVAILABLE_ENV]).toBe("false");
	});
});
