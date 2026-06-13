import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI commands (migrate / db pull / introspection) must use the DIRECT
    // connection (port 5432). They cannot run through Supabase's transaction
    // pooler (port 6543, pgbouncer). The runtime client uses DATABASE_URL.
    url: process.env["DIRECT_URL"],
  },
});
