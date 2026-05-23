import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { env } from "./env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = new URL(env.DATABASE_URL);
const sslmode = url.searchParams.get("sslmode") ?? "disable";
url.searchParams.delete("sslmode");
url.searchParams.delete("sslrootcert");

const sslConfig = sslmode === "disable"
  ? false
  : {
      ca: readFileSync(env.PG_CA_PATH, "utf8"),
      rejectUnauthorized: sslmode === "verify-ca" || sslmode === "verify-full",
    };

export const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: sslConfig,
  max: 8,
  idleTimeoutMillis: 30_000,
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function migrate(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const migrationsDir = join(__dirname, "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows } = await query<{ filename: string }>(
    "SELECT filename FROM _migrations"
  );
  const applied = new Set(rows.map((r) => r.filename));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`[migrate] applying ${file}`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (filename) VALUES ($1)", [
        file,
      ]);
      await client.query("COMMIT");
      console.log(`[migrate] applied ${file}`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}
