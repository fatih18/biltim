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
import { T_Cards } from "./card";

export const tablename = "card_abilities";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

/**
 * Ability Types:
 * - triggered: Otomatik tetiklenir (when X happens, do Y)
 * - activated: Manuel aktive edilir (pay X, do Y)
 * - static: Pasif etki (her zaman aktif)
 * - keyword: Özel anahtar kelime (flying, trample, etc.)
 */
export type AbilityType = "triggered" | "activated" | "static" | "keyword";

/**
 * Trigger Conditions (triggered abilities için):
 * - on_summon: Kart sahaya çağrıldığında
 * - on_death: Kart öldüğünde
 * - on_attack: Kart saldırdığında
 * - on_defend: Kart savunma yaptığında
 * - on_damage_dealt: Kart hasar verdiğinde
 * - on_damage_taken: Kart hasar aldığında
 * - on_turn_start: Tur başında
 * - on_turn_end: Tur sonunda
 * - on_spell_cast: Büyü yapıldığında
 * - on_ally_death: Dost karakter öldüğünde
 * - on_enemy_death: Düşman karakter öldüğünde
 * - on_exorcism: Exorcism yapıldığında
 * - on_possession: Possess edildiğinde
 * - on_resurrection: Diriltildiğinde
 */
export type TriggerCondition =
	| "on_summon"
	| "on_death"
	| "on_attack"
	| "on_defend"
	| "on_damage_dealt"
	| "on_damage_taken"
	| "on_turn_start"
	| "on_turn_end"
	| "on_spell_cast"
	| "on_ally_death"
	| "on_enemy_death"
	| "on_exorcism"
	| "on_possession"
	| "on_resurrection"
	| "none";

/**
 * Cost Types (activated abilities için):
 * - grace: Grace puanı harcama (Melekler)
 * - soul: Soul puanı harcama (İnsanlar)
 * - essence: Essence puanı harcama (Genel)
 * - exhaust: Kartı exhaust etme (kullanılamaz hale getir)
 * - sacrifice: Kartı veya başka kartı feda etme
 * - discard: El kartı atma
 * - health: Can puanı harcama
 * - banish: Kartı sürgün etme (Purgatory'e gönder)
 */
export type CostType =
	| "grace"
	| "soul"
	| "essence"
	| "exhaust"
	| "sacrifice"
	| "discard"
	| "health"
	| "banish"
	| "none";

/**
 * Effect Types:
 * - smite: Kutsal hasar (Meleklere karşı etkili)
 * - hellfire: Cehennem ateşi hasarı (Şeytanlara karşı etkili)
 * - damage: Normal hasar
 * - heal: Can yenile
 * - draw: Kart çek
 * - discard: Kart attır
 * - buff_power: Güç artır
 * - buff_health: Can artır
 * - debuff_power: Güç azalt
 * - debuff_health: Can azalt
 * - destroy: Yok et
 * - banish: Purgatory'e sürgün et
 * - exorcise: Şeytanı kovma (Demon'ları yok et)
 * - resurrect: Dirilt (mezarlıktan geri getir)
 * - summon: Token çağır
 * - possess: Ele geçir (kontrol al)
 * - counter: Büyü iptal et
 * - exhaust: Exhaust et
 * - ready: Ready et (exhaust'tan çıkar)
 * - gain_grace: Grace kazan
 * - gain_soul: Soul kazan
 * - steal: Çal (el kartı veya sahadan)
 * - copy: Kopyala
 * - return_hand: Ele döndür
 * - return_deck: Desteye döndür
 * - trap: Tuzağa düşür (Devil's Trap gibi)
 * - protect: Koruma ver
 * - immune: Bağışıklık ver
 */
export type EffectType =
	| "smite"
	| "hellfire"
	| "damage"
	| "heal"
	| "draw"
	| "discard"
	| "buff_power"
	| "buff_health"
	| "debuff_power"
	| "debuff_health"
	| "destroy"
	| "banish"
	| "exorcise"
	| "resurrect"
	| "summon"
	| "possess"
	| "counter"
	| "exhaust"
	| "ready"
	| "gain_grace"
	| "gain_soul"
	| "steal"
	| "copy"
	| "return_hand"
	| "return_deck"
	| "trap"
	| "protect"
	| "immune";

/**
 * Target Types:
 * - self: Kendisi
 * - owner: Kart sahibi (oyuncu)
 * - opponent: Rakip oyuncu
 * - target_creature: Seçilen yaratık
 * - target_any: Seçilen herhangi bir hedef
 * - all_creatures: Tüm yaratıklar
 * - all_enemy_creatures: Tüm düşman yaratıklar
 * - all_friendly_creatures: Tüm dost yaratıklar
 * - random_enemy: Rastgele düşman
 * - random_friendly: Rastgele dost
 * - all_players: Tüm oyuncular
 */
export type TargetType =
	| "self"
	| "owner"
	| "opponent"
	| "target_creature"
	| "target_any"
	| "all_creatures"
	| "all_enemy_creatures"
	| "all_friendly_creatures"
	| "random_enemy"
	| "random_friendly"
	| "all_players";

/**
 * Duration Types:
 * - instant: Anlık etki
 * - until_end_of_turn: Tur sonuna kadar
 * - permanent: Kalıcı
 * - x_turns: X tur boyunca
 */
export type DurationType =
	| "instant"
	| "until_end_of_turn"
	| "permanent"
	| "x_turns";

/**
 * Keyword Abilities (Supernatural temalı):
 *
 * Genel:
 * - swift: Hızlı - çağrıldığı tur saldırabilir
 * - vigilant: Dikkatli - saldırınca exhaust olmaz
 * - immortal: Ölümsüz - yok edilemez (ancak banish edilebilir)
 * - hidden: Gizli - hedef alınamaz
 * - guardian: Koruyucu - saldıramaz ama bloklayabilir
 *
 * Faction Özel:
 * - angelic: Melek - Demon'lara +2 hasar
 * - demonic: Şeytani - Angel'lara +2 hasar
 * - hunter_trained: Avcı Eğitimli - Monster'lara +2 hasar
 * - leviathan_blood: Leviathan Kanı - Tüm hasarı 1 azaltır
 *
 * Özel Yetenekler:
 * - vessel: Kap - Melek veya Şeytan tarafından possess edilebilir
 * - teleport: Işınlanma - Saldırıyı atlayabilir
 * - regenerate: Yenilenme - Tur sonunda 1 can kazanır
 * - soul_eater: Ruh Yiyici - Öldürdüğü karakterden +1 soul kazanır
 * - holy_fire: Kutsal Ateş - Verdiği hasar heal edilemez
 * - demon_deal: Şeytan Anlaşması - Ölünce sahibine 2 hasar verir
 * - prophet_vision: Kehanet - Desteye bakabilir
 * - resurrection: Diriliş - Bir kez mezarlıktan döner
 */
export type KeywordAbility =
	// Genel
	| "swift"
	| "vigilant"
	| "immortal"
	| "hidden"
	| "guardian"
	// Faction Özel
	| "angelic"
	| "demonic"
	| "hunter_trained"
	| "leviathan_blood"
	// Özel Yetenekler
	| "vessel"
	| "teleport"
	| "regenerate"
	| "soul_eater"
	| "holy_fire"
	| "demon_deal"
	| "prophet_vision"
	| "resurrection";

// Ek effect verileri için JSON yapısı
export interface AbilityEffectData {
	// Summon için token bilgisi
	token_power?: number;
	token_health?: number;
	token_name?: string;
	token_faction?: string;
	token_species?: string;
	// Koşullu efektler
	condition?: {
		type:
			| "if_character_died"
			| "if_spell_cast"
			| "if_low_health"
			| "if_high_grace"
			| "if_demon_present"
			| "if_angel_present"
			| "if_hunter_present";
		value?: number;
	};
	// Çoklu efekt için
	secondary_effect?: {
		type: EffectType;
		value: number;
		target: TargetType;
	};
	// Faction hedefleme
	target_faction?: string;
	target_species?: string;
	// X değişkeni
	x_multiplier?:
		| "grace_spent"
		| "soul_spent"
		| "characters_count"
		| "cards_in_hand"
		| "graveyard_count"
		| "demons_in_play"
		| "angels_in_play";
}

export const columns = {
	...base,
	card_id: uuid("card_id")
		.references(() => T_Cards.id, { onDelete: "cascade" })
		.notNull(),

	// Temel bilgiler
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description").notNull(), // Oyuncuya gösterilecek açıklama

	// Yetenek türü
	ability_type: varchar("ability_type", { length: 50 }).notNull(), // AbilityType
	keyword: varchar("keyword", { length: 50 }), // KeywordAbility (sadece keyword type için)

	// Tetiklenme koşulu (triggered için)
	trigger_condition: varchar("trigger_condition", { length: 50 }), // TriggerCondition

	// Maliyet (activated için)
	cost_type: varchar("cost_type", { length: 50 }), // CostType
	cost_value: integer("cost_value").default(0), // Maliyet miktarı
	requires_tap: boolean("requires_tap").default(false), // Tap maliyeti var mı

	// Efekt
	effect_type: varchar("effect_type", { length: 50 }), // EffectType
	effect_value: integer("effect_value").default(0), // Efekt miktarı
	target_type: varchar("target_type", { length: 50 }), // TargetType

	// Süre
	duration: varchar("duration", { length: 50 }).default("instant"), // DurationType
	duration_turns: integer("duration_turns"), // x_turns için tur sayısı

	// Ek veriler (JSON olarak)
	effect_data: jsonb("effect_data").$type<AbilityEffectData>(),

	// Sıralama (birden fazla yetenek için)
	sort_order: integer("sort_order").default(0),

	// Aktif/Pasif
	is_mandatory: boolean("is_mandatory").default(true), // Zorunlu mu (may vs must)
};

export const indexes = (_table: {
	card_id: PgColumn;
	ability_type: PgColumn;
}) => [index().on(_table.card_id), index().on(_table.ability_type)];

export const T_CardAbilities = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type CardAbility = InferSelectModel<typeof T_CardAbilities>;
export type CardAbilityJSON = InferSerializedSelectModel<
	typeof T_CardAbilities
>;
export type Create = Omit<CardAbility, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "name" | "sort_order";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		card_id?: string;
		ability_type?: AbilityType;
		trigger_condition?: TriggerCondition;
		effect_type?: EffectType;
		keyword?: KeywordAbility;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: CardAbilityJSON[];
	pagination: Pagination;
};

export const store: CardAbilityJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_CardAbilities", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "sort_order",
		defaultOrderDirection: "asc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
