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
	uuid,
	jsonb,
	text,
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
 * Sunucu tarafı denetim taslağı.
 * Aynı ekipteki X kullanıcının başlattığı denetimi Y kullanıcı devam ettirebilsin diye
 * taslaklar plan bazında sunucuda saklanır (madde 13).
 */
export const tablename = "five_s_audit_drafts";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,

	// Bağlı denetim planı (plan başına tek taslak)
	plan_id: uuid("plan_id"),

	// Denetim başlık bilgileri (ekip, lokasyon, tarih, denetçi vb.)
	header: jsonb("header")
		.$type<Record<string, unknown>>()
		.notNull()
		.default(sql`'{}'::jsonb`),

	// Soru cevapları (questionId -> answer)
	answers: jsonb("answers")
		.$type<Record<string, unknown>>()
		.notNull()
		.default(sql`'{}'::jsonb`),

	// Taslağı en son güncelleyen kullanıcı
	updated_by_user_id: uuid("updated_by_user_id"),
	updated_by_name: text("updated_by_name"),
};

export const indexes = (_table: {
	plan_id: PgColumn;
	created_at: PgColumn;
	updated_by_user_id: PgColumn;
}) => [
	uniqueIndex("five_s_audit_drafts_plan_id_ux").on(_table.plan_id),
	index().on(_table.updated_by_user_id),
];

export const T_FiveSAuditDrafts = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type FiveSAuditDraft = InferSelectModel<typeof T_FiveSAuditDrafts>;
export type FiveSAuditDraftJSON = InferSerializedSelectModel<
	typeof T_FiveSAuditDrafts
>;

export type Create = Omit<FiveSAuditDraft, DefaultOmitted>;

export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy;
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		plan_id?: string | string[];
		updated_by_user_id?: string | string[];
	};
};

export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
	data: FiveSAuditDraftJSON[];
	pagination: Pagination;
};

export const store: FiveSAuditDraftJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_FiveSAuditDrafts", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 50,
		useDrizzleQuery: true,
		fields: {
			overrides: {
				plan_id: {
					type: "string",
					searchable: false,
					filterable: true,
					sortable: false,
					operators: ["eq", "in"],
				},
				updated_by_user_id: {
					type: "string",
					searchable: false,
					filterable: true,
					sortable: false,
					operators: ["eq", "in"],
				},
			},
		},
	});
