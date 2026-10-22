"use client";

import { Button } from "@/components/ui/button";
import { formatBRL, installmentByCount, recommendMotorcycles, type QuizAnswers } from "@lume/domain";
import Link from "next/link";
import { useState } from "react";

const steps: {
  key: keyof QuizAnswers;
  title: string;
  options: { label: string; value: QuizAnswers[keyof QuizAnswers] }[];
}[] = [
  {
    key: "use",
    title: "Onde você anda?",
    options: [
      { label: "Cidade", value: "cidade" },
      { label: "Cidade e estrada", value: "misto" },
      { label: "Estrada", value: "estrada" },
    ],
  },
  {
    key: "dailyKm",
    title: "Quantos quilômetros por dia?",
    options: [
      { label: "Até 30", value: "ate30" },
      { label: "30 a 80", value: "30a80" },
      { label: "80 a 150", value: "80a150" },
      { label: "Mais de 150", value: "mais150" },
    ],
  },
  {
    key: "pace",
    title: "Que velocidade você precisa?",
    options: [
      { label: "Até 50 km/h", value: "ate50" },
      { label: "Até 110 km/h", value: "ate110" },
      { label: "Sem teto baixo", value: "livre" },
    ],
  },
  {
    key: "budgetCents",
    title: "Até quanto, antes dos acessórios?",
    options: [
      { label: formatBRL(1_800_000), value: 1_800_000 },
      { label: formatBRL(2_500_000), value: 2_500_000 },
      { label: formatBRL(4_000_000), value: 4_000_000 },
      { label: formatBRL(7_000_000), value: 7_000_000 },
    ],
  },
  {
    key: "outlet",
    title: "Tem tomada na garagem?",
    options: [
      { label: "Sim", value: true },
      { label: "Não", value: false },
    ],
  },
  {
    key: "passenger",
    title: "Anda com garupa?",
    options: [
      { label: "Sozinho", value: "sozinho" },
      { label: "Às vezes", value: "garupa" },
    ],
  },
];

export function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const current = steps[step];
  const done = step >= steps.length;
  const result = done ? recommendMotorcycles(answers as QuizAnswers) : [];

  return (
    <div className="mt-10">
      {current && !done ? (
        <div>
          <p className="text-sm text-muted-foreground">
            {step + 1} / {steps.length}
          </p>
          <h2 className="mt-3 text-4xl font-light">{current.title}</h2>
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
        </div>
      ) : (
        <div className="grid gap-4">
          {result.map((item) => (
            <article key={item.product.id} className="rounded-[1.8rem] border border-white/10 p-6">
              <h2 className="display text-5xl">{item.product.name}</h2>
              <p className="nums mt-2 text-lg">
                {formatBRL(item.product.basePriceCents)} · 21× de {formatBRL(installmentByCount(item.product.basePriceCents, 21).installmentCents)}
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
                {item.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <Link href={`/motos/${item.product.slug}`} className="mt-4 inline-block text-sm underline">
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
