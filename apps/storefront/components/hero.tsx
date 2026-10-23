"use client";

import { BikeSvg } from "@/components/bike-svg";
import { HeroFilm } from "@/components/hero-film";
import { buttonVariants } from "@/components/ui/button";
import { formatBRL, installmentByCount } from "@lume/domain";
import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

export function Hero({
  name,
  speed,
  range,
  priceCents,
  pixCents,
  anchor = true,
}: {
  name: string;
  speed: number;
  range: number;
  priceCents: number;
  pixCents: number;
  anchor?: boolean;
}) {
  const reduce = useReducedMotion();
  const plan = installmentByCount(priceCents, 21);
  const motionProps = reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <section className="relative min-h-[100svh] overflow-hidden" id={anchor ? "conteudo" : undefined}>
      <HeroFilm />
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col px-5 pt-28 pb-28">
        <motion.p {...motionProps} className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
          Coleção 2026 · {name}
        </motion.p>
        <motion.h1
          {...motionProps}
          data-testid="hero-title"
          className="display mt-4 max-w-5xl text-[clamp(4.6rem,13vw,9.5rem)] text-paper"
        >
          A cidade
          <br />
          em silêncio<span className="text-signal">.</span>
        </motion.h1>
        <div className="relative mt-2 flex-1">
          <BikeSvg variant="sport" color="#f4f4f2" title={name} className="mx-auto w-full max-w-4xl" />
        </div>
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <dl className="nums grid grid-cols-2 gap-6 text-paper md:max-w-md">
            <div>
              <dt className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Velocidade</dt>
              <dd className="display text-6xl md:text-7xl">
                {speed}
                <span className="ml-2 text-lg font-normal tracking-normal text-muted-foreground">km/h</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-[0.12em] text-muted-foreground uppercase" aria-label="Autonomia declarada pelo fabricante" title="Autonomia declarada pelo fabricante">
                Autonomia (declarada)
              </dt>
              <dd className="display text-6xl md:text-7xl">
                {range}
                <span className="ml-2 text-lg font-normal tracking-normal text-muted-foreground">km</span>
              </dd>
            </div>
          </dl>
          <aside className="rounded-[1.8rem] border border-white/10 bg-black/45 p-5 backdrop-blur-xl md:min-w-[22rem]">
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">No cartão</p>
            <p className="display nums text-6xl" data-testid="installment-price">
              21×
            </p>
            <p className="nums text-lg">de {formatBRL(plan.installmentCents)} sem juros</p>
            <p className="nums mt-1 text-sm text-muted-foreground">Total {formatBRL(priceCents)}</p>
            <p className="mt-4 flex items-center gap-3" data-testid="pix-price">
              <span className="rounded-full bg-pix px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-[#04221e]">PIX</span>
              <span className="nums text-lg">{formatBRL(pixCents)}</span>
              <span className="text-sm text-muted-foreground">−5%</span>
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link href="/motos/apex" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-6 text-base")}>
                Reservar a Apex
              </Link>
              <Link href="/motos/apex" className="text-sm text-paper underline-offset-4 hover:underline">
                Configurar
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
