export type Dealer = {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  uf: string;
  cep: string;
  lat: number;
  lng: number;
  phone: string;
  hours: string;
  testRideSlugs: string[];
};

export type Review = {
  id: string;
  productSlug: string;
  city: string;
  rating: number;
  title: string;
  body: string;
  monthsUsing: number;
  /** Caminho público de uma foto de demonstração. Sem rosto. */
  photo?: string;
};

export type Banner = {
  id: string;
  slot: "home-hero" | "home-faixa";
  eyebrow: string;
  title: string;
  href: string;
  active: boolean;
};

/** Lojas de demonstração. Endereço comercial real entra quando o contrato existir. */
export const dealers: Dealer[] = [
  {
    id: "sp-vila-madalena",
    name: "LUME São Paulo",
    neighborhood: "Vila Madalena",
    city: "São Paulo",
    uf: "SP",
    cep: "05435-000",
    lat: -23.5465,
    lng: -46.6908,
    phone: "(11) 4000-1900",
    hours: "Ter–sáb, 11h–19h",
    testRideSlugs: ["s", "city", "via", "apex", "pico", "onda", "rua"],
  },
  {
    id: "rj-botafogo",
    name: "LUME Rio",
    neighborhood: "Botafogo",
    city: "Rio de Janeiro",
    uf: "RJ",
    cep: "22250-040",
    lat: -22.9519,
    lng: -43.1848,
    phone: "(21) 4000-1900",
    hours: "Ter–sáb, 11h–19h",
    testRideSlugs: ["city", "via", "serra"],
  },
  {
    id: "bh-savassi",
    name: "LUME Belo Horizonte",
    neighborhood: "Savassi",
    city: "Belo Horizonte",
    uf: "MG",
    cep: "30130-000",
    lat: -19.9386,
    lng: -43.9332,
    phone: "(31) 4000-1900",
    hours: "Ter–sáb, 11h–19h",
    testRideSlugs: ["s", "city", "serra"],
  },
  {
    id: "cwb-batel",
    name: "LUME Curitiba",
    neighborhood: "Batel",
    city: "Curitiba",
    uf: "PR",
    cep: "80420-000",
    lat: -25.4422,
    lng: -49.2892,
    phone: "(41) 4000-1900",
    hours: "Ter–sáb, 11h–19h",
    testRideSlugs: ["city", "via", "serra"],
  },
  {
    id: "poa-moinhos",
    name: "LUME Porto Alegre",
    neighborhood: "Moinhos de Vento",
    city: "Porto Alegre",
    uf: "RS",
    cep: "90560-000",
    lat: -30.0277,
    lng: -51.2014,
    phone: "(51) 4000-1900",
    hours: "Ter–sáb, 11h–19h",
    testRideSlugs: ["via", "serra", "apex"],
  },
];

export const reviews: Review[] = [
  {
    id: "rv-apex-sp",
    productSlug: "apex",
    city: "São Paulo",
    rating: 5,
    title: "O silêncio muda o caminho",
    body: "Uso a Apex na Marginal e o que impressiona não é a velocidade. É chegar sem o barulho do dia. A carga em casa cobre a semana.",
    monthsUsing: 4,
    photo: "/reviews/apex.svg",
  },
  {
    id: "rv-city-rj",
    productSlug: "city",
    city: "Rio de Janeiro",
    rating: 5,
    title: "Substituiu o carro na semana",
    body: "Botafogo–Centro todo dia, com folga de bateria. O para-brisa alto vale o acessório quando venta na orla.",
    monthsUsing: 7,
    photo: "/reviews/city.svg",
  },
  {
    id: "rv-s-bh",
    productSlug: "s",
    city: "Belo Horizonte",
    rating: 4,
    title: "Certa para o bairro",
    body: "Não serve para a BR. Serve para tudo o que eu andava de carro em menos de vinte minutos. Leve de estacionar.",
    monthsUsing: 3,
  },
  {
    id: "rv-serra-poa",
    productSlug: "serra",
    city: "Porto Alegre",
    rating: 5,
    title: "A serra com tomada no hotel",
    body: "Fui até a serra no modo cidade e ainda sobreu carga. No esporte a autonomia cai, e a calculadora do site avisou antes.",
    monthsUsing: 6,
  },
];

export const banners: Banner[] = [
  {
    id: "hero-apex",
    slot: "home-hero",
    eyebrow: "Coleção 2026",
    title: "A cidade em silêncio.",
    href: "/motos/apex",
    active: true,
  },
  {
    id: "faixa-pix",
    slot: "home-faixa",
    eyebrow: "Pagamento",
    title: "5% no Pix. 21x sem juros no cartão.",
    href: "/motos/apex",
    active: true,
  },
];

export function getDealer(id: string): Dealer | undefined {
  return dealers.find((item) => item.id === id);
}

export function reviewsFor(slug: string): Review[] {
  return reviews.filter((item) => item.productSlug === slug);
}
