import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
  index,
  uniqueIndex,
  type PgColumn,
  type pgSchema,
  pgTable,
  uuid,
  varchar,
  date,
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

/**
 * Plan kaydı = "Şu tarihte, şu lokasyonda, şu ekip denetim yapacak"
 * Audit tamamlanınca audit_id doldurulur.
 */
export const tablename = "five_s_audit_plans";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

/**
 * Status önerisi:
 * planned: plan oluşturuldu
 * completed: denetim tamamlandı (genelde audit_id doludur)
 * cancelled: iptal edildi
 */
export const columns = {
  ...base,

  // Planlanan denetim günü (gün bazlı seçim için date ideal)
  planned_date: date("planned_date").notNull(),

  // Master data: locations tablosundan seçilecek (id)
  location_id: uuid("location_id").notNull(),

  // Audit team tablosundan seçilecek (id)
  assigned_team_id: uuid("assigned_team_id").notNull(),

  // plan status
  status: varchar("status", { length: 32 }).notNull().default("planned"),

  // Denetim tamamlanınca bağlanacak (nullable)
  audit_id: uuid("audit_id"),
};

export const indexes = (_table: {
  planned_date: PgColumn;
  location_id: PgColumn;
  assigned_team_id: PgColumn;
  status: PgColumn;
  created_at: PgColumn;
  audit_id: PgColumn;
}) => [
    /**
     * Aynı gün + aynı lokasyonda birden fazla plan olamaz
     * (planned_date, location_id) unique.
     *
     */
    uniqueIndex(`${tablename}_planned_date_location_uq`).on(
      _table.planned_date,
      _table.location_id
    ),

    index().on(_table.planned_date, _table.created_at),

    // Filtreler
    index().on(_table.location_id),
    index().on(_table.assigned_team_id),
    index().on(_table.status),

    index().on(_table.audit_id),
  ];

export const T_FiveSAuditPlans = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
  return schema.table(tablename, columns, indexes);
}

export type FiveSAuditPlan = InferSelectModel<typeof T_FiveSAuditPlans>;
export type FiveSAuditPlanJSON = InferSerializedSelectModel<typeof T_FiveSAuditPlans>;

// Create tipi: base’ten DefaultOmitted olanları çıkarıyoruz (id, created_at vs)
export type Create = Omit<FiveSAuditPlan, DefaultOmitted>;

// Listeleme / okuma parametreleri
export type Read = {
  page?: number;
  limit?: number;
  search?: string;
  orderBy?:
  | DefaultOrderBy
  | "planned_date"
  | "location_id"
  | "assigned_team_id"
  | "status"
  | "created_at";
  orderDirection?: OrderDirection;
  filters?: DefaultFilter & {
    status?: string;
    location_id?: string;
    assigned_team_id?: string;

    planned_date_from?: string; // "YYYY-MM-DD"
    planned_date_to?: string; // "YYYY-MM-DD"

    // audit_id dolu/dolu değil gibi filtre ihtiyacı olursa:
    has_audit?: boolean;
  };
};

export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
  data: FiveSAuditPlanJSON[];
  pagination: Pagination;
};

export const store: FiveSAuditPlanJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
  createHybridSearchConfigFromColumns("T_FiveSAuditPlans", columns, {
    relations: [],
    fieldSelection: {},
    defaultOrderBy: "planned_date",
    defaultOrderDirection: "desc",
    maxLimit: 200,
    useDrizzleQuery: true,
  });
