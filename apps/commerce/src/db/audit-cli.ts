import { createDatabase } from "./client";
import { auditDatabase, auditIsClean, formatAudit } from "./audit";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ausente. A auditoria só lê e não grava.");
  process.exit(1);
}

const { db, close } = createDatabase(url);
try {
  const report = await auditDatabase(db);
  console.log(formatAudit(report));
  process.exitCode = auditIsClean(report) ? 0 : 1;
} finally {
  await close();
}
