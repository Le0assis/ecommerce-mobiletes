import { whatsappGreeting, whatsappHref } from "@/lib/whatsapp";

export type HomeSlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string | null;
  external: boolean;
};

type ApiBanner = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  href: string;
  imageUrl?: string | null;
  position?: number;
  active: boolean;
};

function fromBanner(item: ApiBanner): HomeSlide {
  return {
    id: item.id,
    eyebrow: item.eyebrow ?? "LUME",
    title: item.title,
    subtitle: item.subtitle ?? "",
    href: item.href,
    imageUrl: item.imageUrl ?? null,
    external: item.href.startsWith("http"),
  };
}

const extras: HomeSlide[] = [
  {
    id: "quiz",
    eyebrow: "Quiz",
    title: "Me ajude a escolher.",
    subtitle: "Oito perguntas e até três modelos.",
    href: "/me-ajude-a-escolher",
    imageUrl: null,
    external: false,
  },
  {
    id: "whatsapp",
    eyebrow: "Conversa",
    title: "Fale no WhatsApp.",
    subtitle: "Enquanto não há loja física.",
    href: whatsappHref(whatsappGreeting),
    imageUrl: null,
    external: true,
  },
];

function fillSlides(slides: HomeSlide[]): HomeSlide[] {
  const next = [...slides];
  for (const extra of extras) {
    if (next.length >= 3) break;
    if (next.some((item) => item.href === extra.href)) continue;
    next.push(extra);
  }
  return next.slice(0, 5);
}

/** Banners ativos da API. Sem resposta, ficam o quiz e o WhatsApp. Não usa o catálogo do código. */
export async function loadHomeSlides(): Promise<HomeSlide[]> {
  const base = process.env.COMMERCE_API_URL ?? "http://127.0.0.1:8787";
  try {
    const response = await fetch(`${base}/v1/banners`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return fillSlides([]);
    const body = (await response.json()) as { banners?: ApiBanner[] };
    const slides = (body.banners ?? []).filter((item) => item.active).map(fromBanner);
    return fillSlides(slides);
  } catch {
    return fillSlides([]);
  }
}
