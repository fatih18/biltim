import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import { opentelemetry } from "@elysiajs/opentelemetry";
import staticPlugin from "@elysiajs/static";
import * as allTables from "@monorepo/db-entities/schemas";
import { pushSchema } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgSchema } from "drizzle-orm/pg-core";
import { Elysia } from "elysia";
import { Client } from "pg";
import { status_html } from "./htmls";
import {
	AuthorizationMiddleware,
	ErrorMiddleware,
	IdentityMiddleware,
} from "./middlewares";
import {
	AuthV2Routes,
	DownloadsRoute,
	FilesRoute,
	GenericRoutes,
	InitiateRoute,
	SubscriptionRoute,
} from "./routes";
import {
	registerRemoteAgent,
	resolvePendingCommand,
	unregisterRemoteAgent,
} from "./utils";

export const appSettings = new Elysia()
	.use(opentelemetry())
	.use(staticPlugin())
	.use(cors())
	.use(html())
	.state({
		chatSessions: {},
		waitingQueue: {},
	})
	.onStart(async () => {
		if (!process.env.IS_MULTI_TENANT) return;
		if (!process.env.PORT) throw new Error("🖐️ Halt! PORT is not defined!");
		if (!process.env.GODMIN_EMAIL || !process.env.GODMIN_PASSWORD)
			throw new Error("🖐️ Halt! DATABASE credentials are not defined!");
		if (!process.env.NUCLEUS_APP_ID)
			throw new Error("🖐️ Halt! NUCLEUS_APP_ID is not defined!");

		const targetDbName = process.env.DB_NAME;

		let createdDatabase = false;

		// Parse the DATABASE_URL and replace the database name with 'postgres' for admin operations
		const databaseUrl = process.env.DATABASE_URL || "";
		const adminConnectionString = databaseUrl.replace(/\/[^/]*$/, "/postgres");

		const adminClient = new Client({
			connectionString: adminConnectionString,
		});

		console.log(
			`---------------------------------\n\n Godmin user: ${process.env.GODMIN_EMAIL}\n\n Password: ${process.env.GODMIN_PASSWORD}\n\n---------------------------------`,
		);

		try {
			await adminClient.connect();
			const exists = await adminClient.query(
				"SELECT 1 FROM pg_database WHERE datname = $1",
				[targetDbName],
			);

			if (exists.rowCount === 0) {
				await adminClient.query(`CREATE DATABASE "${targetDbName}"`);
				createdDatabase = true;
				console.log(`✅ Database "${targetDbName}" created successfully.`);
			} else {
				console.log(`✅ Database "${targetDbName}" already exists.`);
			}
		} catch (dbError) {
			console.error("❌ Failed to ensure database exists.", dbError);
			throw dbError;
		} finally {
			await adminClient.end().catch(() => undefined);
		}

		if (createdDatabase) {
			const cleanupClient = new Client({
				connectionString: process.env.DATABASE_URL,
				database: targetDbName,
			});

			try {
				await cleanupClient.connect();
				await cleanupClient.query("DROP SCHEMA IF EXISTS public CASCADE;");
				console.log(
					"✅ Dropped default public schema from newly created database.",
				);
			} catch (cleanupError) {
				console.error(
					"❌ Failed to drop public schema from new database.",
					cleanupError,
				);
				throw cleanupError;
			} finally {
				await cleanupClient.end().catch(() => undefined);
			}
		}

		try {
			const schema = pgSchema("main");
			const tenantDb = drizzle(process.env.DATABASE_URL);
			// biome-ignore lint/suspicious/noExplicitAny: <too complex without need to define>
			const schemaTables: Record<string, any> = {};
			console.log(
				process.env.IS_MULTI_TENANT === "true"
					? "\n\n🏛️👤👤👤 Muti-Tenant architecture selected...\n\n"
					: "\n\n🏛️👤 Single-Tenant architecture selected...\n\n",
			);

			for (const [key, value] of Object.entries(allTables)) {
				const isTableForApp = value.available_app_ids.includes(
					process.env.NUCLEUS_APP_ID,
				);
				const isTableForMainTenant =
					value.available_schemas.includes("*") ||
					value.available_schemas.includes("main");
				const isTableExcludedonMain =
					value.excluded_schemas?.length > 0
						? (value.excluded_schemas as string[]).includes("main")
						: false;
				// console.log(`\n\n${key}\n\n`, {
				//   isMultiTenant: process.env.IS_MULTI_TENANT,
				//   key,
				//   isTableForApp,
				//   isTableForMainTenant,
				//   isTableExcludedonMain,
				//   available_schemas: value.available_schemas,
				//   available_app_ids: value.available_app_ids,
				//   excluded_schemas: value.excluded_schemas,
				//   app_id: process.env.NUCLEUS_APP_ID,
				// })
				if (
					(process.env.IS_MULTI_TENANT === "false" && key === "T_Tenants") ||
					!isTableForMainTenant ||
					isTableExcludedonMain ||
					!isTableForApp
				)
					continue;
				schemaTables[key] = value.createTableForSchema(schema);
			}
			console.log(Object.keys(schemaTables));
			const push = await pushSchema({ schema, ...schemaTables }, tenantDb);
			await push.apply();
			console.log(
				process.env.IS_MULTI_TENANT === "true"
					? "\n\n✅ Multi tenant main tenant table created successfully.\n\n"
					: "\n\n✅ Single tenant main table created successfully.\n\n",
			);
		} catch (e: unknown) {
			// Error yapısını düzgün kontrol et
			if (e && typeof e === "object" && "cause" in e) {
				const cause = e.cause as { code: string };

				// Schema zaten var (42P06) veya tablo zaten var (42P07)
				if (cause.code === "42P06" || cause.code === "42P07") {
					console.log(
						process.env.IS_MULTI_TENANT === "true"
							? "\n\n✅ Multi tenant main tenant table already exists.\n\n"
							: "\n\n✅ Single tenant main table already exists.\n\n",
					);
				} else {
					console.log(
						"\n\n❌ Database setup error with code:",
						cause.code,
						e,
						"\n\n",
					);
				}
			} else {
				console.log("\n\n❌ Database setup error:", e, "\n\n");
			}
		}

		// Run initialization tasks
		const { runInitialization } = await import("./initialization");
		await runInitialization();
	});

// Special types for splitting code into MVC patterns
// must be checked on every Elysia version update for compatibility
export type App = typeof appSettings;
export type OnRequest = Parameters<
	Parameters<typeof appSettings.onRequest>[0][1]
>[0];
type BaseOnError = Parameters<Parameters<typeof appSettings.onError>[1][2]>[0];
type OnErrorBaseError = BaseOnError extends { error: infer T } ? T : never;
type AugmentedError<T> = T extends object
	? T & {
		status?: number;
		message?: string;
	}
	: {
		status?: number;
		message?: string;
	};
type OnErrorError = AugmentedError<OnErrorBaseError>;
export type OnError = Omit<BaseOnError, "error"> & {
	error: OnErrorError;
};
export type AppTypes = typeof appSettings.derive;
export type AppRequest = Parameters<
	// @ts-expect-error
	Parameters<typeof appSettings.onRequest>[0]
>[0];
type BaseElysiaRequest = Parameters<Parameters<AppTypes>[1]>[0];
export type ElysiaRequestWOBody = BaseElysiaRequest;
export type ElysiaRequest<B = unknown> = BaseElysiaRequest & {
	body: B extends { body: infer Body } ? Body : BaseElysiaRequest["body"];
	params: B extends { params: infer Params }
	? Params
	: BaseElysiaRequest["params"];
};
export type ElysiaContext = Parameters<
	// @ts-expect-error
	Parameters<typeof appSettings.onError>[1]
>[0];

const server = appSettings
	.onRequest(IdentityMiddleware)
	.onRequest(AuthorizationMiddleware)
	.onError(ErrorMiddleware)
	.get("/health", () => "OK")
	.get("/status", () => status_html)
	.use(GenericRoutes)
	.use(InitiateRoute)
	.use(AuthV2Routes)
	.use(FilesRoute)
	.use(DownloadsRoute)
	.use(SubscriptionRoute)
	.ws("/api/remote/agent", {
		open(ws) {
			const query = (ws.data?.query || {}) as { agentId?: string };

			if (!query.agentId) {
				console.log("❌ Remote agent WS missing agentId");
				ws.close?.(1008, "Missing agentId");
				return;
			}

			// Auth for agents is handled via HTTP register/heartbeat using per-computer API keys.
			// WS layer only ensures that an agentId is present and then registers the socket.
			registerRemoteAgent(query.agentId, ws);
			console.log("🖥️ Remote agent connected via WS", {
				agentId: query.agentId,
			});
		},
		message(ws, message) {
			const query = (ws.data?.query || {}) as { agentId?: string };
			try {
				// biome-ignore lint/suspicious/noExplicitAny: WS message can be string, buffer, or pre-parsed object
				let parsed: any = null;

				if (typeof message === "string") {
					parsed = JSON.parse(message);
				} else if (message && typeof message === "object") {
					// Elysia/Bun may auto-parse JSON or wrap in { data: ... }
					if ("type" in message) {
						parsed = message;
					} else if ("data" in message) {
						const inner = (message as { data: unknown }).data;
						if (typeof inner === "string") {
							parsed = JSON.parse(inner);
						} else if (inner && typeof inner === "object") {
							parsed = inner;
						}
					}
				}

				if (parsed?.type === "commandResult" && parsed.commandId) {
					resolvePendingCommand(parsed.commandId as string, parsed.result);
					console.log("📡 CommandResult from agent", {
						agentId: query.agentId,
						commandId: parsed.commandId,
					});
				} else if (parsed?.type) {
					console.log("📡 Message from agent", {
						agentId: query.agentId,
						type: parsed.type,
					});
				} else {
					console.log("📡 Unrecognized message from agent", {
						agentId: query.agentId,
						messageType: typeof message,
					});
				}
			} catch (error) {
				console.log("⚠️ Failed to parse agent WS message", {
					agentId: query.agentId,
					error,
				});
			}
		},
		close(ws, code, reason) {
			const query = (ws.data?.query || {}) as { agentId?: string };
			if (query.agentId) unregisterRemoteAgent(query.agentId, ws);
			console.log("🔌 Remote agent WS closed", {
				agentId: query.agentId,
				code,
				reason,
			});
		},
	})
	.listen(process.env.PORT || 4000);

console.log(
	`\n✅ Server is listening on http://${server.server?.hostname}:${server.server?.port}`,
);
console.log(
	`💚 Health check: http://${server.server?.hostname}:${server.server?.port}/health\n`,
);
