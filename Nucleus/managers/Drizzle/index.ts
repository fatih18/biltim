/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
import * as schema from "@monorepo/db-entities/schemas";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { relations } from "drizzle-orm/relations";
import { getTableName, isTable } from "drizzle-orm/table";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is not set");
}

const connectionString = process.env.DATABASE_URL;

export const DB = drizzle({
	connection: {
		connectionString,
	},
});

const connections = new Map<string, ReturnType<typeof drizzlePostgres>>();
const sqlInstances = new Map<string, ReturnType<typeof postgres>>();

function validateSchemaName(schemaName: string): void {
	if (!schemaName) {
		throw new Error("Schema name is required");
	}

	if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName)) {
		throw new Error(`Invalid schema name: ${schemaName}`);
	}
}

// ANA ÇÖZÜM: Async getTenantDB function with robust search_path handling
export async function getTenantDB(
	tenantSchema: string,
): Promise<ReturnType<typeof drizzlePostgres>> {
	validateSchemaName(tenantSchema);

	if (connections.has(tenantSchema)) {
		const connection = connections.get(tenantSchema);
		if (!connection) {
			throw new Error(`Connection for schema ${tenantSchema} not initialized`);
		}
		return connection;
	}

	try {
		const sql = postgres(connectionString, {
			max: 10,
			idle_timeout: 20,
			connect_timeout: 30,
			prepare: false, // ÖNEMLİ: Multi-schema için false
			onnotice: () => {},
			transform: {
				undefined: null,
			},
			debug: process.env.NODE_ENV === "development",
			// Her connection için search_path'i otomatik ayarla
			connection: {
				search_path: `${tenantSchema}, public`,
			},
		});

		// Flatten schema namespaces to flat object for Drizzle query API
		const flatSchema: Record<string, any> = {};
		for (const [_key, value] of Object.entries(schema)) {
			if (value && typeof value === "object") {
				Object.assign(flatSchema, value);
			}
		}

		// Automatically generate Drizzle relations for all tables based on inline FKs
		const INLINE_FK_SYMBOL = Symbol.for("drizzle:PgInlineForeignKeys");
		type ForeignKeyRef = {
			columns?: any[];
			foreignColumns?: any[];
		};
		type ForeignKeyLike = {
			reference?: () => ForeignKeyRef;
		};

		function defaultRelationName(
			localColumn: string,
			foreignTableName: string,
		): string {
			if (localColumn.endsWith("_id")) {
				return localColumn.slice(0, -3);
			}
			if (localColumn.endsWith("_by") && foreignTableName === "users") {
				return `${localColumn}_user`;
			}
			return localColumn;
		}

		function buildAutoRelationsForTable(table: unknown) {
			const fks = ((table as any)[INLINE_FK_SYMBOL] ?? []) as ForeignKeyLike[];
			if (!Array.isArray(fks) || fks.length === 0) return undefined;

			return relations(table as any, ({ one }) => {
				const rels: Record<string, any> = {};
				for (const fk of fks) {
					const ref = fk.reference?.();
					if (!ref) continue;
					const [localCol] = ref.columns ?? [];
					const [foreignCol] = ref.foreignColumns ?? [];
					if (!localCol || !foreignCol) continue;
					// Drizzle FK metadata exposes the target table instance here
					const foreignTable = foreignCol.table as unknown;
					const foreignTableName = getTableName(foreignTable as any);
					const relationName = defaultRelationName(
						localCol.name as string,
						foreignTableName,
					);

					rels[relationName] = one(foreignTable as any, {
						fields: [localCol],
						references: [foreignCol],
					});
				}
				return rels as any;
			});
		}

		for (const [key, value] of Object.entries(flatSchema)) {
			if (isTable(value)) {
				const autoRelations = buildAutoRelationsForTable(value);
				if (autoRelations) {
					// Key is irrelevant for Drizzle; it matches Relations by its internal table reference
					flatSchema[`${key}Relations`] = autoRelations;
				}
			}
		}

		const baseDrizzleInstance = drizzlePostgres(sql, { schema: flatSchema });

		// Wrap drizzle instance with a Proxy to ensure search_path is always set
		const drizzleInstance = new Proxy(baseDrizzleInstance, {
			get(target, prop, receiver) {
				const value = Reflect.get(target, prop, receiver);

				// If it's the execute method, wrap it to set search_path first
				if (prop === "execute" && typeof value === "function") {
					return async (...args: unknown[]) => {
						// Set search path before executing
						await sql`SET search_path TO ${sql(tenantSchema)}, public`;
						return value.apply(target, args);
					};
				}

				return value;
			},
		}) as ReturnType<typeof drizzlePostgres>;

		// Initial search path setup and verification
		try {
			await sql`SET search_path TO ${sql(tenantSchema)}, public`;
			console.log(`✅ Search path set to: ${tenantSchema}`);

			// Test query to verify schema works
			const testResult = await sql`SELECT current_schema()`;
			console.log(`✅ Current schema: ${testResult[0]?.current_schema}`);

			// Verify the claims table exists in this schema
			const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = ${tenantSchema} 
          AND table_name = 'claims'
        ) as exists
      `;

			if (!tableCheck[0]?.exists) {
				console.warn(
					`⚠️ Table 'claims' does not exist in schema ${tenantSchema}`,
				);
			}
		} catch (schemaError) {
			console.error(
				`❌ Failed to set search_path for ${tenantSchema}:`,
				schemaError,
			);
			await sql.end();
			throw new Error(
				`Schema ${tenantSchema} does not exist or is not accessible`,
			);
		}

		connections.set(tenantSchema, drizzleInstance);
		sqlInstances.set(tenantSchema, sql);

		console.log(
			`✅ Created new database connection for schema: ${tenantSchema}`,
		);
		return drizzleInstance;
	} catch (error) {
		console.error(
			`❌ Failed to create database connection for schema ${tenantSchema}:`,
			error,
		);
		throw error;
	}
}

// Synchronous version için wrapper (backward compatibility)
export function getTenantDBSync(
	tenantSchema: string,
): ReturnType<typeof drizzlePostgres> {
	const connection = connections.get(tenantSchema);
	if (!connection) {
		throw new Error(`Connection for schema ${tenantSchema} not initialized`);
	}
	return connection;
}

// Connection cleanup functions
export async function closeSpecificTenantConnection(
	tenantSchema: string,
): Promise<void> {
	try {
		const sql = sqlInstances.get(tenantSchema);
		if (sql) {
			await sql.end();
			connections.delete(tenantSchema);
			sqlInstances.delete(tenantSchema);
			console.log(`🔒 Closed connection for schema: ${tenantSchema}`);
		}
	} catch (error) {
		console.error(`❌ Error closing connection for ${tenantSchema}:`, error);
	}
}

export async function closeAllTenantConnections(): Promise<void> {
	const closePromises = Array.from(sqlInstances.entries()).map(
		async ([schema, sql]) => {
			try {
				await sql.end();
				console.log(`🔒 Closed connection for schema: ${schema}`);
			} catch (error) {
				console.error(`❌ Error closing connection for ${schema}:`, error);
			}
		},
	);

	await Promise.all(closePromises);
	connections.clear();
	sqlInstances.clear();
	console.log("🔒 All tenant connections closed");
}

// Schema existence checker
export async function checkSchemaExists(
	tenantSchema: string,
): Promise<boolean> {
	try {
		const sql = postgres(connectionString);
		const result = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = ${tenantSchema}
      ) as exists
    `;
		await sql.end();
		return result[0]?.exists;
	} catch (error) {
		console.error(
			`❌ Error checking schema existence for ${tenantSchema}:`,
			error,
		);
		return false;
	}
}

// Graceful shutdown - TEMPORARILY DISABLED to prevent infinite loop
// TODO: Implement proper graceful shutdown without infinite loops
// process.on('SIGINT', closeAllTenantConnections)
// process.on('SIGTERM', closeAllTenantConnections)
// process.on('beforeExit', closeAllTenantConnections)
