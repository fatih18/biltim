/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import type * as schemas from "@monorepo/db-entities/schemas";
import { getTenantDB } from "@monorepo/drizzle-manager";
import argon2 from "argon2";
import { and, eq, ilike, not } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { AddAuditLog, type AuditOperation } from "../Audit";
import { type EntityName, resolveEntity } from "./resolver";

export type { EntityName } from "./resolver";

// import { AddAuditLog, type AuditOperation } from "@/services/Audit";
import type { DbEntityWithId } from "./types";

// Schemas'dan dinamik olarak tipleri çıkar
type SchemaModules = typeof schemas;

// Her entity namespace'inden table'ı çıkar - sadece T_ ile başlayan property'leri al
type ExtractTable<T> =
	T extends Record<string, any>
		? T[keyof T & `T_${string}`] extends {
				$inferInsert: any;
				$inferSelect: any;
			}
			? T[keyof T & `T_${string}`]
			: never
		: never;

// Entity name'den table tipini map et
type EntityTableMap = {
	[K in EntityName]: ExtractTable<SchemaModules[K]>;
};

// Insert ve Select tiplerini çıkar
export type EntityInsertType<T extends EntityName> = EntityTableMap[T] extends {
	$inferInsert: infer I;
}
	? I
	: never;
type EntitySelectType<T extends EntityName> = EntityTableMap[T] extends {
	$inferSelect: infer S;
}
	? S
	: never;

export async function GenericAction<TEntityName extends EntityName>({
	schema_name,
	table_name,
	id,
	data,
	user_id,
	ip_address,
	user_agent,
	action_type,
	tx,
	bulk_mode = false,
	filter,
	filters,
	limit,
	skip_audit = false,
	skipPasswordHashing = false,
}: {
	schema_name: string;
	table_name: TEntityName;
	id?: string | string[];
	// Artık table_name'e göre otomatik tip çıkarımı yapılacak
	data?:
		| Partial<EntityInsertType<TEntityName>>
		| Partial<EntityInsertType<TEntityName>>[];
	user_id?: string | null;
	ip_address: string;
	user_agent: string;
	action_type:
		| "UPDATE"
		| "INSERT"
		| "DELETE"
		| "TOGGLE"
		| "GET"
		| "VERIFICATION";
	tx?: PgTransaction<any, any, any>;
	bulk_mode?: boolean;
	filter?: { column: string; value: string | number | boolean | Date };
	filters?: Array<{
		column: string;
		value: string | number | boolean | Date;
		op?: "eq" | "ilike";
	}>;
	limit?: number;
	skip_audit?: boolean;
	skipPasswordHashing?: boolean;
}): Promise<EntitySelectType<TEntityName>[] | undefined> {
	const db = tx || (await getTenantDB(schema_name));
	const resolvedTable = resolveEntity(table_name);
	const dbTable = resolvedTable as unknown as Parameters<
		(typeof db)["insert"]
	>[0];
	const entityColumns = resolvedTable as DbEntityWithId;
	const entityRecord = resolvedTable as Record<string, unknown>;
	const dbAny = db as any;
	let res: any[] | undefined;

	async function hashPasswordField<T extends Record<string, unknown>>(
		payload: T,
	): Promise<T> {
		// Skip password hashing if explicitly requested (e.g., for AuthV2 where password is already hashed)
		if (skipPasswordHashing) {
			return payload;
		}

		const rawPassword = payload.password;
		if (typeof rawPassword === "string") {
			const trimmedPassword = rawPassword.trim();
			if (trimmedPassword.length > 0) {
				const hashed = await argon2.hash(trimmedPassword);
				return {
					...payload,
					password: hashed,
				} as T;
			}
		}
		return payload;
	}

	if (bulk_mode) {
		// BULK İŞLEMLER
		if (action_type === "INSERT" && Array.isArray(data)) {
			const preparedData = (await Promise.all(
				data.map((item) => hashPasswordField(item as Record<string, unknown>)),
			)) as Array<Partial<EntityInsertType<TEntityName>>>;
			const bulkData = preparedData.map((item) => ({
				...item,
				is_active: true,
				created_at: new Date(),
				updated_at: new Date(),
			}));

			res = (await dbAny
				.insert(dbTable)
				.values(bulkData)
				.returning()) as EntitySelectType<TEntityName>[];
		}

		if (action_type === "UPDATE" && Array.isArray(data) && Array.isArray(id)) {
			const preparedData = (await Promise.all(
				data.map((item) => hashPasswordField(item as Record<string, unknown>)),
			)) as Array<Partial<EntityInsertType<TEntityName>>>;
			const updatePromises = preparedData.map((item, index) =>
				dbAny
					.update(dbTable)
					.set({
						...item,
						updated_at: new Date(),
					})
					.where(eq(entityColumns.id, id[index]))
					.returning(),
			);

			const results = await Promise.all(updatePromises);
			res = results.flat() as EntitySelectType<TEntityName>[];
		}

		if (action_type === "TOGGLE" && Array.isArray(id)) {
			const togglePromises = id.map((itemId) =>
				dbAny
					.update(dbTable)
					.set({
						is_active: not(entityColumns.is_active),
						updated_at: new Date(),
					})
					.where(eq(entityColumns.id, itemId))
					.returning(),
			);

			const results = await Promise.all(togglePromises);
			res = results.flat();
		}

		if (action_type === "DELETE" && Array.isArray(id)) {
			const deletePromises = id.map((itemId) =>
				dbAny.delete(dbTable).where(eq(entityColumns.id, itemId)).returning(),
			);

			const results = await Promise.all(deletePromises);
			res = results.flat();
		}
	} else {
		if (action_type === "GET") {
			let query: any = dbAny.select().from(dbTable);
			if (id) {
				query = query.where(eq(entityColumns.id, id as string));
			} else if ((filters?.length ?? 0) > 0) {
				const conds = (filters ?? [])
					.map((f) => {
						const col = entityRecord[f.column] as any;
						if (!col) return null;
						if (f.op === "ilike") {
							if (typeof f.value !== "string") return null;
							return ilike(col, f.value);
						}
						return eq(col, f.value as any);
					})
					.filter(Boolean) as any[];
				if (conds.length > 0) {
					query = query.where(conds.length === 1 ? conds[0] : and(...conds));
				}
			} else if (filter?.column) {
				const col = entityRecord[filter.column] as any;
				if (col) {
					query = query.where(eq(col, filter.value as any));
				}
			}
			if (typeof limit === "number") {
				query = query.limit(limit);
			}
			res = (await query) as EntitySelectType<TEntityName>[];
		}
		if (action_type === "UPDATE") {
			const preparedData = data
				? await hashPasswordField(data as Record<string, unknown>)
				: undefined;
			res = (await dbAny
				.update(dbTable)
				.set({
					...(preparedData as
						| Partial<EntityInsertType<TEntityName>>
						| undefined),
					updated_at: new Date(),
				})
				.where(eq(entityColumns.id, id))

				.returning()) as EntitySelectType<TEntityName>[];
		}

		if (action_type === "VERIFICATION") {
			// Generic verification handler: controller passes the appropriate verification fields
			res = (await dbAny
				.update(entityColumns)
				.set({
					...(data as any),
					updated_at: new Date(),
					verified_at: new Date(),
				})
				.where(eq(entityColumns.id, id))
				.returning()) as EntitySelectType<TEntityName>[];
		}

		if (action_type === "INSERT") {
			const preparedData = data
				? await hashPasswordField(data as Record<string, unknown>)
				: undefined;
			res = (await dbAny
				.insert(entityColumns)
				.values({
					...(preparedData as
						| Partial<EntityInsertType<TEntityName>>
						| undefined),
					is_active: true,
					created_at: new Date(),
					updated_at: new Date(),
				})
				.returning()) as EntitySelectType<TEntityName>[];
		}

		if (action_type === "TOGGLE") {
			res = (await dbAny
				.update(entityColumns)
				.set({
					is_active: not(entityColumns.is_active),
					updated_at: new Date(),
				})
				.where(eq(entityColumns.id, id))
				.returning()) as EntitySelectType<TEntityName>[];
		}

		if (action_type === "DELETE") {
			res = await dbAny
				.delete(entityColumns)
				.where(eq(entityColumns.id, id))
				.returning();
		}
	}

	// Audit logging
	if (res && res.length > 0 && !skip_audit) {
		const operation_types: { [key: string]: AuditOperation } = {
			UPDATE: "UPDATE",
			INSERT: "INSERT",
			DELETE: "DELETE",
			SOFT_DELETE: "SOFT_DELETE",
			ERROR: "ERROR",
			LOGIN: "LOGIN",
			TOGGLE: res[0]?.is_active ? "ACTIVATE" : "DEACTIVATE",
			VERIFICATION:
				(res[0] as any)?.verification_status === "approved"
					? "VERIFY"
					: (res[0] as any)?.verification_status === "rejected"
						? "REJECT"
						: "UNKNOWN",
		};

		if (bulk_mode) {
			const auditPromises = res.map((item, index) => {
				const itemId = item.id as string;
				const originalId = Array.isArray(id) ? id[index] : id;

				return AddAuditLog({
					input: {
						entity_id: itemId,
						entity_name: table_name.replace("T_", ""),
						operation_type: operation_types[action_type] || "UNKNOWN",
						new_values: [item],
						user_id: user_id || undefined,
						ip_address,
						user_agent,
						summary: `Entity: ${table_name.replace("T_", "")} with id: ${
							originalId || itemId
						}, operation: ${operation_types[action_type]}`,
					},
					schema_name: schema_name,
				});
			});

			await Promise.all(auditPromises);
		} else {
			const entityId = typeof id === "string" ? id : (res[0]?.id as string);

			await AddAuditLog({
				input: {
					entity_id: entityId,
					entity_name: table_name.replace("T_", ""),
					operation_type: operation_types[action_type] || "UNKNOWN",
					new_values: res,
					user_id: user_id || undefined,
					ip_address,
					user_agent,
					summary: `Entity: ${table_name.replace(
						"T_",
						"",
					)} with id: ${entityId}, operation: ${operation_types[action_type]}`,
				},
				schema_name: schema_name,
			});
		}
	}

	const filtered = res?.map((item) => {
		const { password: _, ...rest } = item;
		return rest;
	});

	return filtered as EntitySelectType<TEntityName>[];
}
