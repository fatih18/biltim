export interface RedisConfig {
	/** Redis host adresi */
	host: string;
	/** Redis port numarası */
	port: number;
	/** Redis şifresi (opsiyonel) */
	password?: string;
	/** Redis veritabanı numarası (opsiyonel, varsayılan: 0) */
	db?: number;
}

export interface SetOptions {
	/** Cache süresi (saniye) */
	ttl?: number;
	/** NX: Key yoksa set et, XX: Key varsa set et */
	mode?: "NX" | "XX";
}
