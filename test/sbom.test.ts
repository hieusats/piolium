import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	getBundledAgentsDir,
	getBundledSkillsDir,
} from "../extensions/piolium/bundled-resources.ts";

/**
 * The 9 component categories the general-SBOM inventory enumerates. Must stay in
 * sync with advisory-hunter.md §4a and knowledge-base-template.md "## Component Inventory".
 */
const SBOM_CATEGORIES = new Set([
	"runtime",
	"package",
	"framework",
	"datastore",
	"external-service",
	"container-os",
	"build-ci",
	"binary",
	"vendored",
]);

/** Canonical retained path for the machine-readable inventory. */
const SBOM_PATH = "piolium/attack-surface/sbom.json";

/**
 * Validate that an object matches the sbom.json contract documented in
 * advisory-hunter.md §4c. Used on the doc's own embedded example so the prose
 * schema and the artifact a Phase 1 run writes can never silently diverge.
 */
function assertValidSbom(sbom: unknown): void {
	expect(typeof sbom).toBe("object");
	expect(sbom).not.toBeNull();
	const s = sbom as Record<string, unknown>;

	expect(typeof s.target).toBe("string");
	expect(typeof s.generated_at).toBe("string");
	expect(Array.isArray(s.components)).toBe(true);
	expect(Array.isArray(s.categories_covered)).toBe(true);
	expect(Array.isArray(s.coverage_gaps)).toBe(true);

	for (const cat of s.categories_covered as unknown[]) {
		expect(SBOM_CATEGORIES.has(cat as string)).toBe(true);
	}

	for (const raw of s.components as unknown[]) {
		expect(typeof raw).toBe("object");
		expect(raw).not.toBeNull();
		const c = raw as Record<string, unknown>;
		expect(typeof c.name).toBe("string");
		expect((c.name as string).length).toBeGreaterThan(0);
		expect(SBOM_CATEGORIES.has(c.category as string)).toBe(true);
		// ecosystem is null for non-package categories, a string otherwise.
		expect(c.ecosystem === null || typeof c.ecosystem === "string").toBe(true);
		expect(typeof c.version).toBe("string");
		expect(c.relationship).toBe("direct");
		expect(typeof c.purpose).toBe("string");
		expect(Array.isArray(c.evidence)).toBe(true);
		expect((c.evidence as unknown[]).length).toBeGreaterThanOrEqual(1);
		for (const ev of c.evidence as unknown[]) expect(typeof ev).toBe("string");
		expect(typeof c.security_relevant).toBe("boolean");
	}
}

/** Pull the fenced ```json block that holds the sbom.json schema out of a doc. */
function extractSbomExample(markdown: string): unknown {
	const blocks = markdown.match(/```json\n([\s\S]*?)```/g) ?? [];
	for (const block of blocks) {
		const body = block.replace(/```json\n/, "").replace(/```$/, "");
		if (body.includes('"categories_covered"')) return JSON.parse(body);
	}
	throw new Error("no sbom.json example block found in document");
}

const advisoryHunter = readFileSync(join(getBundledAgentsDir(), "advisory-hunter.md"), "utf8");
const kbBuilder = readFileSync(join(getBundledAgentsDir(), "knowledge-base-builder.md"), "utf8");
const kbTemplate = readFileSync(
	join(getBundledSkillsDir(), "audit", "references", "knowledge-base-template.md"),
	"utf8",
);
const auditSkill = readFileSync(join(getBundledSkillsDir(), "audit", "SKILL.md"), "utf8");

describe("SBOM component inventory contract", () => {
	it("advisory-hunter documents the canonical sbom.json path and a schema-valid example", () => {
		expect(advisoryHunter).toContain(SBOM_PATH);
		// The embedded example must parse and conform to the same contract a run writes —
		// guards the doc against drifting into invalid JSON or a missing field.
		assertValidSbom(extractSbomExample(advisoryHunter));
	});

	it("advisory-hunter's §4a inventory table lists exactly the canonical categories", () => {
		// Pull the backticked first-column cells out of the §4a table (the only
		// table in the doc with a backticked first column) and assert the set
		// matches SBOM_CATEGORIES exactly. A plain `toContain` per category would
		// pass on any stray mention (e.g. "package" appears throughout), so it
		// could not catch a category dropped, renamed, or added to the table.
		const tableCategories = new Set<string>();
		for (const m of advisoryHunter.matchAll(/^\| `([a-z][a-z-]*)` \|/gm)) {
			if (m[1]) tableCategories.add(m[1]);
		}
		expect(tableCategories).toEqual(SBOM_CATEGORIES);
	});

	it("the KB template carries the matching ## Component Inventory section", () => {
		expect(kbTemplate).toContain("## Component Inventory");
		// Key Dependencies is reframed as the curated subset seeded from sbom.json.
		expect(kbTemplate).toContain("sbom.json");
	});

	it("knowledge-base-builder seeds Phase 3 from the Phase 1 inventory", () => {
		expect(kbBuilder).toContain(SBOM_PATH);
		expect(kbBuilder).toContain("## Key Dependencies");
	});

	it("audit SKILL.md retains sbom.json as a durable artifact", () => {
		expect(auditSkill).toContain(SBOM_PATH);
		// Retained-path count was bumped from three to four when sbom.json was added.
		expect(auditSkill).toContain("Four paths are retained");
	});
});
