import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import { pgSchema, uuid, varchar } from "drizzle-orm/pg-core";
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
import { type CompanyJSON, columns as companyColumns } from "./company";
export const mainSchema = pgSchema("main");
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const tablename = "tenants";
export const available_app_ids = ["default_be"];
export const available_schemas = ["main"];
export const excluded_schemas = [];
export const columns = {
	...base,
	subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
	// company_id references a company in the tenant's own schema, not main.companies
	// So we store just the UUID without FK constraint (cross-schema FK)
	company_id: uuid("company_id").notNull(),
	schema_name: varchar("schema_name", { length: 100 }).notNull().unique(),
	// Denormalized company name for listing without cross-schema join
	company_name: varchar("company_name", { length: 255 }),
	// Denormalized godmin email for listing
	god_admin_email: varchar("god_admin_email", { length: 255 }),
};

// For main schema
export const T_Tenants = mainSchema.table(tablename, columns);
export const tenants = mainSchema.table(tablename, columns);

export const createTableForSchema = (schema: ReturnType<typeof pgSchema>) => {
	const companyTable = schema.table("companies", companyColumns);
	return schema.table(tablename, {
		...columns,
		company_id: uuid("company_id")
			.references(() => companyTable.id)
			.notNull(),
	});
};

export type Tenant = InferSelectModel<typeof T_Tenants>;

// TenantJSON now includes denormalized company_name and god_admin_email
// Company object is optional - only populated when cross-schema data is fetched
export type TenantJSON = InferSerializedSelectModel<typeof T_Tenants> & {
	company?: CompanyJSON;
};
export type Create = Omit<Tenant, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?:
		| DefaultOrderBy
		| "subdomain"
		| "schema_name"
		| "company_name"
		| "god_admin_email";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		subdomain?: string;
		schema_name?: string;
		company_name?: string;
		god_admin_email?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: TenantJSON[];
	pagination: Pagination;
};

export const store: TenantJSON | undefined = undefined;

// Note: company relation is cross-schema (company is in tenant's own schema, not main)
// So we cannot use standard FK-based relations. Company data should be fetched separately
// or denormalized into tenants table if needed for listing.
export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Tenants", columns, {
		fields: {
			extraFields: {
				company_name: {
					column: "company_name",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: true,
					operators: ["eq", "in", "ilike"],
				},
				god_admin_email: {
					column: "god_admin_email",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: false,
					operators: ["eq", "in", "ilike"],
				},
			},
		},
		// Cross-schema relations not supported via FK - company data fetched via custom query
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
