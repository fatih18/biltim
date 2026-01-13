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
import {
    T_Users,
    type UserJSON,
    columns as userColumns,
    indexes as userIndexes,
} from "./user";
import {
    T_FiveSAuditTeams,
    type FiveSAuditTeamJSON,
    columns as teamColumns,
    indexes as teamIndexes,
} from "./five_s_audit_teams";

export const tablename = "five_s_audit_team_members";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
    ...base,
    team_id: uuid("team_id")
        .references(() => T_FiveSAuditTeams.id, { onDelete: "cascade" })
        .notNull(),
    user_id: uuid("user_id")
        .references(() => T_Users.id, { onDelete: "cascade" })
        .notNull(),
};

export const indexes = (table: {
    team_id: PgColumn;
    user_id: PgColumn;
    is_active: PgColumn;
    created_at: PgColumn;
}) => [
        unique("unique_team_member").on(table.team_id, table.user_id),
        index().on(table.team_id),
        index().on(table.user_id),
    ];

export const T_FiveSAuditTeamMembers = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
    const userTable = schema.table("users", userColumns, userIndexes);
    const teamTable = schema.table("five_s_audit_teams", teamColumns, teamIndexes);

    return schema.table(
        tablename,
        {
            ...columns,
            team_id: uuid("team_id")
                .references(() => teamTable.id, { onDelete: "cascade" })
                .notNull(),
            user_id: uuid("user_id")
                .references(() => userTable.id, { onDelete: "cascade" })
                .notNull(),
        },
        (table) => [
            unique("unique_team_member").on(table.team_id, table.user_id),
            index().on(table.team_id),
            index().on(table.user_id),
        ],
    );
}

export type FiveSAuditTeamMember = InferSelectModel<typeof T_FiveSAuditTeamMembers>;
export type FiveSAuditTeamMemberJSON = InferSerializedSelectModel<typeof T_FiveSAuditTeamMembers> & {
    team?: FiveSAuditTeamJSON;
    user?: UserJSON;
};

export type Create = Omit<FiveSAuditTeamMember, DefaultOmitted>;
export type Read = {
    page?: number;
    limit?: number;
    search?: string;
    orderBy?: DefaultOrderBy | "team_id" | "user_id";
    orderDirection?: OrderDirection;
    filters?: DefaultFilter & {
        team_id?: string;
        user_id?: string;
    };
    relations?: string[];
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
    data: FiveSAuditTeamMemberJSON[];
    pagination: Pagination;
};

export const store: FiveSAuditTeamMemberJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
    createHybridSearchConfigFromColumns("T_FiveSAuditTeamMembers", columns, {
        relations: inferBelongsToRelationsFromTable(T_FiveSAuditTeamMembers).filter(
            (r) => r.name === "team" || r.name === "user",
        ),
        fieldSelection: {},
        defaultOrderBy: "created_at",
        defaultOrderDirection: "desc",
        maxLimit: 100,
        useDrizzleQuery: true,
    });
