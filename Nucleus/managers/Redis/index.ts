import { createClient } from "redis";
import type { RedisConfig, SetOptions } from "./types";

// Varsayılan değerler
const DEFAULT_CONFIG: RedisConfig = {
	host: process.env.REDIS_HOST || "localhost",
	port: Number(process.env.REDIS_PORT) || 6379,
	// password: process.env.REDIS_PASSWORD,
	db: Number(process.env.REDIS_DB) || 0,
};

// Redis client instance
let client: ReturnType<typeof createClient> | null = null;
let isInitialized = false;

/**
 * Redis client'ı başlatır
 * @param config Redis bağlantı ayarları
 */
async function init(config: RedisConfig = DEFAULT_CONFIG): Promise<void> {
	if (isInitialized) return;

	try {
		client = createClient({
			socket: {
				host: config.host,
				port: config.port,
			},
			// password: config.password,
			database: config.db,
		});

		await client.connect();
		isInitialized = true;
	} catch (error) {
		console.error("Redis bağlantı hatası:", error);
		throw error;
	}
}

/**
 * Redis'e veri yazar
 * @param key Anahtar
 * @param value Değer
 * @param options Set seçenekleri
 */
export async function set(
	key: string,
	value: unknown,
	options?: SetOptions,
): Promise<"OK" | null> {
	if (!isInitialized) await init();
	if (!client) throw new Error("Redis client is not initialized");

	try {
		const serializedValue =
			typeof value === "string" ? value : JSON.stringify(value);

		const result = options?.ttl
			? options.mode === "NX"
				? await client.set(key, serializedValue, {
						NX: true,
						EX: options.ttl,
					})
				: options.mode === "XX"
					? await client.set(key, serializedValue, {
							XX: true,
							EX: options.ttl,
						})
					: await client.set(key, serializedValue, {
							EX: options.ttl,
						})
			: options?.mode === "NX"
				? await client.set(key, serializedValue, { NX: true })
				: options?.mode === "XX"
					? await client.set(key, serializedValue, { XX: true })
					: await client.set(key, serializedValue);

		return result === "OK" ? "OK" : null;
	} catch (error) {
		console.error("Redis set hatası:", error);
		throw error;
	}
}

/**
 * Redis'ten veri okur
 * @param key Anahtar
 * @returns Değer veya null
 */
export async function get<T = string>(key: string): Promise<T | null> {
	if (!isInitialized) await init();
	if (!client) throw new Error("Redis client is not initialized");

	try {
		const value = await client.get(key);
		if (!value) return null;

		try {
			return JSON.parse(value) as T;
		} catch {
			return value as unknown as T;
		}
	} catch (error) {
		console.error("Redis get hatası:", error);
		throw error;
	}
}

/**
 * Redis'ten veri siler
 * @param key Anahtar
 * @returns Silinen key sayısı
 */
export async function del(key: string): Promise<number> {
	if (!isInitialized) await init();
	if (!client) throw new Error("Redis client is not initialized");

	try {
		return await client.del(key);
	} catch (error) {
		console.error("Redis del hatası:", error);
		throw error;
	}
}

/**
 * Key'in TTL süresini getirir
 * @param key Anahtar
 * @returns TTL süresi (saniye) veya -1 (süresiz) ya da -2 (key yok)
 */
export async function ttl(key: string): Promise<number> {
	if (!isInitialized) await init();
	if (!client) throw new Error("Redis client is not initialized");

	try {
		return await client.ttl(key);
	} catch (error) {
		console.error("Redis TTL hatası:", error);
		throw error;
	}
}

/**
 * Key'in var olup olmadığını kontrol eder
 * @param key Anahtar
 * @returns Key varsa true, yoksa false
 */
export async function exists(key: string): Promise<boolean> {
	if (!isInitialized) await init();
	if (!client) throw new Error("Redis client is not initialized");

	try {
		return (await client.exists(key)) === 1;
	} catch (error) {
		console.error("Redis exists hatası:", error);
		throw error;
	}
}

/**
 * Pattern'e uyan tüm keyleri getirir
 * @param pattern Pattern (örn: user:*)
 * @returns Key listesi
 */
export async function keys(pattern: string): Promise<string[]> {
	if (!isInitialized) await init();
	if (!client) throw new Error("Redis client is not initialized");

	try {
		return await client.keys(pattern);
	} catch (error) {
		console.error("Redis keys hatası:", error);
		throw error;
	}
}

/**
 * Redis bağlantısını kapatır
 */
export async function disconnect(): Promise<void> {
	if (!client) return;

	try {
		await client.quit();
		client = null;
		isInitialized = false;
	} catch (error) {
		console.error("Redis disconnect hatası:", error);
		throw error;
	}
}
