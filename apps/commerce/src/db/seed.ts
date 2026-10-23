import { createDatabase } from "./client";
import { seedCatalog } from "./seed-catalog";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ausente. Copie apps/commerce/.env.example para apps/commerce/.env e suba o Postgres.");
  process.exit(1);
}

const { db, close } = createDatabase(url);
await seedCatalog(db);
console.log("Catálogo gravado no Postgres.");
await close();
