import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
    index,
    uniqueIndex,
    type PgColumn,
    type pgSchema,
    pgTable,
    boolean,
    varchar,
    uuid,
    jsonb,
} from "drizzle-orm/pg-core";
import type {
    DefaultFilter,
    DefaultOmitted,
    DefaultOrderBy,
    GenericMethods,
    InferSerializedSelectModel,
    OrderDirection,
    Pagination,
} from "../../types/shared";
import { base } from "./base";

export const tablename = "five_s_locations";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
    ...base,

    name: varchar("name", { length: 255 }).notNull(),
    is_active: boolean("is_active").notNull().default(true),

    manager_user_id: uuid("manager_user_id"),

    field_manager_user_ids: jsonb("field_manager_user_ids")
        .$type<string[]>()
        .notNull()
        .default(sql`'[]'::jsonb`),
};

export const indexes = (_table: {
    name: PgColumn;
    is_active: PgColumn;
    created_at: PgColumn;
    manager_user_id: PgColumn;
}) => [
        index().on(_table.is_active, _table.created_at),
        index().on(_table.manager_user_id),
    ];

export const T_FiveSLocations = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
    return schema.table(tablename, columns, indexes);
}

export type FiveSLocation = InferSelectModel<typeof T_FiveSLocations>;
export type FiveSLocationJSON = InferSerializedSelectModel<typeof T_FiveSLocations>;

export type Create = Omit<FiveSLocation, DefaultOmitted>;

export type Read = {
    page?: number;
    limit?: number;
    search?: string;
    orderBy?: DefaultOrderBy | "name" | "is_active" | "created_at";
    orderDirection?: OrderDirection;
    filters?: DefaultFilter & {
        is_active?: boolean;
        manager_user_id?: string;
    };
};

export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
    data: FiveSLocationJSON[];
    pagination: Pagination;
};

export const store: FiveSLocationJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
    createHybridSearchConfigFromColumns("T_FiveSLocations", columns, {
        relations: [],
        fieldSelection: {},
        defaultOrderBy: "created_at",
        defaultOrderDirection: "desc",
        maxLimit: 100,
        useDrizzleQuery: true,
    });
