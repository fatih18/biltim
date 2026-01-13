declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string
    // AuthV2 JWT Configuration
    JWT_SECRET: string
    JWT_EXPIRES_IN: string
    JWT_ISSUER: string
    JWT_AUDIENCE: string
    JWT_ALGORITHM: string
    JWT_REFRESH_SECRET: string
    JWT_REFRESH_EXPIRES_IN: string
    JWT_REFRESH_ISSUER: string
    JWT_REFRESH_AUDIENCE: string
    JWT_REFRESH_ALGORITHM: string

    // AuthV2 Cookie Configuration
    AUTH_V2_ACCESS_COOKIE_NAME: string
    AUTH_V2_REFRESH_COOKIE_NAME: string
    AUTH_V2_COOKIE_SAME_SITE: string

    // AuthV2 Session Store Configuration
    AUTH_V2_SESSION_STORE: string
    AUTH_V2_SESSION_PREFIX: string
    AUTH_V2_SESSION_TTL_SECONDS: string

    // Password Hashing
    BCRYPT_SALT_ROUNDS: string

    IS_MULTI_TENANT: string
    PORT: string
    GODMIN_EMAIL: string
    GODMIN_PASSWORD: string
    GODMIN_FIRST_NAME: string
    GODMIN_LAST_NAME: string
    SERVE_CLUSTERED: string
    NUCLEUS_APP_ID: string
    REMOTE_AGENT_API_KEY?: string
  }
}
