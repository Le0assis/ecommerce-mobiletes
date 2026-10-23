"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminError, adminFetch, uploadAdminImage, type AdminResult } from "@/lib/admin-api";
import { formatBRL } from "@/lib/catalog";
import { useEffect, useMemo, useState } from "react";

const categories = ["scooter", "mobilete", "citycoco"] as const;
const styles = ["retro", "citycoco", "esportivo"] as const;
const statuses = ["rascunho", "ativo", "arquivado"] as const;
const kinds = ["bau", "cesta", "cadeirinha", "retrovisor", "capacete", "capa", "suporte", "gaiola"] as const;
const severities = ["leve", "moderada", "grave"] as const;

const field = "h-11 rounded-full px-4";
const tabs = ["Dados", "Ficha", "Fotos", "Variantes", "Acessórios", "Avarias"] as const;

type Specs = {
  powerNominalW: number | null;
  powerPeakW: number | null;
  topSpeedKmh: number | null;
  widthCm: number | null;
  wheelbaseCm: number | null;
  weightKg: number | null;
  seatHeightMm: number | null;
  batteryV: number | null;
  batteryAh: number | null;
  batteryChem: string | null;
  batteryRemovable: boolean | null;
  chargeHours: number | null;
  rangeKmDeclared: number | null;
  hasSpeedLimiter: boolean | null;
  hasBell: boolean | null;
  hasLights: boolean | null;
};

type Variant = {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string;
  batteryLabel: string | null;
  priceDeltaCents: number;
  stock: number;
  active: boolean;
};

type CatalogImage = { id: string; url: string; alt: string; position: number; isCover: boolean };

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: (typeof categories)[number];
  style: (typeof styles)[number];
  tagline: string;
  description: string;
  basePriceCents: number;
  status: (typeof statuses)[number];
  isSample: boolean;
  specs: Specs;
  variants: Variant[];
  images: CatalogImage[];
  accessories: { accessoryId: string; recommended: boolean }[];
};

type AdminAccessory = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  priceCents: number;
  stock: number;
  imageUrl: string | null;
};

type AdminBanner = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string | null;
  position: number;
  active: boolean;
};

type AdminDamage = {
  id: string;
  productId: string;
  variantId: string | null;
  description: string;
  severity: (typeof severities)[number];
  discountCents: number;
  isPublic: boolean;
};

export function AdminCatalog({ token, section }: { token?: string; section: "produtos" | "acessorios" | "carrossel" }) {
  const [query, setQuery] = useState("");
  const [listing, setListing] = useState<"todos" | "ativos" | "inativos" | "exemplo" | "confirmados">("todos");
  const [notice, setNotice] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [accessories, setAccessories] = useState<AdminAccessory[]>([]);
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [damages, setDamages] = useState<AdminDamage[]>([]);
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number]>("Dados");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const paths =
      section === "produtos"
        ? ["/v1/admin/products", "/v1/admin/accessories", "/v1/admin/damages"]
        : section === "acessorios"
          ? ["/v1/admin/products", "/v1/admin/accessories"]
          : ["/v1/admin/banners"];
    void Promise.all(paths.map((path) => adminFetch(path, {}, token))).then((results) => {
      if (cancelled) return;
      const failed = results.find((result) => !result.ok);
      if (failed) {
        setNotice(adminError(failed, "Não foi possível ler o cadastro."));
        return;
      }
      for (const result of results) {
        const body = result.body as {
          products?: AdminProduct[];
          accessories?: AdminAccessory[];
          banners?: AdminBanner[];
          damages?: AdminDamage[];
        };
        if (body.products) setProducts(body.products);
        if (body.accessories) setAccessories(body.accessories);
        if (body.banners) setBanners(body.banners);
        if (body.damages) setDamages(body.damages);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [revision, section, token]);

  const product = products.find((item) => item.id === selected) ?? products[0];

  const list = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return products.filter((item) => {
      if (needle && !`${item.name} ${item.brand} ${item.slug}`.toLocaleLowerCase("pt-BR").includes(needle)) return false;
      if (listing === "ativos" && item.status !== "ativo") return false;
      if (listing === "inativos" && item.status === "ativo") return false;
      if (listing === "exemplo" && !item.isSample) return false;
      if (listing === "confirmados" && item.isSample) return false;
      return true;
    });
  }, [listing, products, query]);

  async function send(path: string, method: string, body?: unknown) {
    setNotice("");
    const result = await adminFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }, token);
    setNotice(result.ok ? "Pedido enviado." : adminError(result, "A API não concluiu."));
    if (result.ok) setRevision((value) => value + 1);
    return result;
  }

  return (
    <div className="grid gap-8">
      {notice ? <p className="text-sm text-paper">{notice}</p> : null}
      {section === "produtos" ? (
        <>
          <section className="grid gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-2xl font-light">Produtos</h2>
              <Button type="button" className="h-11 rounded-full" onClick={() => void send("/v1/admin/products", "POST", emptyProduct())}>
                Criar
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, marca ou slug" className={`${field} min-w-64 flex-1`} aria-label="Buscar produto" />
              <select value={listing} onChange={(event) => setListing(event.target.value as typeof listing)} aria-label="Filtrar produtos" className="h-11 rounded-full border border-white/15 bg-transparent px-4 text-sm">
                <option value="todos">Todos</option>
                <option value="ativos">Ativos</option>
                <option value="inativos">Inativos</option>
                <option value="exemplo">Exemplo</option>
                <option value="confirmados">Confirmados</option>
              </select>
            </div>
            {list.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum produto neste filtro.</p> : null}
            <ul className="grid gap-2">
              {list.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(item.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 px-4 py-3 text-left text-sm aria-pressed:border-signal"
                    aria-pressed={item.id === product?.id}
                  >
                    <span>
                      {item.name}
                      <span className="mt-1 block text-muted-foreground">
                        {item.brand} · {item.category} · estoque {stockOf(item)} · {formatBRL(item.basePriceCents)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {item.status} · {item.isSample ? "exemplo" : "confirmado"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {product ? (
            <section className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => void send(`/v1/admin/products/${product.id}/duplicate`, "POST")}>
                  Duplicar
                </Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => void send(`/v1/admin/products/${product.id}`, "DELETE")}>
                  Arquivar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Editar produto">
                {tabs.map((item) => (
                  <button key={item} type="button" role="tab" aria-selected={tab === item} className="rounded-full border border-white/15 px-3 py-1 text-sm aria-selected:border-signal" onClick={() => setTab(item)}>
                    {item}
                  </button>
                ))}
              </div>
              {tab === "Dados" ? <ProductData key={product.id} product={product} onSave={(body) => send(`/v1/admin/products/${product.id}`, "PATCH", body)} /> : null}
              {tab === "Ficha" ? <ProductSpecs key={product.id} product={product} onSave={(body) => send(`/v1/admin/products/${product.id}`, "PATCH", { specs: body })} /> : null}
              {tab === "Fotos" ? <ProductPhotos key={product.id} product={product} token={token} onSave={(path, method, body) => send(path, method, body)} /> : null}
              {tab === "Variantes" ? <ProductVariants key={product.id} product={product} onSave={(body) => send(`/v1/admin/products/${product.id}/variants`, "POST", body)} /> : null}
              {tab === "Acessórios" ? (
                <LinkedAccessories key={product.id} product={product} accessories={accessories} onSave={(body) => send(`/v1/admin/products/${product.id}`, "PATCH", body)} />
              ) : null}
              {tab === "Avarias" ? (
                <DamageForm
                  key={product.id}
                  product={product}
                  damages={damages.filter((item) => item.productId === product.id)}
                  token={token}
                  onSave={(body) => send("/v1/admin/damages", "POST", body)}
                />
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
      {section === "acessorios" ? (
        <AccessoryDesk
          token={token}
          accessories={accessories}
          products={products}
          onCreate={async (body, productIds) => {
            const created = await send("/v1/admin/accessories", "POST", body);
            const accessoryId = (created.body as { accessory?: { id?: string } }).accessory?.id;
            if (!created.ok || !accessoryId) return created;
            for (const item of products.filter((entry) => productIds.includes(entry.id))) {
              const links = item.accessories.some((link) => link.accessoryId === accessoryId)
                ? item.accessories
                : [...item.accessories, { accessoryId, recommended: false }];
              await adminFetch(`/v1/admin/products/${item.id}`, { method: "PATCH", body: JSON.stringify({ accessories: links }) }, token);
            }
            setRevision((value) => value + 1);
            return created;
          }}
        />
      ) : null}
      {section === "carrossel" ? <BannerDesk token={token} banners={banners} onSave={(body) => send("/v1/admin/banners", "POST", body)} /> : null}
    </div>
  );
}

function ProductData({ product, onSave }: { product: AdminProduct; onSave: (body: unknown) => Promise<AdminResult<unknown>> }) {
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void onSave({
          name: String(data.get("name")),
          slug: String(data.get("slug")),
          brand: String(data.get("brand")),
          category: String(data.get("category")),
          style: String(data.get("style")),
          tagline: String(data.get("tagline")),
          description: String(data.get("description")),
          basePriceCents: Number(data.get("basePriceCents")),
          status: String(data.get("status")),
          isSample: data.get("isSample") === "on",
        });
      }}
    >
      <Input name="name" defaultValue={product.name} className={field} aria-label="Nome" required />
      <Input name="slug" defaultValue={product.slug} className={field} aria-label="Slug" required />
      <Input name="brand" defaultValue={product.brand} className={field} aria-label="Marca" required />
      <Select name="category" label="Categoria" defaultValue={product.category} options={categories} />
      <Select name="style" label="Estilo" defaultValue={product.style} options={styles} />
      <Select name="status" label="Status" defaultValue={product.status} options={statuses} />
      <Input name="tagline" defaultValue={product.tagline} className={field} aria-label="Linha fina" required />
      <Input name="basePriceCents" type="number" min={0} defaultValue={product.basePriceCents} className={field} aria-label="Preço em centavos" required />
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input name="isSample" type="checkbox" defaultChecked={product.isSample} /> Dado de exemplo
      </label>
      <textarea name="description" defaultValue={product.description} rows={4} className="rounded-3xl border border-white/15 bg-transparent px-4 py-3 text-sm md:col-span-2" aria-label="Descrição" />
      <Button type="submit" className="h-11 rounded-full md:col-span-2">Salvar dados</Button>
    </form>
  );
}

function ProductSpecs({ product, onSave }: { product: AdminProduct; onSave: (body: unknown) => Promise<AdminResult<unknown>> }) {
  const fields: ["powerNominalW" | "powerPeakW" | "topSpeedKmh" | "widthCm" | "wheelbaseCm" | "weightKg" | "seatHeightMm" | "batteryV" | "batteryAh" | "chargeHours" | "rangeKmDeclared", string][] = [
    ["powerNominalW", "Potência nominal (W)"],
    ["powerPeakW", "Potência de pico (W)"],
    ["topSpeedKmh", "Velocidade máx. (km/h)"],
    ["widthCm", "Largura (cm)"],
    ["wheelbaseCm", "Entre-eixos (cm)"],
    ["weightKg", "Peso (kg)"],
    ["seatHeightMm", "Altura do banco (mm)"],
    ["batteryV", "Bateria (V)"],
    ["batteryAh", "Bateria (Ah)"],
    ["chargeHours", "Tempo de carga (h)"],
    ["rangeKmDeclared", "Autonomia declarada (km)"],
  ];
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const specs: Record<string, number | string | boolean | null> = {};
        for (const [name] of fields) {
          const raw = String(data.get(name) ?? "");
          specs[name] = raw === "" ? null : Number(raw);
        }
        specs.batteryChem = String(data.get("batteryChem") ?? "") || null;
        specs.batteryRemovable = data.get("batteryRemovable") === "on";
        specs.hasSpeedLimiter = data.get("hasSpeedLimiter") === "on";
        specs.hasBell = data.get("hasBell") === "on";
        specs.hasLights = data.get("hasLights") === "on";
        void onSave(specs);
      }}
    >
      {fields.map(([name, label]) => (
        <label key={name} className="grid gap-1 text-sm">
          {label}
          <Input name={name} type="number" min={0} defaultValue={product.specs[name] ?? ""} className={field} />
        </label>
      ))}
      <Input name="batteryChem" defaultValue={product.specs.batteryChem ?? ""} placeholder="Química da bateria" className={field} aria-label="Química da bateria" />
      <label className="flex items-center gap-2 text-sm"><input name="batteryRemovable" type="checkbox" defaultChecked={product.specs.batteryRemovable === true} /> Bateria removível</label>
      <label className="flex items-center gap-2 text-sm"><input name="hasSpeedLimiter" type="checkbox" defaultChecked={product.specs.hasSpeedLimiter === true} /> Limitador de velocidade</label>
      <label className="flex items-center gap-2 text-sm"><input name="hasBell" type="checkbox" defaultChecked={product.specs.hasBell === true} /> Campainha</label>
      <label className="flex items-center gap-2 text-sm"><input name="hasLights" type="checkbox" defaultChecked={product.specs.hasLights === true} /> Luzes</label>
      <p className="text-xs text-muted-foreground md:col-span-2">O selo não se marca aqui. A API calcula pelos quatro limites nominais. A potência de pico não entra nessa conta.</p>
      <Button type="submit" className="h-11 rounded-full md:col-span-2">Salvar ficha</Button>
    </form>
  );
}

function ProductPhotos({ product, token, onSave }: { product: AdminProduct; token?: string; onSave: (path: string, method: string, body?: unknown) => Promise<AdminResult<unknown>> }) {
  const [images, setImages] = useState<CatalogImage[]>([...product.images].sort((a, b) => a.position - b.position));
  const [error, setError] = useState("");

  function move(index: number, target: number) {
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    setImages(next.map((image, position) => ({ ...image, position, isCover: position === 0 })));
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">Arraste para ordenar. A primeira é a capa. JPG, PNG ou WebP, até 5 MB. O envio pede o token de cliente à API.</p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Enviar foto"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setError("");
          void uploadAdminImage(file, token)
            .then((url) =>
              onSave(`/v1/admin/products/${product.id}/images`, "POST", {
                url,
                alt: file.name,
                isCover: images.length === 0,
                position: images.length,
              }),
            )
            .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Não foi possível enviar."));
        }}
      />
      {error ? <p className="text-sm text-signal">{error}</p> : null}
      <ul className="grid gap-2">
        {images.map((image, index) => (
          <li
            key={image.id}
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const from = Number(event.dataTransfer.getData("text/plain"));
              if (Number.isInteger(from)) move(from, index);
            }}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm"
          >
            <span className="truncate">{index === 0 ? "Capa · " : ""}{image.alt || image.url}</span>
            <span className="flex gap-2">
              <button type="button" className="underline" onClick={() => move(index, index - 1)}>Subir</button>
              <button type="button" className="underline" onClick={() => move(index, index + 1)}>Descer</button>
              <button type="button" className="underline" onClick={() => void onSave(`/v1/admin/products/${product.id}/images/${image.id}`, "DELETE")}>Tirar</button>
            </span>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        className="h-11 rounded-full"
        disabled={images.length === 0}
        onClick={() =>
          void onSave(`/v1/admin/products/${product.id}/images`, "PATCH", {
            images: images.map((image, position) => ({ id: image.id, position, isCover: position === 0 })),
          })
        }
      >
        Salvar ordem
      </Button>
    </div>
  );
}

function ProductVariants({ product, onSave }: { product: AdminProduct; onSave: (body: unknown) => Promise<AdminResult<unknown>> }) {
  return (
    <div className="grid gap-4">
      <ul className="grid gap-2 text-sm">
        {product.variants.map((variant) => (
          <li key={variant.id} className="rounded-2xl border border-white/10 px-4 py-3">
            {variant.colorName} · {variant.sku} · estoque {variant.stock}
            {variant.batteryLabel ? ` · ${variant.batteryLabel}` : ""} · {variant.priceDeltaCents > 0 ? `+${formatBRL(variant.priceDeltaCents)}` : "sem acréscimo"}
          </li>
        ))}
      </ul>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const battery = String(data.get("batteryLabel") ?? "");
          void onSave({
            sku: String(data.get("sku")),
            colorName: String(data.get("colorName")),
            colorHex: String(data.get("colorHex")),
            batteryLabel: battery || null,
            priceDeltaCents: Number(data.get("priceDeltaCents")),
            stock: Number(data.get("stock")),
            active: true,
          });
        }}
      >
        <Input name="sku" required placeholder="SKU" className={field} aria-label="SKU" />
        <Input name="colorName" required placeholder="Cor" className={field} aria-label="Cor" />
        <Input name="colorHex" required defaultValue="#8a8a8a" pattern="#[0-9a-fA-F]{6}" className={field} aria-label="Hex da cor" />
        <Input name="batteryLabel" placeholder="Bateria" className={field} aria-label="Rótulo da bateria" />
        <Input name="priceDeltaCents" type="number" min={0} defaultValue={0} className={field} aria-label="Acréscimo em centavos" />
        <Input name="stock" type="number" min={0} defaultValue={0} className={field} aria-label="Estoque" />
        <Button type="submit" className="h-11 rounded-full md:col-span-2">Incluir variante</Button>
      </form>
    </div>
  );
}

function LinkedAccessories({ product, accessories, onSave }: { product: AdminProduct; accessories: AdminAccessory[]; onSave: (body: unknown) => Promise<AdminResult<unknown>> }) {
  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const links = accessories
          .filter((item) => data.get(item.id) === "on")
          .map((item) => ({ accessoryId: item.id, recommended: data.get(`${item.id}-recommended`) === "on" }));
        void onSave({ accessories: links });
      }}
    >
      {accessories.map((item) => {
        const link = product.accessories.find((entry) => entry.accessoryId === item.id);
        return (
          <label key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm">
            <span className="flex items-center gap-2">
              <input name={item.id} type="checkbox" defaultChecked={Boolean(link)} />
              {item.name}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <input name={`${item.id}-recommended`} type="checkbox" defaultChecked={link?.recommended === true} /> sugerido
            </span>
          </label>
        );
      })}
      <Button type="submit" className="h-11 rounded-full">Salvar vínculos</Button>
    </form>
  );
}

function DamageForm({ product, damages, token, onSave }: { product: AdminProduct; damages: AdminDamage[]; token?: string; onSave: (body: unknown) => Promise<AdminResult<unknown>> }) {
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="grid gap-4">
      <ul className="grid gap-2 text-sm">
        {damages.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 px-4 py-3">
            {item.description} · {item.severity} · {formatBRL(item.discountCents)} · {item.isPublic ? "visível" : "oculta"}
          </li>
        ))}
      </ul>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const variantId = String(data.get("variantId") ?? "");
          void onSave({
            productId: product.id,
            variantId: variantId || null,
            description: String(data.get("description")),
            severity: String(data.get("severity")),
            discountCents: Number(data.get("discountCents")),
            isPublic: data.get("isPublic") === "on",
            images: photo ? [{ url: photo }] : [],
          });
        }}
      >
        <textarea name="description" required minLength={3} rows={3} className="rounded-3xl border border-white/15 bg-transparent px-4 py-3 text-sm" aria-label="Descrição da avaria" />
        <label className="grid gap-1 text-sm">
          Variante
          <select name="variantId" defaultValue="" className="h-11 rounded-full border border-white/15 bg-transparent px-4">
            <option value="">Sem variante específica</option>
            {product.variants.map((variant) => (
              <option key={variant.id} value={variant.id}>{variant.colorName} · {variant.sku}</option>
            ))}
          </select>
        </label>
        <Select name="severity" label="Gravidade" defaultValue="leve" options={severities} />
        <Input name="discountCents" type="number" min={0} defaultValue={0} className={field} aria-label="Desconto em centavos" />
        <label className="flex items-center gap-2 text-sm"><input name="isPublic" type="checkbox" /> Visível no site, com o desconto</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Foto da avaria"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setError("");
            void uploadAdminImage(file, token)
              .then(setPhoto)
              .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Não foi possível enviar."));
          }}
        />
        {error ? <p className="text-sm text-signal">{error}</p> : null}
        <Button type="submit" className="h-11 rounded-full">Registrar avaria</Button>
      </form>
    </div>
  );
}

function AccessoryDesk({
  token,
  accessories,
  products,
  onCreate,
}: {
  token?: string;
  accessories: AdminAccessory[];
  products: AdminProduct[];
  onCreate: (body: unknown, productIds: string[]) => Promise<AdminResult<unknown>>;
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  return (
    <section className="grid gap-3">
      <h2 className="text-2xl font-light">Acessórios</h2>
      <ul className="grid gap-2 text-sm">
        {accessories.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 px-4 py-3">
            {item.name} · {formatBRL(item.priceCents)} · estoque {item.stock}
          </li>
        ))}
      </ul>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const productIds = products.filter((item) => data.get(`model-${item.id}`) === "on").map((item) => item.id);
          void onCreate(
            {
              slug: String(data.get("slug")),
              name: String(data.get("name")),
              kind: String(data.get("kind")),
              priceCents: Number(data.get("priceCents")),
              stock: Number(data.get("stock")),
              imageUrl: imageUrl || null,
            },
            productIds,
          );
        }}
      >
        <Input name="name" required placeholder="Nome" className={field} aria-label="Nome do acessório" />
        <Input name="slug" required placeholder="slug-do-acessorio" pattern="[a-z0-9-]+" className={field} aria-label="Slug do acessório" />
        <Select name="kind" label="Tipo" defaultValue="bau" options={kinds} />
        <Input name="priceCents" type="number" min={0} required className={field} aria-label="Preço em centavos" />
        <Input name="stock" type="number" min={0} defaultValue={0} className={field} aria-label="Estoque do acessório" />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Foto do acessório"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setError("");
            void uploadAdminImage(file, token)
              .then(setImageUrl)
              .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Não foi possível enviar."));
          }}
        />
        {error ? <p className="text-sm text-signal md:col-span-2">{error}</p> : null}
        <fieldset className="grid max-h-48 gap-2 overflow-auto md:col-span-2">
          <legend className="text-sm">Compatível com</legend>
          {products.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input name={`model-${item.id}`} type="checkbox" /> {item.brand} {item.name}
            </label>
          ))}
        </fieldset>
        <Button type="submit" className="h-11 rounded-full md:col-span-2">Cadastrar acessório</Button>
      </form>
    </section>
  );
}

function BannerDesk({ token, banners, onSave }: { token?: string; banners: AdminBanner[]; onSave: (body: unknown) => Promise<AdminResult<unknown>> }) {
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  return (
    <section className="grid gap-3">
      <h2 className="text-2xl font-light">Carrossel</h2>
      <ul className="grid gap-2 text-sm">
        {banners.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 px-4 py-3">
            {item.title} · {item.active ? "ativo" : "oculto"} · ordem {item.position}
          </li>
        ))}
      </ul>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const typed = String(data.get("imageUrl") ?? "");
          void onSave({
            title: String(data.get("title")),
            subtitle: String(data.get("subtitle") ?? ""),
            href: String(data.get("href")),
            position: Number(data.get("position")),
            active: data.get("active") === "on",
            imageUrl: imageUrl || typed || null,
          });
        }}
      >
        <Input name="title" required placeholder="Título" className={field} aria-label="Título do banner" />
        <Input name="subtitle" placeholder="Subtítulo" className={field} aria-label="Linha do banner" />
        <Input name="href" required placeholder="/motos ou https://" className={field} aria-label="Link do slide" />
        <Input name="position" type="number" min={0} defaultValue={banners.length} className={field} aria-label="Ordem do slide" />
        <Input name="imageUrl" placeholder="URL da imagem, se já existir" className={`${field} md:col-span-2`} aria-label="URL da imagem" />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Foto do slide"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setError("");
            void uploadAdminImage(file, token)
              .then(setImageUrl)
              .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Não foi possível enviar."));
          }}
        />
        {imageUrl ? <p className="text-sm text-muted-foreground md:col-span-2">Foto pronta para o slide.</p> : null}
        {error ? <p className="text-sm text-signal md:col-span-2">{error}</p> : null}
        <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Ativo</label>
        <Button type="submit" className="h-11 rounded-full md:col-span-2">Incluir slide</Button>
      </form>
    </section>
  );
}

function Select({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: readonly string[] }) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <select name={name} defaultValue={defaultValue} className="h-11 rounded-full border border-white/15 bg-transparent px-4">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function stockOf(product: AdminProduct) {
  return product.variants.reduce((sum, variant) => sum + Math.max(variant.stock, 0), 0);
}

function emptyProduct() {
  return {
    name: "Novo modelo",
    slug: `modelo-${Date.now().toString(36)}`,
    brand: "LUME",
    category: "scooter",
    style: "citycoco",
    tagline: "A confirmar",
    description: "Rascunho criado no admin.",
    basePriceCents: 0,
    status: "rascunho",
    isSample: true,
  };
}
