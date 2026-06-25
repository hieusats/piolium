import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	isAnthropicVertexConfigured,
	registerAnthropicVertex,
} from "../extensions/piolium/providers/anthropic-vertex.ts";

describe("isAnthropicVertexConfigured", () => {
	it("is false when no Vertex env vars are set", () => {
		expect(isAnthropicVertexConfigured({})).toBe(false);
	});

	it("opts in when any Vertex env var is present", () => {
		expect(isAnthropicVertexConfigured({ ANTHROPIC_VERTEX_PROJECT_ID: "my-proj" })).toBe(true);
		expect(isAnthropicVertexConfigured({ GOOGLE_CLOUD_PROJECT: "my-proj" })).toBe(true);
		expect(isAnthropicVertexConfigured({ GCLOUD_PROJECT: "my-proj" })).toBe(true);
		expect(isAnthropicVertexConfigured({ GOOGLE_APPLICATION_CREDENTIALS: "/path/adc.json" })).toBe(
			true,
		);
		expect(isAnthropicVertexConfigured({ GOOGLE_CLOUD_LOCATION: "us-east5" })).toBe(true);
		expect(isAnthropicVertexConfigured({ CLOUD_ML_REGION: "us-east5" })).toBe(true);
	});

	it("treats blank/whitespace env values as unset", () => {
		expect(isAnthropicVertexConfigured({ ANTHROPIC_VERTEX_PROJECT_ID: "" })).toBe(false);
		expect(isAnthropicVertexConfigured({ GOOGLE_CLOUD_PROJECT: "   " })).toBe(false);
	});

	it("honours an explicit PIOLIUM_VERTEX=on override even with no other env", () => {
		for (const on of ["1", "true", "on", "TRUE"]) {
			expect(isAnthropicVertexConfigured({ PIOLIUM_VERTEX: on })).toBe(true);
		}
	});

	it("honours an explicit PIOLIUM_VERTEX=off override even when env vars are present", () => {
		for (const off of ["0", "false", "off", "Off"]) {
			expect(
				isAnthropicVertexConfigured({ PIOLIUM_VERTEX: off, ANTHROPIC_VERTEX_PROJECT_ID: "my-proj" }),
			).toBe(false);
		}
	});

	it("falls back to auto-detect when PIOLIUM_VERTEX is blank/unrecognized", () => {
		expect(isAnthropicVertexConfigured({ PIOLIUM_VERTEX: "", GCLOUD_PROJECT: "p" })).toBe(true);
		expect(isAnthropicVertexConfigured({ PIOLIUM_VERTEX: "maybe", GCLOUD_PROJECT: "p" })).toBe(true);
		expect(isAnthropicVertexConfigured({ PIOLIUM_VERTEX: "maybe" })).toBe(false);
	});
});

describe("registerAnthropicVertex", () => {
	let originalVertexEnv: string | undefined;

	beforeEach(() => {
		originalVertexEnv = process.env.PIOLIUM_VERTEX;
	});

	afterEach(() => {
		if (originalVertexEnv === undefined) Reflect.deleteProperty(process.env, "PIOLIUM_VERTEX");
		else process.env.PIOLIUM_VERTEX = originalVertexEnv;
	});

	function makePi() {
		return { registerProvider: vi.fn() } as unknown as Parameters<
			typeof registerAnthropicVertex
		>[0] & { registerProvider: ReturnType<typeof vi.fn> };
	}

	it("does not register the provider when Vertex is unconfigured", () => {
		process.env.PIOLIUM_VERTEX = "off";
		const pi = makePi();
		expect(registerAnthropicVertex(pi)).toBe(false);
		expect(pi.registerProvider).not.toHaveBeenCalled();
	});

	it("registers the provider when Vertex is configured", () => {
		process.env.PIOLIUM_VERTEX = "on";
		const pi = makePi();
		expect(registerAnthropicVertex(pi)).toBe(true);
		expect(pi.registerProvider).toHaveBeenCalledWith("anthropic-vertex", expect.any(Object));
	});
});
