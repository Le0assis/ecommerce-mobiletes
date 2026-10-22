export type Category = "mobilete" | "scooter" | "naked" | "adventure" | "sport";

const categoryIds: Category[] = ["mobilete", "scooter", "naked", "adventure", "sport"];

export function isCategory(value: string): value is Category {
  return categoryIds.some((item) => item === value);
}

export const categoryLabel: Record<Category, string> = {
  mobilete: "Mobilete",
  scooter: "Scooter",
  naked: "Naked",
  adventure: "Adventure",
  sport: "Sport",
};

export type ColorOption = {
  id: string;
  name: string;
  hex: string;
  priceDeltaCents: number;
  stock: number;
};

export type AccessoryGroup = "protecao" | "conforto" | "carga" | "energia";

export type Accessory = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  group: AccessoryGroup;
};

export type Motorcycle = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: Category;
  description: string;
  basePriceCents: number;
  topSpeedKmh: number;
  rangeKm: number;
  powerKw: number;
  torqueNm: number;
  batteryKwh: number;
  weightKg: number;
  seatHeightMm: number;
  chargeHours: number;
  fastChargeMin: number | null;
  /** Texto de enquadramento. Não é aconselhamento jurídico. */
  licenseNote: string;
  colors: ColorOption[];
  accessoryIds: string[];
  optimalSpeedKmh: number;
};

const obsidiana = (stock: number): ColorOption => ({
  id: "obsidiana",
  name: "Obsidiana",
  hex: "#16171c",
  priceDeltaCents: 0,
  stock,
});

const nevoa = (stock: number): ColorOption => ({
  id: "nevoa",
  name: "Névoa",
  hex: "#c5c8ce",
  priceDeltaCents: 0,
  stock,
});

const sal = (stock: number, delta = 40_000): ColorOption => ({
  id: "sal",
  name: "Sal",
  hex: "#efeae2",
  priceDeltaCents: delta,
  stock,
});

const cobre = (stock: number): ColorOption => ({
  id: "cobre",
  name: "Cobre",
  hex: "#b87348",
  priceDeltaCents: 180_000,
  stock,
});

const circuito = (stock: number): ColorOption => ({
  id: "circuito",
  name: "Verde circuito",
  hex: "#d6ff3f",
  priceDeltaCents: 250_000,
  stock,
});

export const accessories: Accessory[] = [
  {
    id: "para-brisa",
    name: "Para-brisa alto",
    description: "Corta o vento na marginal e na serra sem tampar o farol.",
    priceCents: 49_000,
    group: "protecao",
  },
  {
    id: "protetor",
    name: "Protetor de carenagem",
    description: "Arco tubular para a moto sobreviver ao trânsito parado.",
    priceCents: 69_000,
    group: "protecao",
  },
  {
    id: "banco",
    name: "Banco conforto",
    description: "Espuma de maior densidade para quem passa de uma hora no selim.",
    priceCents: 59_000,
    group: "conforto",
  },
  {
    id: "baules",
    name: "Bauleto 35 L",
    description: "Capacete integral e um notebook. Fecha com a chave da moto.",
    priceCents: 89_000,
    group: "carga",
  },
  {
    id: "topcase",
    name: "Top case 45 L",
    description: "Volume de fim de semana. Encaixa no suporte original.",
    priceCents: 109_000,
    group: "carga",
  },
  {
    id: "garupa",
    name: "Suporte de garupa",
    description: "Base para baú e para quem divide o trajeto.",
    priceCents: 39_000,
    group: "carga",
  },
  {
    id: "bolsa",
    name: "Bolsa de quadro",
    description: "Ferramenta, trava e um carregador de telefone.",
    priceCents: 29_000,
    group: "carga",
  },
  {
    id: "carregador",
    name: "Carregador portátil",
    description: "Unidade compacta para tomada comum, quando a garagem não é sua.",
    priceCents: 129_000,
    group: "energia",
  },
];

export const motorcycles: Motorcycle[] = [
  {
    id: "lume-s",
    slug: "s",
    name: "LUME S",
    tagline: "A mobilete da volta curta.",
    category: "mobilete",
    description:
      "Para o raio em que o carro é desperdício e a bicicleta não chega. Passo baixo, rodas menores, bateria no assoalho e silêncio de verdade até 45 km/h.",
    basePriceCents: 1_490_000,
    topSpeedKmh: 45,
    rangeKm: 70,
    powerKw: 3,
    torqueNm: 42,
    batteryKwh: 2.1,
    weightKg: 78,
    seatHeightMm: 770,
    chargeHours: 4,
    fastChargeMin: null,
    licenseNote:
      "Enquadramento de ciclomotor elétrico a confirmar com o jurídico antes de publicar potência e exigência de CNH.",
    colors: [obsidiana(14), nevoa(9), sal(6, 20_000)],
    accessoryIds: ["bolsa", "carregador", "banco"],
    optimalSpeedKmh: 35,
  },
  {
    id: "lume-city",
    slug: "city",
    name: "LUME City",
    tagline: "Scooter para a cidade inteira.",
    category: "scooter",
    description:
      "Escudo frontal, assoalho plano e autonomia para ir e voltar sem pensar em tomada. Feita para corredor, não para planilha de pista.",
    basePriceCents: 2_190_000,
    topSpeedKmh: 95,
    rangeKm: 120,
    powerKw: 6.5,
    torqueNm: 98,
    batteryKwh: 3.8,
    weightKg: 122,
    seatHeightMm: 760,
    chargeHours: 5,
    fastChargeMin: 45,
    licenseNote: "Condução na categoria A. Confirmar potência contínua na homologação.",
    colors: [obsidiana(8), nevoa(5), sal(4), cobre(3)],
    accessoryIds: ["para-brisa", "baules", "garupa", "carregador", "banco"],
    optimalSpeedKmh: 50,
  },
  {
    id: "lume-via",
    slug: "via",
    name: "LUME Via",
    tagline: "Naked urbana, torque imediato.",
    category: "naked",
    description:
      "Quadro à vista, bateria no centro e uma resposta que o semáforo não espera. O meio de linha para quem quer moto, não scooter.",
    basePriceCents: 3_490_000,
    topSpeedKmh: 130,
    rangeKm: 180,
    powerKw: 15,
    torqueNm: 168,
    batteryKwh: 7.4,
    weightKg: 172,
    seatHeightMm: 805,
    chargeHours: 6,
    fastChargeMin: 35,
    licenseNote: "Condução na categoria A.",
    colors: [obsidiana(6), nevoa(4), sal(3), cobre(4)],
    accessoryIds: ["protetor", "banco", "garupa", "bolsa", "carregador", "baules"],
    optimalSpeedKmh: 70,
  },
  {
    id: "lume-serra",
    slug: "serra",
    name: "LUME Serra",
    tagline: "Adventure para a estrada que sobra.",
    category: "adventure",
    description:
      "Suspensão alta, bico contra o vento e autonomia de quem sai da cidade no feriado. A bateria maior também é o tanque.",
    basePriceCents: 4_690_000,
    topSpeedKmh: 150,
    rangeKm: 230,
    powerKw: 18,
    torqueNm: 196,
    batteryKwh: 10.4,
    weightKg: 198,
    seatHeightMm: 845,
    chargeHours: 8,
    fastChargeMin: 32,
    licenseNote: "Condução na categoria A.",
    colors: [obsidiana(4), nevoa(2), sal(0), cobre(3)],
    accessoryIds: ["para-brisa", "protetor", "banco", "topcase", "garupa", "carregador"],
    optimalSpeedKmh: 80,
  },
  {
    id: "lume-apex",
    slug: "apex",
    name: "LUME Apex",
    tagline: "A flagship. Silêncio em 180 km/h.",
    category: "sport",
    description:
      "Carenagem fechada, bateria de 14,6 kWh e a autonomia mais longa da linha. O número grande do hero é este: 180 km/h, até 280 km.",
    basePriceCents: 6_290_000,
    topSpeedKmh: 180,
    rangeKm: 280,
    powerKw: 30,
    torqueNm: 242,
    batteryKwh: 14.6,
    weightKg: 214,
    seatHeightMm: 820,
    chargeHours: 9,
    fastChargeMin: 28,
    licenseNote: "Condução na categoria A. Série de lançamento com estoque contado.",
    colors: [obsidiana(5), nevoa(3), sal(2), cobre(2), circuito(2)],
    accessoryIds: ["protetor", "banco", "bolsa", "carregador", "garupa"],
    optimalSpeedKmh: 90,
  },
];

export function getMotorcycle(idOrSlug: string): Motorcycle | undefined {
  return motorcycles.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
}

export function getAccessory(id: string): Accessory | undefined {
  return accessories.find((item) => item.id === id);
}

export function accessoriesFor(product: Motorcycle): Accessory[] {
  return product.accessoryIds
    .map((id) => getAccessory(id))
    .filter((item): item is Accessory => Boolean(item));
}

export function searchCatalog(query: string): Motorcycle[] {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return motorcycles;
  return motorcycles.filter((item) => {
    const haystack = [
      item.name,
      item.tagline,
      item.category,
      categoryLabel[item.category],
      item.description,
      `${item.topSpeedKmh}`,
      `${item.rangeKm}`,
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");
    return haystack.includes(normalized);
  });
}
