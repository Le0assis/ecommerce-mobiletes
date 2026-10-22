import { DomainError } from "./errors";

export type InstallmentPlan = {
  count: number;
  interestFree: boolean;
  monthlyRate: number;
  installmentCents: number;
  totalCents: number;
};

/**
 * Campanha de lançamento, no padrão de varejo brasileiro (Voltage):
 * até 21x sem juros. A tabela de juros continua no código para o financeiro
 * encurtar a carência sem reescrever o checkout — basta baixar este número.
 */
export const LAUNCH_INTEREST_FREE_UP_TO = 21;
export const MAX_INSTALLMENTS = 21;

export type InstallmentOptions = {
  max?: number;
  interestFreeUpTo?: number;
};

function rateFor(count: number, interestFreeUpTo: number): number {
  if (count <= interestFreeUpTo) return 0;
  if (count <= 12) return 0.0149;
  return 0.0199;
}

/** Parcela da Tabela Price, arredondada uma vez para centavos. */
export function priceInstallment(principalCents: number, monthlyRate: number, count: number): number {
  if (monthlyRate === 0) return Math.round(principalCents / count);
  const growth = (1 + monthlyRate) ** count;
  return Math.round((principalCents * monthlyRate * growth) / (growth - 1));
}

export function simulateInstallments(amountCents: number, options: InstallmentOptions = {}): InstallmentPlan[] {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new DomainError("valor_invalido", "Informe um valor em centavos maior que zero.");
  }
  const interestFreeUpTo = options.interestFreeUpTo ?? LAUNCH_INTEREST_FREE_UP_TO;
  const ceiling = Math.min(Math.max(1, options.max ?? MAX_INSTALLMENTS), MAX_INSTALLMENTS);
  const plans: InstallmentPlan[] = [];

  for (let count = 1; count <= ceiling; count += 1) {
    const monthlyRate = rateFor(count, interestFreeUpTo);
    const interestFree = monthlyRate === 0;
    const installmentCents = priceInstallment(amountCents, monthlyRate, count);
    plans.push({
      count,
      interestFree,
      monthlyRate,
      installmentCents,
      totalCents: interestFree ? amountCents : installmentCents * count,
    });
  }

  return plans;
}

export function installmentByCount(
  amountCents: number,
  count: number,
  options: InstallmentOptions = {},
): InstallmentPlan {
  if (count < 1 || count > MAX_INSTALLMENTS) {
    throw new DomainError("parcelas_invalidas", "O cartão parcela de 1 a 21 vezes.");
  }
  const plan = simulateInstallments(amountCents, { ...options, max: count }).find((item) => item.count === count);
  if (!plan) {
    throw new DomainError("parcelas_invalidas", "Não foi possível calcular essa parcela.");
  }
  return plan;
}
