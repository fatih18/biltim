import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
  index,
  integer,
  type PgColumn,
  type pgSchema,
  pgTable,
  timestamp,
  varchar,
  uuid,
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

export const tablename = "board_meeting_decisions";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
  ...base,

  // Kurul toplantısının tarihi
  meeting_date: timestamp("meeting_date", { withTimezone: false }).notNull(),

  item_no: integer("item_no").generatedByDefaultAsIdentity().notNull(),

  // Madde açıklaması
  item_description: varchar("item_description", { length: 1000 }).notNull(),

  status: varchar("status", { length: 50 }).notNull().default("open"),

  assigned_user_id: uuid("assigned_user_id"),
};

export const indexes = (_table: {
  meeting_date: PgColumn;
  status: PgColumn;
  created_at: PgColumn;
  assigned_user_id: PgColumn;
}) => [
    index().on(_table.meeting_date, _table.created_at),
    index().on(_table.status),
    index().on(_table.assigned_user_id),
  ];

export const T_BoardMeetingDecisions = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
  return schema.table(tablename, columns, indexes);
}

export type BoardMeetingDecision = InferSelectModel<typeof T_BoardMeetingDecisions>;
export type BoardMeetingDecisionJSON = InferSerializedSelectModel<typeof T_BoardMeetingDecisions>;

// Create tipi
export type Create = Omit<BoardMeetingDecision, DefaultOmitted>;

// Listeleme / okuma parametreleri
export type Read = {
  page?: number;
  limit?: number;
  search?: string;
  orderBy?:
  | DefaultOrderBy
  | "meeting_date"
  | "item_no"
  | "status"
  | "created_at"
  | "assigned_user_id";
  orderDirection?: OrderDirection;
  filters?: DefaultFilter & {
    status?: string;

    meeting_date_from?: string; // "YYYY-MM-DD"
    meeting_date_to?: string; // "YYYY-MM-DD"

    // ✅ istersen filtre:
    assigned_user_id?: string;
  };
};

export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
  data: BoardMeetingDecisionJSON[];
  pagination: Pagination;
};

export const store: BoardMeetingDecisionJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
  createHybridSearchConfigFromColumns("T_BoardMeetingDecisions", columns, {
    relations: [],
    fieldSelection: {},
    defaultOrderBy: "meeting_date",
    defaultOrderDirection: "desc",
    maxLimit: 100,
    useDrizzleQuery: true,
  });
