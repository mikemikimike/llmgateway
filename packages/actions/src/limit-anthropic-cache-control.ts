import type {
	AnthropicMessage,
	AnthropicSystemContent,
	MessageContent,
} from "@llmgateway/models";

/**
 * Anthropic rejects any request carrying more than 4 `cache_control` blocks
 * ("A maximum of 4 blocks with cache_control may be provided. Found 5.").
 */
export const MAX_ANTHROPIC_CACHE_CONTROL_BLOCKS = 4;

function hasCacheControl(block: unknown): boolean {
	return (
		!!block &&
		typeof block === "object" &&
		(block as { cache_control?: unknown }).cache_control !== undefined &&
		(block as { cache_control?: unknown }).cache_control !== null
	);
}

function withoutCacheControl<T>(block: T): T {
	const { cache_control: _dropped, ...rest } = block as unknown as Record<
		string,
		unknown
	>;
	return rest as unknown as T;
}

/**
 * Enforces Anthropic's hard limit of 4 `cache_control` blocks per request
 * across the `system` field and the message content blocks.
 *
 * Markers can come from two places: the caller's own request and the gateway's
 * heuristics (long system prompts, long text blocks, turn boundaries). Each
 * place caps itself, but neither sees the other's total — a caller that already
 * marks 4 message blocks plus one auto-injected system marker adds up to 5 and
 * the request 400s upstream.
 *
 * Excess markers are dropped from the front. Anthropic processes breakpoints in
 * order (system, then messages) and every later breakpoint's prefix contains
 * the earlier blocks anyway, so keeping the last 4 preserves the longest —
 * and most valuable — cached prefixes, and drops the gateway's auto-injected
 * system marker before any caller-supplied one.
 */
export function limitAnthropicCacheControlBlocks(
	system: string | AnthropicSystemContent[] | undefined,
	messages: AnthropicMessage[],
): {
	system: string | AnthropicSystemContent[] | undefined;
	messages: AnthropicMessage[];
} {
	const systemBlocks = Array.isArray(system) ? system : [];
	let total = systemBlocks.filter(hasCacheControl).length;
	for (const message of messages) {
		if (Array.isArray(message.content)) {
			total += message.content.filter(hasCacheControl).length;
		}
	}

	let toDrop = total - MAX_ANTHROPIC_CACHE_CONTROL_BLOCKS;
	if (toDrop <= 0) {
		return { system, messages };
	}

	const nextSystem = Array.isArray(system)
		? system.map((block) => {
				if (toDrop > 0 && hasCacheControl(block)) {
					toDrop--;
					return withoutCacheControl(block);
				}
				return block;
			})
		: system;

	const nextMessages = messages.map((message) => {
		if (toDrop <= 0 || !Array.isArray(message.content)) {
			return message;
		}
		const content = message.content.map((block: MessageContent) => {
			if (toDrop > 0 && hasCacheControl(block)) {
				toDrop--;
				return withoutCacheControl(block);
			}
			return block;
		});
		return { ...message, content };
	});

	return { system: nextSystem, messages: nextMessages };
}
