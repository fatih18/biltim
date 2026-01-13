import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
    index,
    type PgColumn,
    type pgSchema,
    pgTable,
    unique,
    uuid,
    text,
} from "drizzle-orm/pg-core";
import { inferBelongsToRelationsFromTable } from "../../../Generics/GenericSearch/autoRelations";
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
import { T_Users, type UserJSON, columns as userColumns, indexes as userIndexes } from "./user";

export const tablename = "five_s_audit_teams";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
    ...base,
    name: text("name"), // opsiyonel
    leader_user_id: uuid("leader_user_id")
        .references(() => T_Users.id, { onDelete: "restrict" })
        .notNull(),
};

export const indexes = (table: {
    name: PgColumn;
    leader_user_id: PgColumn;
    is_active: PgColumn;
    created_at: PgColumn;
}) => [
        index().on(table.leader_user_id),
        index().on(table.created_at),
        // istersen isim unique olsun:
        // unique("unique_team_name").on(table.name),
    ];

export const T_FiveSAuditTeams = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
    const userTable = schema.table("users", userColumns, userIndexes);

    return schema.table(
        tablename,
        {
            ...columns,
            leader_user_id: uuid("leader_user_id")
                .references(() => userTable.id, { onDelete: "restrict" })
                .notNull(),
        },
        (table) => [
            index().on(table.leader_user_id),
            index().on(table.created_at),
            // unique("unique_team_name").on(table.name),
        ],
    );
}

export type FiveSAuditTeam = InferSelectModel<typeof T_FiveSAuditTeams>;
export type FiveSAuditTeamJSON = InferSerializedSelectModel<typeof T_FiveSAuditTeams> & {
    leader?: UserJSON;
};

export type Create = Omit<FiveSAuditTeam, DefaultOmitted>;
export type Read = {
    page?: number;
    limit?: number;
    search?: string;
    orderBy?: DefaultOrderBy | "name" | "leader_user_id";
    orderDirection?: OrderDirection;
    filters?: DefaultFilter & {
        leader_user_id?: string;
    };
    relations?: string[];
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
    data: FiveSAuditTeamJSON[];
    pagination: Pagination;
};

export const store: FiveSAuditTeamJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
    createHybridSearchConfigFromColumns("T_FiveSAuditTeams", columns, {
        fields: {
            extraFields: {
                leader_name: {
                    column: "full_name",
                    type: "string",
                    searchable: true,
                    filterable: true,
                    sortable: false,
                    operators: ["eq", "in", "ilike"],
                    fromRelation: "leader",
                },
                leader_email: {
                    column: "email",
                    type: "string",
                    searchable: true,
                    filterable: true,
                    sortable: false,
                    operators: ["eq", "in", "ilike"],
                    fromRelation: "leader",
                },
            },
        },
        relations: inferBelongsToRelationsFromTable(T_FiveSAuditTeams).filter(
            (r) => r.name === "leader",
        ),
        fieldSelection: {},
        defaultOrderBy: "created_at",
        defaultOrderDirection: "desc",
        maxLimit: 100,
        useDrizzleQuery: true,
    });
