import {
  DomainError,
  adminAccessoryBody,
  adminAccessoryPatchBody,
  adminBannerBody,
  adminBannerPatchBody,
  adminDamageBody,
  adminDamagePatchBody,
  adminImageBody,
  adminImageOrderBody,
  adminLoginBody,
  adminProductBody,
  adminProductPatchBody,
  adminVariantBody,
  adminVariantPatchBody,
} from "@lume/domain";
import type { Context, Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { verifyAdminPassword } from "./auth";
import type { Catalog } from "./catalog-store";
import { handleBlobUpload, parseUploadRequest, uploadRejection, clientTokenFor, type UploadRequest } from "./uploads";

export const ADMIN_COOKIE = "lume_admin";

type Session = { createdAt: number };

type Schema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: unknown } };
};

async function readJson<T>(c: Context, schema: Schema<T>, run: (data: T) => unknown) {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "json_invalido", message: "Envie um JSON válido." }, 400);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "payload_invalido", message: "Revise os campos.", issues: parsed.error.issues }, 400);
  }
  try {
    const result = run(parsed.data);
    if (result && typeof result === "object" && "error" in result && result.error === "slug_em_uso") {
      return c.json({ error: "slug_em_uso", message: "Esse slug já está em uso." }, 409);
    }
    if (result && typeof result === "object" && "error" in result && result.error === "sku_em_uso") {
      return c.json({ error: "sku_em_uso", message: "Esse SKU já está em uso." }, 409);
    }
    if (result && typeof result === "object" && "error" in result && result.error === "nao_encontrado") {
      return c.json({ error: "nao_encontrado", message: "Registro não encontrado." }, 404);
    }
    if (result && typeof result === "object" && "error" in result && result.error === "acessorio_inexistente") {
      return c.json({ error: "acessorio_inexistente", message: "Acessório não encontrado." }, 400);
    }
    return c.json(result);
  } catch (error) {
    if (error instanceof DomainError) return c.json({ error: error.code, message: error.message }, 400);
    return c.json({ error: "erro_interno", message: "Não foi possível concluir agora." }, 500);
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export function mountCatalogRoutes(
  app: Hono,
  options: {
    catalog: Catalog;
    sessions: Map<string, Session>;
    authorized: (c: Context) => boolean;
    rateLimit: (key: string, limit: number) => boolean;
    blobSigner?: (input: UploadRequest) => Promise<{ clientToken: string; pathname: string }>;
  },
) {
  const { catalog, sessions, authorized, rateLimit } = options;

  app.post("/v1/admin/login", async (c) => {
    const ip = c.req.header("x-forwarded-for") ?? "local";
    if (rateLimit(`admin-login:${ip}`, 8)) {
      return c.json({ error: "limite", message: "Muitas tentativas. Espere um minuto." }, 429);
    }
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ error: "json_invalido", message: "Envie um JSON válido." }, 400);
    }
    const parsed = adminLoginBody.safeParse(payload);
    if (!parsed.success) return c.json({ error: "payload_invalido", message: "Revise os campos." }, 400);
    const stored = process.env.ADMIN_PASSWORD_HASH;
    if (!stored) {
      return c.json(
        { error: "admin_sem_senha", message: "Defina ADMIN_PASSWORD_HASH no servidor. Não grave a senha no código." },
        503,
      );
    }
    if (!verifyAdminPassword(parsed.data.password, stored)) {
      return c.json({ error: "senha_invalida", message: "Senha inválida." }, 401);
    }
    const token = crypto.randomUUID();
    sessions.set(token, { createdAt: Date.now() });
    setCookie(c, ADMIN_COOKIE, token, cookieOptions());
    return c.json({ ok: true });
  });

  app.post("/v1/admin/logout", (c) => {
    const token = getCookie(c, ADMIN_COOKIE);
    if (token) sessions.delete(token);
    deleteCookie(c, ADMIN_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.get("/v1/admin/products", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return c.json({ products: catalog.listProducts(c.req.query("q") ?? "") });
  });

  app.post("/v1/admin/products", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminProductBody, (input) => catalog.createProduct(input));
  });

  app.post("/v1/admin/products/:id/duplicate", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    const product = catalog.duplicateProduct(c.req.param("id"));
    if (!product) return c.json({ error: "nao_encontrado", message: "Registro não encontrado." }, 404);
    return c.json({ product });
  });

  app.patch("/v1/admin/products/:id", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminProductPatchBody, (input) => catalog.updateProduct(c.req.param("id"), input));
  });

  app.delete("/v1/admin/products/:id", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    const product = catalog.archiveProduct(c.req.param("id"));
    if (!product) return c.json({ error: "nao_encontrado", message: "Registro não encontrado." }, 404);
    return c.json({ product });
  });

  app.post("/v1/admin/products/:id/variants", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminVariantBody, (input) =>
      catalog.addVariant(c.req.param("id"), { ...input, batteryLabel: input.batteryLabel ?? null }),
    );
  });

  app.patch("/v1/admin/products/:id/variants/:variantId", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminVariantPatchBody, (input) => catalog.updateVariant(c.req.param("id"), c.req.param("variantId"), input));
  });

  app.delete("/v1/admin/products/:id/variants/:variantId", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    const ok = catalog.removeVariant(c.req.param("id"), c.req.param("variantId"));
    if (!ok) return c.json({ error: "nao_encontrado", message: "Registro não encontrado." }, 404);
    return c.json({ ok: true });
  });

  app.post("/v1/admin/products/:id/images", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminImageBody, (input) => {
      const image = catalog.addImage(c.req.param("id"), {
        url: input.url,
        alt: input.alt,
        variantId: input.variantId ?? null,
        position: input.position,
        isCover: input.isCover,
      });
      if (!image) throw new DomainError("nao_encontrado", "Produto ou variante não encontrado.");
      return { image };
    });
  });

  app.patch("/v1/admin/products/:id/images", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminImageOrderBody, (input) => {
      const images = catalog.reorderImages(c.req.param("id"), input.images);
      if (!images) throw new DomainError("nao_encontrado", "Foto não encontrada nesse produto.");
      return { images };
    });
  });

  app.delete("/v1/admin/products/:id/images/:imageId", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    const ok = catalog.removeImage(c.req.param("id"), c.req.param("imageId"));
    if (!ok) return c.json({ error: "nao_encontrado", message: "Registro não encontrado." }, 404);
    return c.json({ ok: true });
  });

  app.get("/v1/admin/accessories", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return c.json({ accessories: catalog.listAccessories() });
  });

  app.post("/v1/admin/accessories", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminAccessoryBody, (input) => catalog.createAccessory({ ...input, imageUrl: input.imageUrl ?? null }));
  });

  app.patch("/v1/admin/accessories/:id", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminAccessoryPatchBody, (input) => catalog.updateAccessory(c.req.param("id"), input));
  });

  app.delete("/v1/admin/accessories/:id", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    const ok = catalog.removeAccessory(c.req.param("id"));
    if (!ok) return c.json({ error: "nao_encontrado", message: "Registro não encontrado." }, 404);
    return c.json({ ok: true });
  });

  app.get("/v1/admin/damages", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return c.json({ damages: catalog.listDamages() });
  });

  app.post("/v1/admin/damages", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminDamageBody, (input) =>
      catalog.createDamage({
        productId: input.productId,
        variantId: input.variantId ?? null,
        description: input.description,
        severity: input.severity,
        discountCents: input.discountCents,
        isPublic: input.isPublic,
        resolvedAt: input.resolvedAt ?? null,
        images: input.images,
      }),
    );
  });

  app.patch("/v1/admin/damages/:id", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminDamagePatchBody, (input) => catalog.updateDamage(c.req.param("id"), input));
  });

  app.delete("/v1/admin/damages/:id", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    const ok = catalog.removeDamage(c.req.param("id"));
    if (!ok) return c.json({ error: "nao_encontrado", message: "Registro não encontrado." }, 404);
    return c.json({ ok: true });
  });

  app.get("/v1/admin/banners", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return c.json({ banners: catalog.listBanners() });
  });

  app.post("/v1/admin/banners", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminBannerBody, (input) => ({
      banner: catalog.createBanner({ ...input, imageUrl: input.imageUrl ?? null }),
    }));
  });

  app.patch("/v1/admin/banners/:id", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    return readJson(c, adminBannerPatchBody, (input) => {
      const banner = catalog.updateBanner(c.req.param("id"), input);
      if (!banner) throw new DomainError("nao_encontrado", "Registro não encontrado.");
      return { banner };
    });
  });

  app.delete("/v1/admin/banners/:id", (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    const ok = catalog.removeBanner(c.req.param("id"));
    if (!ok) return c.json({ error: "nao_encontrado", message: "Registro não encontrado." }, 404);
    return c.json({ ok: true });
  });

  app.post("/v1/admin/uploads", async (c) => {
    if (!authorized(c)) return c.json({ error: "nao_autorizado", message: "Entre com a senha de admin." }, 401);
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ error: "json_invalido", message: "Envie um JSON válido." }, 400);
    }
    const parsed = parseUploadRequest(payload);
    if (!parsed) return c.json({ error: "payload_invalido", message: "Revise os campos." }, 400);
    if ("type" in parsed) {
      try {
        const signed = await handleBlobUpload(parsed, c.req.raw);
        if (!signed) {
          return c.json({ error: "blob_indisponivel", message: "Defina BLOB_READ_WRITE_TOKEN no servidor." }, 503);
        }
        return c.json(signed);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "tipo_recusado") {
          return c.json({ error: "tipo_recusado", message: "Envie JPG, PNG ou WebP de até 5 MB." }, 400);
        }
        return c.json({ error: "blob_indisponivel", message: "Não foi possível assinar o upload." }, 503);
      }
    }
    const rejection = uploadRejection(parsed);
    if (rejection) return c.json({ error: "tipo_recusado", message: rejection }, 400);
    if (options.blobSigner) return c.json(await options.blobSigner(parsed));
    const signed = await clientTokenFor(parsed);
    if (!signed) return c.json({ error: "blob_indisponivel", message: "Defina BLOB_READ_WRITE_TOKEN no servidor." }, 503);
    return c.json(signed);
  });
}
