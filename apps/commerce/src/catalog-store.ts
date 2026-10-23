import { accessories as domainAccessories, banners as domainBanners } from "@lume/domain";
import { autopropelidoBadge } from "@lume/domain";
import { sampleScooters, type SampleSpec } from "./db/sample-scooters";

export type ProductStatus = "rascunho" | "ativo" | "arquivado";
export type ProductCategory = "scooter" | "mobilete" | "citycoco";
export type ProductStyle = "retro" | "citycoco" | "esportivo";

export type CatalogVariant = {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string;
  batteryLabel: string | null;
  priceDeltaCents: number;
  stock: number;
  active: boolean;
};

export type CatalogImage = {
  id: string;
  variantId: string | null;
  url: string;
  alt: string;
  position: number;
  isCover: boolean;
};

export type CatalogAccessoryLink = {
  accessoryId: string;
  recommended: boolean;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: ProductCategory;
  style: ProductStyle;
  tagline: string;
  description: string;
  basePriceCents: number;
  status: ProductStatus;
  isSample: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  specs: SampleSpec;
  variants: CatalogVariant[];
  images: CatalogImage[];
  accessories: CatalogAccessoryLink[];
};

export type CatalogAccessory = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  priceCents: number;
  stock: number;
  imageUrl: string | null;
};

export type DamageImage = { id: string; url: string; position: number };

export type CatalogDamage = {
  id: string;
  productId: string;
  variantId: string | null;
  description: string;
  severity: "leve" | "moderada" | "grave";
  discountCents: number;
  isPublic: boolean;
  resolvedAt: string | null;
  createdAt: string;
  images: DamageImage[];
};

export type CatalogBanner = {
  id: string;
  slot: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string | null;
  position: number;
  active: boolean;
};

export type ProductDraft = {
  slug: string;
  name: string;
  brand: string;
  category: ProductCategory;
  style: ProductStyle;
  tagline: string;
  description: string;
  basePriceCents: number;
  status?: ProductStatus;
  isSample?: boolean;
  isEnabled?: boolean;
  specs?: Partial<SampleSpec>;
  accessories?: CatalogAccessoryLink[];
};

export type CatalogState = {
  products: CatalogProduct[];
  accessories: CatalogAccessory[];
  damages: CatalogDamage[];
};

export class CatalogUnavailable extends Error {
  readonly code = "catalogo_indisponivel" as const;

  constructor() {
    super("O cadastro precisa do Postgres.");
    this.name = "CatalogUnavailable";
  }
}

const emptySpecs = (): SampleSpec => ({
  powerNominalW: null,
  powerPeakW: null,
  topSpeedKmh: null,
  widthCm: null,
  wheelbaseCm: null,
  weightKg: null,
  seatHeightMm: null,
  batteryV: null,
  batteryAh: null,
  batteryChem: null,
  batteryRemovable: null,
  chargeHours: null,
  rangeKmDeclared: null,
  hasSpeedLimiter: null,
  hasBell: null,
  hasLights: null,
});

function copy<T>(value: T): T {
  return structuredClone(value);
}

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

export function createCatalog(
  options: {
    now?: () => Date;
    bannerOverrides?: Map<string, boolean>;
    seedProducts?: boolean;
    seedAccessories?: boolean;
  } = {},
) {
  const now = options.now ?? (() => new Date());
  const stamp = () => now().toISOString();
  const products = new Map<string, CatalogProduct>();
  const accessories = new Map<string, CatalogAccessory>();
  const damages = new Map<string, CatalogDamage>();
  const banners = new Map<string, CatalogBanner>();

  if (options.seedAccessories !== false) {
    for (const item of domainAccessories) {
      accessories.set(item.id, {
        id: item.id,
        slug: item.id,
        name: item.name,
        kind: item.group,
        priceCents: item.priceCents,
        stock: 0,
        imageUrl: null,
      });
    }
  }

  for (const [index, item] of domainBanners.entries()) {
    banners.set(item.id, {
      id: item.id,
      slot: item.slot,
      eyebrow: item.eyebrow,
      title: item.title,
      subtitle: item.subtitle ?? "",
      href: item.href,
      imageUrl: item.imageUrl ?? null,
      position: item.position ?? index,
      active: options.bannerOverrides?.get(item.id) ?? item.active,
    });
  }

  if (options.seedProducts !== false) {
    for (const item of sampleScooters) {
    const moment = stamp();
    products.set(item.id, {
      id: item.id,
      slug: item.slug,
      name: item.name,
      brand: item.brand,
      category: item.category,
      style: item.style,
      tagline: item.tagline,
      description: item.description,
      basePriceCents: item.basePriceCents,
      status: "ativo",
      isSample: true,
      isEnabled: true,
      createdAt: moment,
      updatedAt: moment,
      specs: { ...item.specs },
      variants: [
        {
          id: item.variant.id,
          sku: item.variant.sku,
          colorName: item.variant.colorName,
          colorHex: item.variant.colorHex,
          batteryLabel: item.variant.batteryLabel,
          priceDeltaCents: item.variant.priceDeltaCents,
          stock: item.variant.stock,
          active: true,
        },
      ],
      images: [],
      accessories: [],
    });
  }
  }

  function slugTaken(slug: string, exceptId?: string) {
    return [...products.values()].some((item) => item.slug === slug && item.id !== exceptId);
  }

  function skuTaken(sku: string, exceptId?: string) {
    return [...products.values()].some((product) => product.variants.some((variant) => variant.sku === sku && variant.id !== exceptId));
  }

  function requireProduct(id: string) {
    const product = products.get(id);
    if (!product) return null;
    return product;
  }

  function listedPublicly(item: CatalogProduct) {
    return item.status === "ativo" && item.isEnabled;
  }

  function present(product: CatalogProduct) {
    const ownDamages = [...damages.values()].filter((item) => item.productId === product.id);
    const autopropelido = autopropelidoBadge(product.specs);
    return { ...copy(product), damages: ownDamages.map((item) => copy(item)), autopropelido };
  }

  return {
    async listProducts(query = "") {
      const needle = fold(query.trim());
      return [...products.values()]
        .filter((item) => {
          if (!needle) return true;
          return [item.name, item.slug, item.brand, item.category].some((value) => fold(value).includes(needle));
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        .map((item) => present(item));
    },
    async getProduct(id: string) {
      const product = products.get(id);
      return product ? present(product) : null;
    },
    async findProduct(idOrSlug: string) {
      const byId = products.get(idOrSlug);
      if (byId) return present(byId);
      const bySlug = [...products.values()].find((item) => item.slug === idOrSlug);
      return bySlug ? present(bySlug) : null;
    },
    async productBySlug(slug: string) {
      const product = [...products.values()].find((item) => item.slug === slug);
      return product ? present(product) : null;
    },
    async publicBySlug(slug: string) {
      const product = [...products.values()].find((item) => item.slug === slug && listedPublicly(item));
      if (!product) return null;
      const view = present(product);
      return {
        ...view,
        damages: view.damages.filter((item) => item.isPublic && !item.resolvedAt),
      };
    },
    async publicList(input: { q?: string; category?: string; brand?: string; city?: string }) {
      if (input.city?.trim()) return [];
      const needle = fold(input.q?.trim() ?? "");
      const brand = fold(input.brand?.trim() ?? "");
      return [...products.values()]
        .filter((item) => listedPublicly(item))
        .filter((item) => (input.category ? item.category === input.category : true))
        .filter((item) => (brand ? fold(item.brand) === brand : true))
        .filter((item) => (needle ? fold(`${item.name} ${item.brand} ${item.tagline}`).includes(needle) : true))
        .map((item) => {
          const view = present(item);
          return { ...view, damages: view.damages.filter((damage) => damage.isPublic && !damage.resolvedAt) };
        });
    },
    async createProduct(draft: ProductDraft) {
      if (slugTaken(draft.slug)) return { error: "slug_em_uso" as const };
      if (draft.accessories) {
        const missing = draft.accessories.find((link) => !accessories.has(link.accessoryId));
        if (missing) return { error: "acessorio_inexistente" as const };
      }
      const moment = stamp();
      const product: CatalogProduct = {
        id: crypto.randomUUID(),
        slug: draft.slug,
        name: draft.name,
        brand: draft.brand,
        category: draft.category,
        style: draft.style,
        tagline: draft.tagline,
        description: draft.description,
        basePriceCents: draft.basePriceCents,
        status: draft.status ?? "rascunho",
        isSample: draft.isSample ?? true,
        isEnabled: draft.isEnabled ?? true,
        createdAt: moment,
        updatedAt: moment,
        specs: { ...emptySpecs(), ...draft.specs },
        variants: [],
        images: [],
        accessories: draft.accessories ?? [],
      };
      products.set(product.id, product);
      return { product: present(product) };
    },
    async updateProduct(id: string, patch: Partial<ProductDraft> & { accessories?: CatalogAccessoryLink[] }) {
      const product = requireProduct(id);
      if (!product) return { error: "nao_encontrado" as const };
      if (patch.slug && slugTaken(patch.slug, id)) return { error: "slug_em_uso" as const };
      if (patch.accessories) {
        const missing = patch.accessories.find((link) => !accessories.has(link.accessoryId));
        if (missing) return { error: "acessorio_inexistente" as const };
      }
      const { specs, ...rest } = patch;
      Object.assign(product, rest);
      if (specs) product.specs = { ...product.specs, ...specs };
      product.updatedAt = stamp();
      return { product: present(product) };
    },
    async archiveProduct(id: string) {
      const product = requireProduct(id);
      if (!product) return null;
      product.status = "arquivado";
      product.updatedAt = stamp();
      return present(product);
    },
    async duplicateProduct(id: string) {
      const product = requireProduct(id);
      if (!product) return null;
      let slug = `${product.slug}-copia`;
      let guard = 2;
      while (slugTaken(slug)) {
        slug = `${product.slug}-copia-${guard}`;
        guard += 1;
      }
      const moment = stamp();
      const variantIds = new Map<string, string>();
      const reservedSku = new Set<string>();
      const copyProduct: CatalogProduct = {
        ...copy(product),
        id: crypto.randomUUID(),
        slug,
        name: `${product.name} (cópia)`,
        status: "rascunho",
        createdAt: moment,
        updatedAt: moment,
        variants: product.variants.map((variant) => {
          let sku = `${variant.sku}-COPIA`;
          let sequence = 2;
          while (skuTaken(sku) || reservedSku.has(sku)) {
            sku = `${variant.sku}-COPIA-${sequence}`;
            sequence += 1;
          }
          reservedSku.add(sku);
          const variantId = crypto.randomUUID();
          variantIds.set(variant.id, variantId);
          return { ...variant, id: variantId, sku };
        }),
        images: product.images.map((image) => ({
          ...image,
          id: crypto.randomUUID(),
          variantId: image.variantId ? (variantIds.get(image.variantId) ?? null) : null,
        })),
      };
      products.set(copyProduct.id, copyProduct);
      return present(copyProduct);
    },
    async addVariant(productId: string, input: Omit<CatalogVariant, "id"> & { id?: string }) {
      const product = requireProduct(productId);
      if (!product) return { error: "nao_encontrado" as const };
      if (skuTaken(input.sku)) return { error: "sku_em_uso" as const };
      const variant: CatalogVariant = { ...input, id: input.id ?? crypto.randomUUID() };
      product.variants.push(variant);
      product.updatedAt = stamp();
      return { variant: copy(variant) };
    },
    async updateVariant(productId: string, variantId: string, patch: Partial<Omit<CatalogVariant, "id">>) {
      const product = requireProduct(productId);
      const variant = product?.variants.find((item) => item.id === variantId);
      if (!product || !variant) return { error: "nao_encontrado" as const };
      if (patch.sku && skuTaken(patch.sku, variantId)) return { error: "sku_em_uso" as const };
      Object.assign(variant, patch);
      product.updatedAt = stamp();
      return { variant: copy(variant) };
    },
    async removeVariant(productId: string, variantId: string) {
      const product = requireProduct(productId);
      if (!product) return false;
      const before = product.variants.length;
      product.variants = product.variants.filter((item) => item.id !== variantId);
      product.images = product.images.map((image) => (image.variantId === variantId ? { ...image, variantId: null } : image));
      for (const damage of damages.values()) {
        if (damage.productId === productId && damage.variantId === variantId) damage.variantId = null;
      }
      if (product.variants.length === before) return false;
      product.updatedAt = stamp();
      return true;
    },
    async addImage(productId: string, input: Omit<CatalogImage, "id" | "position" | "isCover"> & { position?: number; isCover?: boolean }) {
      const product = requireProduct(productId);
      if (!product) return null;
      if (input.variantId && !product.variants.some((item) => item.id === input.variantId)) return null;
      const image: CatalogImage = {
        id: crypto.randomUUID(),
        variantId: input.variantId,
        url: input.url,
        alt: input.alt,
        position: input.position ?? product.images.length,
        isCover: input.isCover ?? product.images.length === 0,
      };
      if (image.isCover) {
        for (const item of product.images) item.isCover = false;
      }
      product.images.push(image);
      product.images.sort((a, b) => a.position - b.position);
      product.updatedAt = stamp();
      return copy(image);
    },
    async reorderImages(productId: string, order: { id: string; position: number; isCover?: boolean }[]) {
      const product = requireProduct(productId);
      if (!product) return null;
      const ids = new Set(product.images.map((item) => item.id));
      if (order.some((item) => !ids.has(item.id))) return null;
      for (const item of order) {
        const image = product.images.find((candidate) => candidate.id === item.id);
        if (!image) return null;
        image.position = item.position;
        if (item.isCover !== undefined) image.isCover = item.isCover;
      }
      if (!product.images.some((item) => item.isCover) && product.images[0]) {
        product.images[0].isCover = true;
      }
      product.images.sort((a, b) => a.position - b.position);
      product.updatedAt = stamp();
      return product.images.map((item) => copy(item));
    },
    async removeImage(productId: string, imageId: string) {
      const product = requireProduct(productId);
      if (!product) return false;
      const before = product.images.length;
      product.images = product.images.filter((item) => item.id !== imageId);
      if (product.images.length === before) return false;
      if (product.images.length > 0 && !product.images.some((item) => item.isCover)) {
        product.images[0]!.isCover = true;
      }
      product.updatedAt = stamp();
      return true;
    },
    async listAccessories() {
      return [...accessories.values()].map((item) => copy(item));
    },
    async createAccessory(input: Omit<CatalogAccessory, "id"> & { id?: string }) {
      if ([...accessories.values()].some((item) => item.slug === input.slug)) return { error: "slug_em_uso" as const };
      const accessory: CatalogAccessory = { ...input, id: input.id ?? crypto.randomUUID() };
      accessories.set(accessory.id, accessory);
      return { accessory: copy(accessory) };
    },
    async updateAccessory(id: string, patch: Partial<Omit<CatalogAccessory, "id">>) {
      const accessory = accessories.get(id);
      if (!accessory) return { error: "nao_encontrado" as const };
      if (patch.slug && [...accessories.values()].some((item) => item.slug === patch.slug && item.id !== id)) {
        return { error: "slug_em_uso" as const };
      }
      Object.assign(accessory, patch);
      return { accessory: copy(accessory) };
    },
    async removeAccessory(id: string) {
      if (!accessories.has(id)) return false;
      accessories.delete(id);
      for (const product of products.values()) {
        product.accessories = product.accessories.filter((link) => link.accessoryId !== id);
      }
      return true;
    },
    async listDamages() {
      return [...damages.values()].map((item) => copy(item));
    },
    async createDamage(input: Omit<CatalogDamage, "id" | "createdAt" | "images"> & { images?: { url: string; position?: number }[] }) {
      if (!products.has(input.productId)) return { error: "nao_encontrado" as const };
      const { images: imageInput, ...fields } = input;
      const damage: CatalogDamage = {
        ...fields,
        id: crypto.randomUUID(),
        createdAt: stamp(),
        images: (imageInput ?? []).map((image, index) => ({
          id: crypto.randomUUID(),
          url: image.url,
          position: image.position ?? index,
        })),
      };
      damages.set(damage.id, damage);
      return { damage: copy(damage) };
    },
    async updateDamage(id: string, patch: Partial<Omit<CatalogDamage, "id" | "createdAt" | "images">> & { images?: { url: string; position?: number }[] }) {
      const damage = damages.get(id);
      if (!damage) return { error: "nao_encontrado" as const };
      const { images, ...rest } = patch;
      Object.assign(damage, rest);
      if (images) {
        damage.images = images.map((image, index) => ({
          id: crypto.randomUUID(),
          url: image.url,
          position: image.position ?? index,
        }));
      }
      return { damage: copy(damage) };
    },
    async removeDamage(id: string) {
      return damages.delete(id);
    },
    async listBanners() {
      return [...banners.values()].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)).map((item) => copy(item));
    },
    async createBanner(input: Omit<CatalogBanner, "id" | "position"> & { id?: string; position?: number }) {
      const banner: CatalogBanner = {
        ...input,
        id: input.id ?? crypto.randomUUID(),
        position: input.position ?? banners.size,
      };
      banners.set(banner.id, banner);
      return copy(banner);
    },
    async updateBanner(id: string, patch: Partial<Omit<CatalogBanner, "id">>) {
      const banner = banners.get(id);
      if (!banner) return null;
      Object.assign(banner, patch);
      return copy(banner);
    },
    async removeBanner(id: string) {
      return banners.delete(id);
    },
    exportState(): CatalogState {
      return {
        products: [...products.values()].map((item) => copy(item)),
        accessories: [...accessories.values()].map((item) => copy(item)),
        damages: [...damages.values()].map((item) => copy(item)),
      };
    },
    importState(state: CatalogState) {
      products.clear();
      accessories.clear();
      damages.clear();
      for (const item of state.products) products.set(item.id, copy(item));
      for (const item of state.accessories) accessories.set(item.id, copy(item));
      for (const item of state.damages) damages.set(item.id, copy(item));
    },
  };
}

type MemoryCatalog = ReturnType<typeof createCatalog>;
export type Catalog = Omit<MemoryCatalog, "exportState" | "importState">;
