import type { AnyColumn } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";

export type DbEntityWithId = AnyPgTable &
	Record<string, AnyColumn> & {
		id: AnyColumn;
		is_active: AnyColumn;
	};
