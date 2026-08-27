import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

async function getEnvironment() {
  const { env } = await import("cloudflare:workers");
  return env;
}

export async function getDb() {
  const env = await getEnvironment();
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}


export function getD1Binding() {
  return getEnvironment().then((env) => {
    if (!env.DB) throw new Error("DATABASE_NOT_CONFIGURED");
    return env.DB;
  });
}
