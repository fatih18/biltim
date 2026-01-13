import { boolean, timestamp, uuid } from "drizzle-orm/pg-core";

export const base = {
	id: uuid("id").primaryKey().defaultRandom(),
	is_active: boolean("is_active").notNull().default(true), // Soft delete via is_active
	created_at: timestamp("created_at").defaultNow().notNull(),
	updated_at: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date()),
};
