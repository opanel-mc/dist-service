import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Runtime queries go through Supabase's transaction pooler (DATABASE_URL,
// port 6543, pgbouncer). Migrations use the direct connection (DIRECT_URL,
// port 5432) — configured separately in prisma.config.ts.
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
