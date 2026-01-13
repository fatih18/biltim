/**
 * PubSub client for Dapr
 */

import type { DaprClient } from "@dapr/dapr";
import { DEFAULT_PUBSUB_NAME } from "../constants";
import { createPubSubError, safeExecute } from "../error-handling";
import type {
	BulkPublishMessage,
	BulkPublishResponse,
	DaprLogger,
	PublishOptions,
} from "../types";
import { validateRequired } from "../utils";

export class DaprPubSubClient {
	private client: () => Promise<DaprClient>;
	private logger: DaprLogger;

	constructor(clientProvider: () => Promise<DaprClient>, logger: DaprLogger) {
		this.client = clientProvider;
		this.logger = logger;
	}

	/**
	 * Publish a message to a topic
	 */
	public async publish<T extends object | string>(
		topic: string,
		data: T,
		options: PublishOptions = {},
		pubsubName = DEFAULT_PUBSUB_NAME,
	): Promise<void> {
		validateRequired(
			{ topic, data, pubsubName },
			["topic", "data", "pubsubName"],
			"pubsub publish",
		);

		return safeExecute(
			async () => {
				this.logger.debug("Publishing message to topic", { topic, pubsubName });
				const client = await this.client();
				await client.pubsub.publish(pubsubName, topic, data, {
					metadata: options.metadata,
					contentType: options.contentType,
				});
				this.logger.debug("Message published successfully", {
					topic,
					pubsubName,
				});
			},
			(message, details) =>
				createPubSubError(
					`Failed to publish message to topic ${topic}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Publish multiple messages to a topic in a single request
	 */
	public async publishBulk<T extends object | string>(
		topic: string,
		messages: T[] | BulkPublishMessage<T>[],
		pubsubName = DEFAULT_PUBSUB_NAME,
	): Promise<BulkPublishResponse> {
		validateRequired(
			{ topic, messages, pubsubName },
			["topic", "messages", "pubsubName"],
			"pubsub publishBulk",
		);

		if (messages.length === 0) {
			return { failedEntries: [] };
		}

		return safeExecute(
			async () => {
				this.logger.debug("Publishing bulk messages to topic", {
					topic,
					pubsubName,
					messageCount: messages.length,
				});

				const client = await this.client();

				// Convert messages to the format expected by Dapr
				const daprMessages = messages.map((msg) => {
					if (typeof msg === "object" && "event" in msg) {
						// It's already a BulkPublishMessage
						return {
							entryID: msg.entryId,
							event: msg.event,
							contentType: msg.contentType,
							metadata: msg.metadata,
						};
					}
					// It's a raw message
					return { event: msg };
				});

				const response = await client.pubsub.publishBulk(
					pubsubName,
					topic,
					daprMessages,
				);

				const failedCount = response.failedMessages?.length || 0;
				if (failedCount > 0) {
					this.logger.warn("Some messages failed to publish", {
						topic,
						pubsubName,
						failedCount,
						totalCount: messages.length,
					});
				} else {
					this.logger.debug("All bulk messages published successfully", {
						topic,
						pubsubName,
						messageCount: messages.length,
					});
				}

				// Convert from Dapr SDK format to our custom format
				return {
					failedEntries: (response.failedMessages || []).map((failed) => ({
						entryId: (failed.message as { entryID?: string }).entryID || "",
						error: failed.error?.message || "Unknown error",
					})),
				};
			},
			(message, details) =>
				createPubSubError(
					`Failed to publish bulk messages to topic ${topic}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Create a bulk publish message with proper structure
	 */
	public createBulkPublishMessage<T = unknown>(
		event: T,
		entryId: string,
		contentType?: string,
		metadata?: Record<string, string>,
	): BulkPublishMessage<T> {
		return {
			entryId,
			event,
			contentType,
			metadata,
		};
	}
}
