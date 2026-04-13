import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
  index,
  type PgColumn,
  type pgSchema,
  pgTable,
  uuid,
  varchar,
  date,
  text,
  integer,
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

  /**
   * Ana plan (parent) referansı.
   * null  => bu kayıt bir ana plandır (quarter tanımı)
   * dolu  => bu kayıt bir alt plandır; parent = ana plan
   */
  parent_plan_id: uuid("parent_plan_id"),

  /**
   * Quarter etiketi — sadece ana planlarda dolu.
   * Örn: "2025-Q2", "2025-Q3"
   */
  quarter: varchar("quarter", { length: 16 }),

  /** Ana planın kapsadığı tarih aralığı başlangıcı (sadece ana planlarda) */
  date_range_start: date("date_range_start"),

  /** Ana planın kapsadığı tarih aralığı bitişi (sadece ana planlarda) */
  date_range_end: date("date_range_end"),

  // Planlanan denetim günü (gün bazlı seçim için date ideal)
  planned_date: date("planned_date"),

  // Master data: locations tablosundan seçilecek (id) — alt planlarda zorunlu
  location_id: uuid("location_id"),

  // Audit team tablosundan seçilecek (id) — alt planlarda zorunlu
  assigned_team_id: uuid("assigned_team_id"),

  // plan status
  status: varchar("status", { length: 32 }).notNull().default("planned"),

  // Denetim tamamlanınca bağlanacak (nullable)
  audit_id: uuid("audit_id"),

  // Ana plan için açıklama/başlık (opsiyonel)
  title: text("title"),

  // Tarih kaç kez değiştirildi (max 2)
  date_change_count: integer("date_change_count").notNull().default(0),
};

export const indexes = (_table: {
  planned_date: PgColumn;
  location_id: PgColumn;
  assigned_team_id: PgColumn;
  status: PgColumn;
  created_at: PgColumn;
  audit_id: PgColumn;
  parent_plan_id: PgColumn;
  quarter: PgColumn;
}) => [
    index().on(_table.planned_date, _table.created_at),

    // Filtreler
    index().on(_table.location_id),
    index().on(_table.assigned_team_id),
    index().on(_table.status),
    index().on(_table.audit_id),
    index().on(_table.parent_plan_id),
    index().on(_table.quarter),
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
  | "created_at"
  | "quarter";
  orderDirection?: OrderDirection;
  filters?: DefaultFilter & {
    status?: string | string[];
    location_id?: string;
    assigned_team_id?: string;
    parent_plan_id?: string;
    quarter?: string;

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
    fields: {
      overrides: {
        quarter: { type: "string", searchable: false, filterable: true, sortable: true, operators: ["eq", "in"] },
        parent_plan_id: { type: "string", searchable: false, filterable: true, sortable: false, operators: ["eq", "in"] },
        date_range_start: { type: "date", searchable: false, filterable: true, sortable: true, operators: ["gte", "lte", "gt", "lt"] },
        date_range_end: { type: "date", searchable: false, filterable: true, sortable: true, operators: ["gte", "lte", "gt", "lt"] },
        title: { type: "string", searchable: true, filterable: false, sortable: false },
      },
    },
  });
