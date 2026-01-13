/**
 * Constants for the Dapr manager
 */

// Default values
export const DEFAULT_DAPR_HOST = "127.0.0.1";
export const DEFAULT_DAPR_PORT = "3500";
export const DEFAULT_DAPR_GRPC_PORT = "50001";
export const DEFAULT_MAX_BODY_SIZE_MB = 4;
export const DEFAULT_STATE_STORE = "statestore-redis";
export const DEFAULT_PUBSUB_NAME = "pubsub-rabbitmq";
export const DEFAULT_SECRET_STORE = "secretstore";
export const DEFAULT_CONFIG_STORE = "configstore-redis";

// Environment variable names
export const ENV_DAPR_HOST = "DAPR_HOST";
export const ENV_DAPR_HTTP_PORT = "DAPR_HTTP_PORT";
export const ENV_DAPR_GRPC_PORT = "DAPR_GRPC_PORT";
export const ENV_DAPR_HTTP_ENDPOINT = "DAPR_HTTP_ENDPOINT";
export const ENV_DAPR_GRPC_ENDPOINT = "DAPR_GRPC_ENDPOINT";
export const ENV_DAPR_API_TOKEN = "DAPR_API_TOKEN";

// Retry configuration
export const DEFAULT_RETRY_COUNT = 3;
export const DEFAULT_RETRY_DELAY_MS = 500;
export const DEFAULT_RETRY_MAX_DELAY_MS = 5000;
export const DEFAULT_RETRY_JITTER = 0.1;

// Timeout configuration
export const DEFAULT_OPERATION_TIMEOUT_MS = 30000; // 30 seconds
export const DEFAULT_CONNECTION_TIMEOUT_MS = 10000; // 10 seconds
export const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 5000; // 5 seconds

// Connection status
export const CONNECTION_STATUS = {
	CONNECTED: "connected",
	DISCONNECTED: "disconnected",
	CONNECTING: "connecting",
	ERROR: "error",
} as const;

// Health status
export const HEALTH_STATUS = {
	HEALTHY: "healthy",
	UNHEALTHY: "unhealthy",
} as const;

// Error codes
export const ERROR_CODES = {
	CONNECTION_ERROR: "DAPR_CONNECTION_ERROR",
	TIMEOUT_ERROR: "DAPR_TIMEOUT_ERROR",
	STATE_ERROR: "DAPR_STATE_ERROR",
	PUBSUB_ERROR: "DAPR_PUBSUB_ERROR",
	BINDING_ERROR: "DAPR_BINDING_ERROR",
	SECRET_ERROR: "DAPR_SECRET_ERROR",
	CONFIG_ERROR: "DAPR_CONFIG_ERROR",
	INVOKE_ERROR: "DAPR_INVOKE_ERROR",
	CRYPTO_ERROR: "DAPR_CRYPTO_ERROR",
	LOCK_ERROR: "DAPR_LOCK_ERROR",
	WORKFLOW_ERROR: "DAPR_WORKFLOW_ERROR",
	VALIDATION_ERROR: "DAPR_VALIDATION_ERROR",
} as const;
