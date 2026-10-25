import { DomainError } from "./errors";

export type ShippingService = {
  id: "dedicado";
  carrier: string;
  label: string;
  priceCents: number;
  days: number;
};

export type ShippingQuote = {
  cep: string;
  zone: string;
  region: string;
  services: ShippingService[];
};

type Zone = {
  region: string;
  baseCents: number;
  days: number;
  perKgCents: number;
};

/**
 * Tabela de referência por prefixo de CEP, até existir contrato com
 * transportadora (Melhor Envio ou frete dedicado). Não é cotação dos Correios.
 */
const zones: Record<string, Zone> = {
  "0": { region: "São Paulo capital e entorno", baseCents: 29_000, days: 3, perKgCents: 180 },
  "1": { region: "Interior de São Paulo", baseCents: 39_000, days: 5, perKgCents: 210 },
  "2": { region: "Rio de Janeiro e Espírito Santo", baseCents: 49_000, days: 6, perKgCents: 240 },
  "3": { region: "Minas Gerais", baseCents: 52_000, days: 6, perKgCents: 250 },
  "4": { region: "Bahia e Sergipe", baseCents: 79_000, days: 9, perKgCents: 320 },
  "5": { region: "Nordeste leste", baseCents: 89_000, days: 11, perKgCents: 340 },
  "6": { region: "Nordeste oeste e Norte", baseCents: 119_000, days: 14, perKgCents: 390 },
  "7": { region: "Centro-Oeste e Norte", baseCents: 84_000, days: 9, perKgCents: 310 },
  "8": { region: "Paraná e Santa Catarina", baseCents: 46_000, days: 5, perKgCents: 230 },
  "9": { region: "Rio Grande do Sul", baseCents: 54_000, days: 7, perKgCents: 250 },
};

export function normalizeCep(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  if (digits === "00000000") return null;
  return digits;
}

export function formatCep(cep: string): string {
  const digits = normalizeCep(cep);
  if (!digits) return cep;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Frete dedicado aceita peso acima de zero e até 400 kg. */
export function assertShippingWeight(weightKg: number) {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 400) {
    throw new DomainError("peso_invalido", "Peso fora da faixa de transporte.");
  }
}

export function quoteShipping(cepInput: string, weightKg: number): ShippingQuote {
  const cep = normalizeCep(cepInput);
  if (!cep) {
    throw new DomainError("cep_invalido", "Informe um CEP com 8 dígitos.");
  }
  assertShippingWeight(weightKg);

  const zone = zones[cep[0]];
  if (!zone) {
    throw new DomainError("cep_invalido", "CEP fora das zonas atendidas.");
  }

  const weightCents = Math.round(weightKg * zone.perKgCents);
  const services: ShippingService[] = [
    {
      id: "dedicado",
      carrier: "Transporte dedicado",
      label: "Entrega da moto em casa",
      priceCents: zone.baseCents + weightCents,
      days: zone.days,
    },
  ];

  return {
    cep,
    zone: cep[0] ?? "",
    region: zone.region,
    services,
  };
}
