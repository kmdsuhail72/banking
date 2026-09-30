import { DataSourceOptions } from "typeorm";

/**
 * Builds the TypeORM DataSourceOptions from environment variables.
 * Used in every service's TypeOrmModule.forRoot(...) call.
 *
 * Required env vars:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
 * Optional:
 *   DB_SSL (true/false)
 *   DB_POOL_SIZE (default 10)
 *   NODE_ENV
 */
export function buildTypeOrmConfig(
  extraEntities: any[] = [],
): DataSourceOptions {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "banking",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "postgres",
    entities: extraEntities,
    // Auto-sync only in dev; use migrations in production
    synchronize: !isProduction,
    migrations: isProduction ? ["dist/migrations/*.js"] : [],
    migrationsRun: isProduction,
    logging: process.env.DB_LOGGING === "true" ? ["query", "error"] : ["error"],
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    extra: {
      max: parseInt(process.env.DB_POOL_SIZE || "10", 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    },
  };
}
