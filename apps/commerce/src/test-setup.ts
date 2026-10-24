import { randomBytes } from "node:crypto";

process.env.ADMIN_TOKEN = randomBytes(32).toString("hex");
