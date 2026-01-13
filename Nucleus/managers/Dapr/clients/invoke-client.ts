/**
 * Service invocation client for Dapr
 */

import type { DaprClient } from "@dapr/dapr";
import { HttpMethod } from "@dapr/dapr";
import { DEFAULT_OPERATION_TIMEOUT_MS } from "../constants";
import { createInvokeError, safeExecute } from "../error-handling";
import type { DaprLogger, InvokeOptions } from "../types";
import { validateRequired, withTimeout } from "../utils";

export class DaprInvokeClient {
	private client: () => Promise<DaprClient>;
	private logger: DaprLogger;

	constructor(clientProvider: () => Promise<DaprClient>, logger: DaprLogger) {
		this.client = clientProvider;
		this.logger = logger;
	}

	/**
	 * Invoke a service method
	 */
	public async invoke<TRequest extends object = object, TResponse = unknown>(
		appId: string,
		methodName: string,
		httpMethod: HttpMethod = HttpMethod.POST,
		data?: TRequest,
		options: InvokeOptions = {},
	): Promise<TResponse> {
		validateRequired(
			{ appId, methodName, httpMethod },
			["appId", "methodName", "httpMethod"],
			"invoke service",
		);

		const timeoutMs = options.timeout || DEFAULT_OPERATION_TIMEOUT_MS;

		return safeExecute(
			async () => {
				this.logger.debug("Invoking service", {
					appId,
					methodName,
					httpMethod,
					hasData: data !== undefined,
				});

				// Build query string from query parameters if provided
				let fullMethodName = methodName;
				if (
					options.queryParams &&
					Object.keys(options.queryParams).length > 0
				) {
					const queryString = Object.entries(options.queryParams)
						.map(
							([key, value]) =>
								`${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
						)
						.join("&");
					fullMethodName = `${methodName}?${queryString}`;
				}

				const client = await this.client();

				// Use timeout to prevent hanging requests
				const response = (await withTimeout(
					() =>
						client.invoker.invoke(
							appId,
							fullMethodName,
							httpMethod,
							data as object | undefined,
							options.headers,
						),
					timeoutMs,
					`Service invocation timed out after ${timeoutMs}ms`,
				)) as {
					status?: number;
					data?: unknown;
					headers?: Record<string, string>;
				};

				this.logger.debug("Service invoked successfully", {
					appId,
					methodName,
					httpMethod,
					status: response?.status,
				});

				// Handle different response types
				if (!response) {
					return undefined as unknown as TResponse;
				}

				// If response has data property, return that
				if ("data" in response) {
					return response.data as TResponse;
				}

				// Otherwise return the whole response
				return response as unknown as TResponse;
			},
			(message, details) =>
				createInvokeError(
					`Failed to invoke service ${appId}.${methodName}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Invoke a service with GET method (convenience method)
	 */
	public async get<TResponse = unknown>(
		appId: string,
		methodName: string,
		options: InvokeOptions = {},
	): Promise<TResponse> {
		return this.invoke<Record<string, never>, TResponse>(
			appId,
			methodName,
			HttpMethod.GET,
			undefined,
			options,
		);
	}

	/**
	 * Invoke a service with POST method (convenience method)
	 */
	public async post<
		TRequest extends object = Record<string, unknown>,
		TResponse = unknown,
	>(
		appId: string,
		methodName: string,
		data?: TRequest,
		options: InvokeOptions = {},
	): Promise<TResponse> {
		return this.invoke<TRequest, TResponse>(
			appId,
			methodName,
			HttpMethod.POST,
			data,
			options,
		);
	}

	/**
	 * Invoke a service with PUT method (convenience method)
	 */
	public async put<
		TRequest extends object = Record<string, unknown>,
		TResponse = unknown,
	>(
		appId: string,
		methodName: string,
		data?: TRequest,
		options: InvokeOptions = {},
	): Promise<TResponse> {
		return this.invoke<TRequest, TResponse>(
			appId,
			methodName,
			HttpMethod.PUT,
			data,
			options,
		);
	}

	/**
	 * Invoke a service with DELETE method (convenience method)
	 */
	public async delete<TResponse = unknown>(
		appId: string,
		methodName: string,
		options: InvokeOptions = {},
	): Promise<TResponse> {
		return this.invoke<Record<string, never>, TResponse>(
			appId,
			methodName,
			HttpMethod.DELETE,
			undefined,
			options,
		);
	}
}
