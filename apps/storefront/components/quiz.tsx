"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { estimateFuelSavings, formatBRL, installmentByCount, recommendMotorcycles, type QuizAnswers } from "@/lib/catalog";
import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

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
];

export function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const reduce = useReducedMotion();
  const current = steps[step];
  const done = step >= steps.length;
  const result = done ? recommendMotorcycles(answers as QuizAnswers) : [];

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
                  setAnswers((previous) => ({ ...previous, [current.key]: option.value }));
                  setStep((value) => value + 1);
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
          {result.map((item) => (
            <article key={item.product.id} className="rounded-[1.8rem] border border-white/10 p-6">
              <h2 className="display text-5xl">{item.product.name}</h2>
              <p className="nums mt-2 text-lg">
                {formatBRL(item.product.basePriceCents)} · 21× de {formatBRL(installmentByCount(item.product.basePriceCents, 21).installmentCents)}
              </p>
              <p className="nums mt-2 text-sm text-muted-foreground">
                Energia contra um carro de 12 km/L, em 800 km/mês:{" "}
                {formatBRL(
                  estimateFuelSavings({
                    kmPerMonth: 800,
                    batteryKwh: item.product.batteryKwh ?? 1,
                    rangeKm: item.product.rangeKm,
                    electricityCentsPerKwh: 95,
                    gasolineCentsPerLiter: 649,
                    gasolineKmPerLiter: 12,
                  }).savedMonthCents,
                )}{" "}
                de diferença estimada
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
                {item.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {item.accessories.length > 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Acessórios: {item.accessories.map((accessory) => accessory.name).join(", ")}.
                </p>
              ) : null}
              <Link href={`/motos/${item.product.slug}`} className={cn(buttonVariants(), "mt-5 h-11 rounded-full")}>
                Configurar
              </Link>
            </article>
          ))}
          <Button variant="ghost" className="justify-start px-0" onClick={() => { setStep(0); setAnswers({}); }}>
            Refazer
          </Button>
        </div>
      )}
    </div>
  );
}
