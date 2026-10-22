import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { persistBooking, persistOrder } from "./db/persist";
import { loadEnvFile } from "./env";

loadEnvFile();

const port = Number(process.env.PORT ?? 8787);
const app = createApp({
  onOrder: persistOrder,
  onBooking: persistBooking,
});

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(
    JSON.stringify({
      msg: "commerce_up",
      port: info.port,
      persistence: process.env.DATABASE_URL ? "postgres" : "memoria",
      redis: Boolean(process.env.REDIS_URL),
      search: process.env.MEILI_HOST ? "meilisearch" : "memoria",
    }),
  );
});
