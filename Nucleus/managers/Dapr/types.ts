/**
 * Type definitions for the Dapr manager
 */

import type { CommunicationProtocolEnum } from "@dapr/dapr";
import type { LockStatus } from "@dapr/dapr/types/lock/UnlockResponse";

// Connection types
export type DaprConnectionOptions = {
	daprHost?: string;
	daprPort?: string;
	communicationProtocol?: CommunicationProtocolEnum;
	maxBodySizeMb?: number;
	daprApiToken?: string;
	logger?: DaprLogger;
};

// Logger types
export type LogLevel = "debug" | "info" | "warn" | "error";

export type DaprLogger = {
	debug: (message: string, ...meta: unknown[]) => void;
	info: (message: string, ...meta: unknown[]) => void;
	warn: (message: string, ...meta: unknown[]) => void;
	error: (message: string, ...meta: unknown[]) => void;
};

// State management types
export type StateItem<T = unknown> = {
	key: string;
	value: T;
	etag?: string;
	metadata?: Record<string, string>;
};

export type StateSaveOptions = {
	concurrency?: "first-write" | "last-write";
	consistency?: "eventual" | "strong";
	metadata?: Record<string, string>;
};

export type StateOperation<T = unknown> = {
	operation: "upsert" | "delete";
	request: {
		key: string;
		value?: T;
		etag?: string;
		metadata?: Record<string, string>;
	};
};

// PubSub types
export type PublishOptions = {
	contentType?: string;
	metadata?: Record<string, string>;
};

export type BulkPublishMessage<T = unknown> = {
	entryId: string;
	contentType?: string;
	event: T;
	metadata?: Record<string, string>;
};

export type BulkPublishResponse = {
	failedEntries: Array<{
		entryId: string;
		error: string;
	}>;
};

// Service invocation types
export type InvokeOptions = {
	headers?: Record<string, string>;
	queryParams?: Record<string, string>;
	timeout?: number;
};

// Binding types
export type BindingOptions = {
	metadata?: Record<string, string>;
};

// Secret types
export type SecretOptions = {
	metadata?: Record<string, string>;
};

// Configuration types
export type ConfigItem = {
	key: string;
	value: string;
	version: string;
	metadata: Record<string, string>;
};

export type ConfigResponse = {
	items: Record<string, ConfigItem>;
};

export type ConfigSubscriptionCallback = (
	data: ConfigResponse,
) => Promise<void> | void;

export type ConfigSubscription = {
	stop: () => void;
};

// Cryptography types
export type CryptoOptions = {
	componentName: string;
	keyName?: string;
	keyWrapAlgorithm?: string;
};

// Lock types
export type LockOptions = {
	expiryInSeconds: number;
};

export type LockResponse = {
	success: boolean;
};

export type UnlockResponse = {
	status: LockStatus;
};

// Workflow types
export type WorkflowOptions = {
	instanceId?: string;
	workflowComponent?: string;
};

export type WorkflowInstance = {
	instanceId: string;
	workflowName: string;
	createdAt: Date;
	lastUpdatedAt: Date;
	runtimeStatus: string;
	properties: Record<string, string>;
};

// Health check types
export type HealthStatus = {
	status: string;
	version: string;
};

// Error types
export type DaprError = {
	code: string;
	message: string;
	details?: unknown;
};
