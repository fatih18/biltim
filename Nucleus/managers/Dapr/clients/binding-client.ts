/**
 * Binding client for Dapr
 */

import type { DaprClient } from "@dapr/dapr";
import { createBindingError, safeExecute } from "../error-handling";
import type { BindingOptions, DaprLogger } from "../types";
import { validateRequired } from "../utils";

export class DaprBindingClient {
	private client: () => Promise<DaprClient>;
	private logger: DaprLogger;

	constructor(clientProvider: () => Promise<DaprClient>, logger: DaprLogger) {
		this.client = clientProvider;
		this.logger = logger;
	}

	/**
	 * Invoke an output binding
	 */
	public async invoke<TData = unknown, TResponse = unknown>(
		name: string,
		operation: string,
		data?: TData,
		options: BindingOptions = {},
	): Promise<TResponse> {
		validateRequired(
			{ name, operation },
			["name", "operation"],
			"binding invoke",
		);

		return safeExecute(
			async () => {
				this.logger.debug("Invoking binding", { name, operation });
				const client = await this.client();
				const response = await client.binding.send(
					name,
					operation,
					data,
					options.metadata,
				);
				this.logger.debug("Binding invoked successfully", { name, operation });
				return response as TResponse;
			},
			(message, details) =>
				createBindingError(
					`Failed to invoke binding ${name}: ${message}`,
					details,
				),
		);
	}
}
