function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function opt(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  DATABASE_URL: req("DATABASE_URL"),
  ADMIN_PASSWORD: req("ADMIN_PASSWORD"),
  BASE_URL: opt("BASE_URL", "https://ignirsmaze.uk"),
  ADMIN_HOST: opt("ADMIN_HOST", "admin.ignirsmaze.uk"),
  ANTHROPIC_API_KEY: opt("ANTHROPIC_API_KEY"),
  BUDGET_USD_DAILY: Number(opt("BUDGET_USD_DAILY", "5")),
  PORT: Number(opt("PORT", "3000")),
  PG_CA_PATH: opt("PG_CA_PATH", "/etc/ssl/certs/pg-ca.crt"),
};
