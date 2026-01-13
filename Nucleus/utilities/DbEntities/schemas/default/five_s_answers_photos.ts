import type { HybridSearchConfig } from "@monorepo/generics";
import type { InferSelectModel } from "drizzle-orm";
import {
	type PgColumn,
	type pgSchema,
	pgTable,
	text,
	uuid,
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

export const tablename = "five_s_answer_photos";
export const available_app_ids = ["default_be"];

export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	answer_id: uuid("answer_id").notNull(), // five_s_answers.id

	// Asıl dosya kaydı (files.id)
	file_id: uuid("file_id").notNull(),

	// Denormalize alanlar (rapor için)
	file_url: text("file_url").notNull(), // S3 / blob / public path
	original_name: text("original_name"),
	mime_type: text("mime_type"),
	file_size_bytes: integer("file_size_bytes"),
};

export const indexes = (_table: {
	is_active: PgColumn;
	created_at: PgColumn;
	answer_id: PgColumn;
}) => [
	// örnek
	// index("five_s_answer_photos_answer_idx").on(_table.answer_id),
];

export const T_FiveSAnswerPhotos = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type FiveSAnswerPhoto = InferSelectModel<typeof T_FiveSAnswerPhotos>;
export type FiveSAnswerPhotoJSON = InferSerializedSelectModel<
	typeof T_FiveSAnswerPhotos
>;
export type Create = Omit<FiveSAnswerPhoto, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy;
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		answer_id?: string | string[];
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: FiveSAnswerPhotoJSON[];
	pagination: Pagination;
};

export const store: FiveSAnswerPhotoJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig = {
	table_name: "T_FiveSAnswerPhotos",
	fields: {
		id: {
			column: "id",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
		is_active: {
			column: "is_active",
			type: "boolean",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq"],
		},
		created_at: {
			column: "created_at",
			type: "date",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["gte", "lte", "gt", "lt"],
		},
		updated_at: {
			column: "updated_at",
			type: "date",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["gte", "lte", "gt", "lt"],
		},
		answer_id: {
			column: "answer_id",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
		file_url: {
			column: "file_url",
			type: "string",
			searchable: false,
			filterable: false,
			sortable: false,
			operators: [],
		},
	},
	relations: [],
	fieldSelection: {},
	defaultOrderBy: "created_at",
	defaultOrderDirection: "asc",
	maxLimit: 100,
	useDrizzleQuery: true,
};
