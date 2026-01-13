import type { T_Audit } from "@monorepo/db-entities/schemas/default/audit";
import { getTenantDB } from "@monorepo/drizzle-manager";
import type { InferInsertModel } from "drizzle-orm";
import { resolveEntity } from "../GenericAction/resolver";

export type AuditOperation =
	| "INSERT"
	| "UPDATE"
	| "DELETE"
	| "SOFT_DELETE"
	| "LOGIN"
	| "ERROR"
	| "DEACTIVATE"
	| "ACTIVATE"
	| "UNKNOWN"
	| "VERIFY"
	| "REJECT";

export type AuditLogInput = Omit<
	InferInsertModel<typeof T_Audit>,
	"id" | "timestamp"
> & {
	operation_type: AuditOperation;
	user_id?: string;
	entity_id?: string;
};

export async function AddAuditLog({
	input,
	schema_name = "main",
}: {
	input: AuditLogInput;
	schema_name?: string;
}): Promise<void> {
	try {
		const db = await getTenantDB(schema_name);
		const dbAny = db as unknown as {
			_: { schema?: Record<string, unknown> };
			insert: typeof db.insert;
		};
		try {
			const schemaTables = dbAny._?.schema as
				| Record<string, unknown>
				| undefined;
			const schemaValue = schemaTables?.T_Audit;
			const wrappedTable =
				schemaValue && typeof schemaValue === "object" && schemaValue !== null
					? "table" in schemaValue
						? (schemaValue as { table: Parameters<(typeof db)["insert"]>[0] })
								.table
						: (schemaValue as Parameters<(typeof db)["insert"]>[0])
					: undefined;
			const fallbackTable = resolveEntity("T_Audit");
			const candidate = wrappedTable as
				| Parameters<(typeof db)["insert"]>[0]
				| undefined;
			const hasColumns =
				candidate && typeof candidate === "object" && candidate !== null
					? "_" in candidate
					: false;
			const auditTable = (hasColumns ? candidate : fallbackTable) as Parameters<
				(typeof db)["insert"]
			>[0];
			if (!auditTable) {
				console.warn(
					`⚠️ Tenant schema ${schema_name} missing T_Audit table; skipping audit log insertion.`,
				);
				return;
			}
			await db.insert(auditTable).values(input);
		} catch (insertError) {
			console.error(
				`❌ Failed to insert audit log for schema ${schema_name}:`,
				insertError,
			);
			throw new Error(`Audit log insertion failed: ${insertError}`);
		}
	} catch (error) {
		console.error(
			`❌ Failed to add audit log for schema ${schema_name}:`,
			error,
		);
		console.error(`⚠️  Audit log creation failed but continuing operation`);
	}
}
