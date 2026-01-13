/**
 * Workflow client for Dapr
 */

import type { DaprClient } from "@dapr/dapr";
import { createWorkflowError, safeExecute } from "../error-handling";
import type { DaprLogger, WorkflowInstance, WorkflowOptions } from "../types";
import { validateRequired } from "../utils";

export class DaprWorkflowClient {
	private client: () => Promise<DaprClient>;
	private logger: DaprLogger;

	constructor(clientProvider: () => Promise<DaprClient>, logger: DaprLogger) {
		this.client = clientProvider;
		this.logger = logger;
	}

	/**
	 * Start a new workflow instance
	 */
	public async start<T = unknown>(
		workflowName: string,
		input?: T,
		options: WorkflowOptions = {},
	): Promise<string> {
		validateRequired({ workflowName }, ["workflowName"], "workflow start");

		return safeExecute(
			async () => {
				this.logger.debug("Starting workflow", {
					workflowName,
					instanceId: options.instanceId || "auto-generated",
					workflowComponent: options.workflowComponent,
				});

				const client = await this.client();

				const instanceId = await client.workflow.start(
					workflowName,
					input,
					options.instanceId,
					options.workflowComponent,
				);

				this.logger.debug("Workflow started", {
					workflowName,
					instanceId,
				});

				return instanceId;
			},
			(message, details) =>
				createWorkflowError(
					`Failed to start workflow ${workflowName}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Get a workflow instance by ID
	 */
	public async get(instanceId: string): Promise<WorkflowInstance> {
		validateRequired({ instanceId }, ["instanceId"], "workflow get");

		return safeExecute(
			async () => {
				this.logger.debug("Getting workflow instance", { instanceId });
				const client = await this.client();

				const instance = await client.workflow.get(instanceId);

				this.logger.debug("Workflow instance retrieved", {
					instanceId,
					workflowName: instance.workflowName,
					runtimeStatus: instance.runtimeStatus,
				});

				return {
					instanceId: instance.instanceID, // Fixed property name to match Dapr SDK
					workflowName: instance.workflowName,
					createdAt: new Date(instance.createdAt),
					lastUpdatedAt: new Date(instance.lastUpdatedAt),
					runtimeStatus: instance.runtimeStatus,
					properties: instance.properties || {},
				};
			},
			(message, details) =>
				createWorkflowError(
					`Failed to get workflow instance ${instanceId}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Terminate a workflow instance
	 */
	public async terminate(instanceId: string): Promise<void> {
		validateRequired({ instanceId }, ["instanceId"], "workflow terminate");

		return safeExecute(
			async () => {
				this.logger.debug("Terminating workflow instance", { instanceId });
				const client = await this.client();

				await client.workflow.terminate(instanceId);

				this.logger.debug("Workflow instance terminated", { instanceId });
			},
			(message, details) =>
				createWorkflowError(
					`Failed to terminate workflow instance ${instanceId}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Pause a workflow instance
	 */
	public async pause(instanceId: string): Promise<void> {
		validateRequired({ instanceId }, ["instanceId"], "workflow pause");

		return safeExecute(
			async () => {
				this.logger.debug("Pausing workflow instance", { instanceId });
				const client = await this.client();

				await client.workflow.pause(instanceId);

				this.logger.debug("Workflow instance paused", { instanceId });
			},
			(message, details) =>
				createWorkflowError(
					`Failed to pause workflow instance ${instanceId}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Resume a paused workflow instance
	 */
	public async resume(instanceId: string): Promise<void> {
		validateRequired({ instanceId }, ["instanceId"], "workflow resume");

		return safeExecute(
			async () => {
				this.logger.debug("Resuming workflow instance", { instanceId });
				const client = await this.client();

				await client.workflow.resume(instanceId);

				this.logger.debug("Workflow instance resumed", { instanceId });
			},
			(message, details) =>
				createWorkflowError(
					`Failed to resume workflow instance ${instanceId}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Purge a workflow instance
	 */
	public async purge(instanceId: string): Promise<void> {
		validateRequired({ instanceId }, ["instanceId"], "workflow purge");

		return safeExecute(
			async () => {
				this.logger.debug("Purging workflow instance", { instanceId });
				const client = await this.client();

				await client.workflow.purge(instanceId);

				this.logger.debug("Workflow instance purged", { instanceId });
			},
			(message, details) =>
				createWorkflowError(
					`Failed to purge workflow instance ${instanceId}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Raise an event for a workflow instance
	 */
	public async raiseEvent<T = unknown>(
		instanceId: string,
		eventName: string,
		eventData?: T,
	): Promise<void> {
		validateRequired(
			{ instanceId, eventName },
			["instanceId", "eventName"],
			"workflow raiseEvent",
		);

		return safeExecute(
			async () => {
				this.logger.debug("Raising event for workflow instance", {
					instanceId,
					eventName,
				});

				const client = await this.client();
				await client.workflow.raise(instanceId, eventName, eventData);

				this.logger.debug("Event raised for workflow instance", {
					instanceId,
					eventName,
				});
			},
			(message, details) =>
				createWorkflowError(
					`Failed to raise event ${eventName} for workflow instance ${instanceId}: ${message}`,
					details,
				),
		);
	}
}
