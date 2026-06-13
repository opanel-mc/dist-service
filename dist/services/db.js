"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("../generated/prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
}
// Runtime queries go through Supabase's transaction pooler (DATABASE_URL,
// port 6543, pgbouncer). Migrations use the direct connection (DIRECT_URL,
// port 5432) — configured separately in prisma.config.ts.
const adapter = new adapter_pg_1.PrismaPg({ connectionString });
exports.prisma = new client_1.PrismaClient({ adapter });
