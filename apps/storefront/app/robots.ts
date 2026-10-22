import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:43123";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/checkout", "/conta", "/carrinho", "/pedidos", "/pedido"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
