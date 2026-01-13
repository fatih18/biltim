import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	type PgColumn,
	type pgSchema,
	pgTable,
	text,
	uuid,
	varchar,
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

export const tablename = "cards";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

/**
 * Rarity Levels:
 * - common: Sıradan
 * - uncommon: Nadir
 * - rare: Çok Nadir
 * - epic: Epik
 * - legendary: Efsane (Lucifer, Michael, God gibi)
 */
export type CardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/**
 * Faction (Deste Türü):
 * - angel: Melek Destesi (Cennet ordusu)
 * - demon: Şeytan Destesi (Cehennem ordusu)
 * - human: İnsan Destesi (Avcılar, Mektup Adamları vs.)
 * - purgatory: Araf Destesi (Leviathan, Eve, Canavarlar)
 * - neutral: Nötr kartlar (her destede kullanılabilir)
 */
export type Faction = "angel" | "demon" | "human" | "purgatory" | "neutral";

/**
 * Category (Alt Kategori - Faction'a göre değişir):
 *
 * İnsan Destesi:
 * - hunter: Avcılar (Winchester'lar, Bobby, vb.)
 * - men_of_letters: Mektup Adamları
 * - prophet: Peygamberler (Kevin Tran, Chuck)
 * - psychic: Medyumlar (Missouri, Pamela)
 * - vessel: Kap/Vessel (Nick, Jimmy Novak)
 *
 * Melek Destesi:
 * - archangel: Baş Melekler (Michael, Lucifer, Gabriel, Raphael)
 * - seraph: Serafim (Castiel)
 * - guardian: Koruyucu Melekler
 * - fallen: Düşmüş Melekler
 * - cupid: Aşk Melekleri
 *
 * Şeytan Destesi:
 * - prince_of_hell: Cehennem Prensleri (Azazel, Ramiel, Asmodeus, Dagon)
 * - knight_of_hell: Cehennem Şövalyeleri (Cain, Abaddon)
 * - crossroad: Yol Kavşağı Şeytanları (Crowley)
 * - black_eyed: Siyah Gözlü Şeytanlar
 * - white_eyed: Beyaz Gözlü Şeytanlar (Lilith, Alastair)
 *
 * Araf Destesi:
 * - leviathan: Leviathanlar (Dick Roman)
 * - monster: Canavarlar (Vampir, Kurt Adam, vb.)
 * - ghost: Hayaletler
 * - reaper: Azrail/Ölüm Melekleri
 * - pagan: Pagan Tanrıları
 */
export type Category =
	// İnsan
	| "hunter"
	| "men_of_letters"
	| "prophet"
	| "psychic"
	| "vessel"
	// Melek
	| "archangel"
	| "seraph"
	| "guardian"
	| "fallen"
	| "cupid"
	// Şeytan
	| "prince_of_hell"
	| "knight_of_hell"
	| "crossroad"
	| "black_eyed"
	| "white_eyed"
	// Araf
	| "leviathan"
	| "monster"
	| "ghost"
	| "reaper"
	| "pagan";

/**
 * Species (Irk/Tür):
 * - human: İnsan
 * - angel: Melek
 * - demon: Şeytan
 * - vampire: Vampir
 * - werewolf: Kurt Adam
 * - shapeshifter: Şekil Değiştiren
 * - djinn: Cin
 * - witch: Cadı
 * - nephilim: Nefilim (Melek-İnsan melezi)
 * - cambion: Cambion (Şeytan-İnsan melezi)
 * - leviathan: Leviathan
 * - ghost: Hayalet
 * - deity: Tanrı/Tanrıça
 * - reaper: Azrail
 * - hellhound: Cehennem Köpeği
 */
export type Species =
	| "human"
	| "angel"
	| "demon"
	| "vampire"
	| "werewolf"
	| "shapeshifter"
	| "djinn"
	| "witch"
	| "nephilim"
	| "cambion"
	| "leviathan"
	| "ghost"
	| "deity"
	| "reaper"
	| "hellhound";

/**
 * Card Types (Kart Türleri):
 * - character: Karakter kartı (Sam, Dean, Castiel)
 * - spell: Büyü kartı (Exorcism, Banishing Sigil)
 * - artifact: Eser kartı (Colt, Angel Blade, Demon Knife)
 * - location: Mekan kartı (Bunker, Hell, Heaven)
 * - event: Olay kartı (Apocalypse, Deal with Devil)
 * - trap: Tuzak kartı (Devil's Trap, Holy Fire)
 */
export type CardType =
	| "character"
	| "spell"
	| "artifact"
	| "location"
	| "event"
	| "trap";

export const columns = {
	...base,
	// Temel bilgiler
	title: varchar("title", { length: 255 }).notNull(), // "Sam Winchester"
	subtitle: varchar("subtitle", { length: 255 }), // "Hunter - İnsan - Avcı"
	flavor_text: text("flavor_text"), // "Saving people, hunting things, the family business."

	// Hiyerarşi: Faction > Category > Species
	faction: varchar("faction", { length: 50 }).notNull(), // Faction: angel, demon, human, purgatory
	category: varchar("category", { length: 50 }).notNull(), // Category: hunter, archangel, prince_of_hell, etc.
	species: varchar("species", { length: 50 }).notNull(), // Species: human, angel, demon, vampire, etc.
	type: varchar("type", { length: 50 }).notNull(), // CardType: character, spell, artifact, etc.

	// Ek etiketler (birden fazla özellik için)
	tags: jsonb("tags").$type<string[]>().default([]), // ["vessel", "mark_of_cain", "demon_blood"]

	// Maliyet (Grace/Soul/Essence puanı)
	cost: integer("cost").notNull().default(0), // Kartı oynamak için gereken güç
	faction_cost: integer("faction_cost").default(0), // Faction'a özel maliyet

	// İstatistikler (character kartları için)
	power: integer("power"), // Saldırı gücü
	health: integer("health"), // Can puanı
	grace: integer("grace"), // Melek gücü (melekler için)
	soul: integer("soul"), // Ruh gücü (insanlar için)

	// Nadir seviyesi
	rarity: varchar("rarity", { length: 50 }).notNull().default("common"), // CardRarity

	// Set bilgisi
	set_code: varchar("set_code", { length: 10 }), // "S01" (Season 1)
	set_name: varchar("set_name", { length: 255 }), // "Supernatural: Season 1"
	card_number: integer("card_number"), // Set içindeki numara

	// Özel durumlar
	is_unique: boolean("is_unique").default(false), // Destede sadece 1 tane olabilir (Sam, Dean gibi)
	is_token: boolean("is_token").default(false), // Token kartlar
	is_collectible: boolean("is_collectible").default(true), // Koleksiyona eklenebilir mi

	// Görseller
	artist: varchar("artist", { length: 255 }),
	front_image_id: uuid("front_image_id"),
	back_image_id: uuid("back_image_id"),
	art_crop_id: uuid("art_crop_id"),
};

export const indexes = (_table: {
	title: PgColumn;
	faction: PgColumn;
	category: PgColumn;
	species: PgColumn;
	type: PgColumn;
	rarity: PgColumn;
}) => [
	index().on(_table.title),
	index().on(_table.faction),
	index().on(_table.category),
	index().on(_table.species),
	index().on(_table.type),
	index().on(_table.rarity),
];

export const T_Cards = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type Card = InferSelectModel<typeof T_Cards>;
export type CardJSON = InferSerializedSelectModel<typeof T_Cards>;
export type Create = Omit<Card, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?:
		| DefaultOrderBy
		| "title"
		| "cost"
		| "rarity"
		| "card_number"
		| "power"
		| "health";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		faction?: Faction;
		category?: Category;
		species?: Species;
		type?: CardType;
		rarity?: CardRarity;
		set_code?: string;
		is_unique?: boolean;
		is_token?: boolean;
		cost_min?: number;
		cost_max?: number;
		power_min?: number;
		health_min?: number;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: CardJSON[];
	pagination: Pagination;
};

export const store: CardJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Cards", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
