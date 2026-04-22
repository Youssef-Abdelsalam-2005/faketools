import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  _sql?: ReturnType<typeof postgres>;
  _db?: ReturnType<typeof drizzle<typeof schema>>;
};

function getDb() {
  if (globalForDb._db) return globalForDb._db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const sql = globalForDb._sql ?? postgres(connectionString, { max: 10, prepare: false });
  globalForDb._sql = sql;
  const d = drizzle(sql, { schema });
  globalForDb._db = d;
  return d;
}

// Proxy so that import-time has no side effects.
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_t, p) {
    const inst = getDb();
    const v = (inst as any)[p];
    return typeof v === "function" ? v.bind(inst) : v;
  },
});

export { schema };
