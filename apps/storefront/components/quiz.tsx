"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { estimateFuelSavings, formatBRL, installmentByCount, type QuizAnswers, type StoreProduct } from "@/lib/catalog";
import { whatsappHref } from "@/lib/whatsapp";
import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";

type QuizHit = {
  slug: string;
  name: string;
  score: number;
  reasons: string[];
  accessories: { kind: string; name: string; reason: string }[];
};

const steps: {
  key: keyof QuizAnswers;
  title: string;
  options: { label: string; value: QuizAnswers[keyof QuizAnswers] }[];
}[] = [
  {
    key: "use",
    title: "Qual é o uso?",
    options: [
      { label: "Trabalho", value: "trabalho" },
      { label: "Entregas", value: "entregas" },
      { label: "Passeio", value: "passeio" },
      { label: "Levar criança", value: "crianca" },
    ],
  },
  {
    key: "dailyKm",
    title: "Quantos quilômetros por dia?",
    options: [
      { label: "Até 20", value: "ate20" },
      { label: "20 a 40", value: "20a40" },
      { label: "40 a 70", value: "40a70" },
      { label: "Mais de 70", value: "mais70" },
    ],
  },
  {
    key: "hills",
    title: "Tem ladeira no caminho?",
    options: [
      { label: "Sim", value: true },
      { label: "Não", value: false },
    ],
  },
  {
    key: "charging",
    title: "Onde você carrega?",
    options: [
      { label: "Na tomada da garagem", value: "tomada" },
      { label: "Preciso tirar a bateria", value: "removivel" },
    ],
  },
  {
    key: "carry",
    title: "O que vai junto?",
    options: [
      { label: "Só eu", value: "sozinho" },
      { label: "Passageiro", value: "passageiro" },
      { label: "Criança", value: "crianca" },
      { label: "Pet", value: "pet" },
    ],
  },
  {
    key: "cargo",
    title: "Que carga você leva?",
    options: [
      { label: "Baú", value: "bau" },
      { label: "Cesta na frente", value: "cesta" },
      { label: "Nenhuma", value: "nenhum" },
    ],
  },
  {
    key: "budget",
    title: "Qual é o orçamento?",
    options: [
      { label: "Até R$ 6 mil", value: "ate6" },
      { label: "R$ 6 a 10 mil", value: "6a10" },
      { label: "Mais de R$ 10 mil", value: "mais10" },
    ],
  },
  {
    key: "style",
    title: "Qual estilo?",
    options: [
      { label: "Retrô", value: "retro" },
      { label: "Citycoco", value: "citycoco" },
      { label: "Esportivo", value: "esportivo" },
    ],
  },
  {
    key: "color",
    title: "E a cor?",
    options: [
      { label: "Escura", value: "escura" },
      { label: "Clara", value: "clara" },
      { label: "Quente", value: "quente" },
      { label: "Tanto faz", value: "indiferente" },
    ],
  },
  {
    key: "withoutCnh",
    title: "Quer andar sem CNH?",
    options: [
      { label: "Sim", value: true },
      { label: "Não", value: false },
    ],
  },
];

const budgetCeiling: Record<QuizAnswers["budget"], number | null> = {
  ate6: 600_000,
  "6a10": 1_000_000,
  mais10: null,
};

const budgetLabel: Record<QuizAnswers["budget"], string> = {
  ate6: "até R$ 6 mil",
  "6a10": "de R$ 6 a 10 mil",
  mais10: "acima de R$ 10 mil",
};

function nearestProducts(products: StoreProduct[], budget?: QuizAnswers["budget"], withoutCnh?: boolean) {
  const pool = withoutCnh ? products.filter((item) => item.autopropelido.eligible) : products;
  const ceiling = budget ? budgetCeiling[budget] : null;
  const sorted = [...pool].sort(
    (a, b) => a.basePriceCents - b.basePriceCents || a.name.localeCompare(b.name, "pt-BR"),
  );
  if (ceiling == null) return { above: false, options: sorted.slice(0, 3) };
  const inside = sorted.filter((item) => item.basePriceCents <= ceiling);
  if (inside.length > 0) return { above: false, options: inside.slice(0, 3) };
  return { above: true, options: sorted.filter((item) => item.basePriceCents > ceiling).slice(0, 3) };
}

export function Quiz({ products, catalogMessage }: { products: StoreProduct[]; catalogMessage: string | null }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [result, setResult] = useState<QuizHit[]>([]);
  const [pending, setPending] = useState(false);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const reduce = useReducedMotion();
  const current = steps[step];
  const done = step >= steps.length;

  async function ask(payload: QuizAnswers) {
    const id = request.current + 1;
    request.current = id;
    setPending(true);
    setSettled(false);
    setError("");
    try {
      const response = await fetch("/api/commerce/v1/quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string; recommendations?: QuizHit[] };
      if (request.current !== id) return;
      if (!response.ok) throw new Error(body.message ?? "O quiz não respondeu.");
      const hits = body.recommendations ?? [];
      setResult(
        payload.withoutCnh
          ? hits.filter((item) => products.some((product) => product.slug === item.slug && product.autopropelido.eligible))
          : hits,
      );
    } catch (cause) {
      if (request.current !== id) return;
      setError(cause instanceof Error ? cause.message : "O quiz não respondeu.");
    } finally {
      if (request.current === id) {
        setPending(false);
        setSettled(true);
      }
    }
  }

  return (
    <div className="mt-10">
      {current && !done ? (
        <motion.div
          key={current.key}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="text-sm text-muted-foreground">
            {step + 1} / {steps.length}
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="h-full bg-signal" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          <h2 className="mt-6 text-4xl font-light">{current.title}</h2>
          <div className="mt-6 grid gap-3">
            {current.options.map((option) => (
              <Button
                key={String(option.value)}
                variant="outline"
                className="h-14 justify-start rounded-full border-white/15 px-5 text-base"
                onClick={() => {
                  const next = { ...answers, [current.key]: option.value };
                  const nextStep = step + 1;
                  setAnswers(next);
                  setStep(nextStep);
                  if (nextStep >= steps.length) void ask(next as QuizAnswers);
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {step > 0 ? (
            <Button variant="ghost" className="mt-4 px-0" onClick={() => setStep((value) => value - 1)}>
              Voltar
            </Button>
          ) : null}
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {catalogMessage ? <p className="text-sm text-signal">{catalogMessage} Os nomes ainda vêm do quiz.</p> : null}
          {pending ? <p className="text-muted-foreground">Calculando os modelos…</p> : null}
          {error ? <p className="text-sm text-signal">{error}</p> : null}
          {settled && !pending && !error && result.length === 0 ? (
            <EmptyQuiz products={products} budget={answers.budget} withoutCnh={answers.withoutCnh === true} />
          ) : null}
          {result.map((item) => {
            const product = products.find((entry) => entry.slug === item.slug);
            const savings =
              product && typeof product.batteryKwh === "number" && typeof product.rangeKm === "number"
                ? estimateFuelSavings({
                    kmPerMonth: 800,
                    batteryKwh: product.batteryKwh,
                    rangeKm: product.rangeKm,
                    electricityCentsPerKwh: 95,
                    gasolineCentsPerLiter: 649,
                    gasolineKmPerLiter: 12,
                  }).savedMonthCents
                : null;
            return (
              <article key={item.slug} className="rounded-[1.8rem] border border-white/10 p-6">
                <h2 className="display text-5xl">{item.name}</h2>
                {product ? (
                  <p className="nums mt-2 text-lg">
                    {formatBRL(product.basePriceCents)} · 21× de {formatBRL(installmentByCount(product.basePriceCents, 21).installmentCents)}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">O preço deste modelo não veio na lista.</p>
                )}
                {savings != null ? (
                  <p className="nums mt-2 text-sm text-muted-foreground">
                    Energia contra um carro de 12 km/L, em 800 km/mês: {formatBRL(savings)} de diferença estimada
                  </p>
                ) : null}
                <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
                  {item.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                {item.accessories.length > 0 ? (
                  <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
                    {item.accessories.map((accessory) => (
                      <li key={accessory.kind}>
                        {accessory.name}. {accessory.reason}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Link href={`/motos/${item.slug}`} className={cn(buttonVariants(), "mt-5 h-11 rounded-full")}>
                  Configurar
                </Link>
              </article>
            );
          })}
          <Button
            variant="ghost"
            className="justify-start px-0"
            onClick={() => {
              request.current += 1;
              setStep(0);
              setAnswers({});
              setResult([]);
              setPending(false);
              setSettled(false);
              setError("");
            }}
          >
            Refazer
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyQuiz({
  products,
  budget,
  withoutCnh = false,
}: {
  products: StoreProduct[];
  budget?: QuizAnswers["budget"];
  withoutCnh?: boolean;
}) {
  const label = budget ? budgetLabel[budget] : "nesse recorte";
  const { above, options } = nearestProducts(products, budget, withoutCnh);
  let note = "O quiz veio vazio. Estes cabem no orçamento no catálogo, com o preço da API.";
  if (options.length === 0 && withoutCnh) {
    note = "Nenhum modelo com o selo de autopropelido entrou neste catálogo. O WhatsApp segue aberto.";
  } else if (options.length === 0) {
    note = "O catálogo não trouxe modelo para comparar. O WhatsApp segue aberto.";
  } else if (above) {
    note = `O teto ${label} deixa a lista vazia. Estas são as mais próximas no catálogo, com o preço da API.`;
  }
  return (
    <div className="rounded-[1.8rem] border border-white/10 p-6">
      <h2 className="text-3xl font-light">Nenhum modelo cabe nessa combinação.</h2>
      <p className="mt-3 text-sm text-muted-foreground">{note}</p>
      {options.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {options.map((product) => (
            <li key={product.slug} className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/motos/${product.slug}`} className="text-lg">
                {product.name}
              </Link>
              <span className="nums text-sm text-muted-foreground">{formatBRL(product.basePriceCents)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <a
        href={whatsappHref(`Olá, o quiz não encontrou moto ${label}. Quero ver a opção mais próxima.`)}
        className={cn(buttonVariants(), "mt-5 h-11 rounded-full")}
        target="_blank"
        rel="noreferrer"
      >
        Falar no WhatsApp
      </a>
    </div>
  );
}
