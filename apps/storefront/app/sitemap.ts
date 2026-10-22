import { motorcycles } from "@lume/domain";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:43123";
  const paths = [
    "",
    "/motos",
    "/comparar",
    "/me-ajude-a-escolher",
    "/lojas",
    "/test-ride",
    "/financiamento",
    "/sobre",
    "/energia",
    "/garantia",
    "/trocas",
    "/contato",
    "/troca",
    "/privacidade",
    ...motorcycles.map((product) => `/motos/${product.slug}`),
  ];
  return paths.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 }));
}
