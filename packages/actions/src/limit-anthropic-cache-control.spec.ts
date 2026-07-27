import { describe, expect, test } from "vitest";

import { limitAnthropicCacheControlBlocks } from "./limit-anthropic-cache-control.js";

import type {
	AnthropicMessage,
	AnthropicSystemContent,
} from "@llmgateway/models";

const marker = { type: "ephemeral" } as const;

function userMessage(text: string, cached: boolean): AnthropicMessage {
	return {
		role: "user",
		content: [
			{ type: "text", text, ...(cached ? { cache_control: marker } : {}) },
		],
	};
}

describe("limitAnthropicCacheControlBlocks", () => {
	test("leaves a request within the limit untouched", () => {
		const system: AnthropicSystemContent[] = [
			{ type: "text", text: "sys", cache_control: marker },
		];
		const messages = [userMessage("a", true), userMessage("b", true)];

		const result = limitAnthropicCacheControlBlocks(system, messages);

		expect(result.system).toBe(system);
		expect(result.messages).toBe(messages);
	});

	test("drops the earliest markers when over the limit", () => {
		const system: AnthropicSystemContent[] = [
			{ type: "text", text: "sys", cache_control: marker },
		];
		const messages = [
			userMessage("a", true),
			userMessage("b", true),
			userMessage("c", true),
			userMessage("d", true),
		];

		const result = limitAnthropicCacheControlBlocks(system, messages);

		expect((result.system as AnthropicSystemContent[])[0]).not.toHaveProperty(
			"cache_control",
		);
		expect(
			result.messages.flatMap((m) =>
				(m.content as { text: string; cache_control?: unknown }[])
					.filter((block) => block.cache_control)
					.map((block) => block.text),
			),
		).toEqual(["a", "b", "c", "d"]);
	});

	test("does not mutate the caller's blocks", () => {
		const system: AnthropicSystemContent[] = [
			{ type: "text", text: "sys", cache_control: marker },
		];
		const messages = [
			userMessage("a", true),
			userMessage("b", true),
			userMessage("c", true),
			userMessage("d", true),
			userMessage("e", true),
		];

		limitAnthropicCacheControlBlocks(system, messages);

		expect(system[0]!.cache_control).toEqual(marker);
		expect(
			(messages[0]!.content[0] as { cache_control?: unknown }).cache_control,
		).toEqual(marker);
	});

	test("passes a string system field through", () => {
		const messages = [userMessage("a", true)];

		expect(limitAnthropicCacheControlBlocks("sys", messages).system).toBe(
			"sys",
		);
	});
});
