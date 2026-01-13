import * as schemas from "@monorepo/db-entities/schemas";
import type { DbEntityWithId } from "./types";

type Schemas = typeof schemas;
export type EntityName = Extract<keyof Schemas, string>;

export function resolveEntity(name: EntityName): DbEntityWithId {
	const modules = schemas as Record<string, object>;
	const ns = modules[name] as Record<string, DbEntityWithId> | undefined;
	const table = ns ? ns[name] : undefined;
	if (!table) {
		throw new Error(`Entity not found for name: ${name}`);
	}
	return table;
}
