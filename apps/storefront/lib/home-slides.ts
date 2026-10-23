import { banners, type Banner } from "@/lib/catalog";
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

function fromBanner(item: Banner): HomeSlide {
  return {
    id: item.id,
    eyebrow: item.eyebrow,
    title: item.title,
    subtitle: item.subtitle ?? "",
    href: item.href,
    imageUrl: item.imageUrl ?? null,
    external: item.href.startsWith("http"),
  };
}

function fallbackSlides(): HomeSlide[] {
  return banners
    .filter((item) => item.active)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id.localeCompare(b.id))
    .map(fromBanner);
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

/** Banners ativos da API. Se a API não responder, usa a mesma lista do domínio. */
export async function loadHomeSlides(): Promise<HomeSlide[]> {
  const base = process.env.COMMERCE_API_URL ?? "http://127.0.0.1:8787";
  try {
    const response = await fetch(`${base}/v1/banners`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return fillSlides(fallbackSlides());
    const body = (await response.json()) as { banners?: Banner[] };
    const slides = (body.banners ?? []).filter((item) => item.active).map(fromBanner);
    return fillSlides(slides.length > 0 ? slides : fallbackSlides());
  } catch {
    return fillSlides(fallbackSlides());
  }
}
