"use client";

import { BikeSvg } from "@/components/bike-svg";
import { buttonVariants } from "@/components/ui/button";
import type { HomeSlide } from "@/lib/home-slides";
import { cn } from "cn";
import { useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const art = ["sport", "scooter", "mobilete"] as const;

export function HomeCarousel({ slides }: { slides: HomeSlide[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (reduce || paused || count < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), 6000);
    return () => window.clearInterval(timer);
  }, [reduce, paused, count]);

  if (count === 0) return null;
  const current = slides[index] ?? slides[0];
  if (!current) return null;

  function go(next: number) {
    setIndex((next + count) % count);
  }

  return (
    <section
      id="conteudo"
      className="relative min-h-[28rem] overflow-hidden border-b border-white/10 bg-[#08080a] pt-24 md:min-h-[36rem]"
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mx-auto grid min-h-[24rem] max-w-6xl items-end gap-8 px-5 py-16 md:min-h-[32rem] md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{current.eyebrow}</p>
          <h2 className="display mt-4 max-w-3xl text-5xl text-paper md:text-7xl">{current.title}</h2>
          {current.subtitle ? <p className="mt-4 max-w-md text-muted-foreground">{current.subtitle}</p> : null}
          {current.external ? (
            <a href={current.href} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "mt-8 h-12 rounded-full border-white/20 px-6")}>
              Abrir
            </a>
          ) : (
            <Link href={current.href} className={cn(buttonVariants({ variant: "outline" }), "mt-8 h-12 rounded-full border-white/20 px-6")}>
              Ver
            </Link>
          )}
        </div>
        <div className="relative hidden h-64 overflow-hidden rounded-[2rem] border border-white/10 bg-[#101013] md:block">
          {current.imageUrl ? (
            <Image src={current.imageUrl} alt="" fill className="object-cover" sizes="40vw" />
          ) : (
            <BikeSvg variant={art[index % art.length] ?? "scooter"} color="#f4f4f2" title={current.title} className="h-full w-full" />
          )}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-5 mx-auto flex max-w-6xl items-center justify-between px-5">
        <div className="flex gap-2" role="tablist" aria-label="Slides">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={slideIndex === index}
              aria-label={`Ir para o slide ${slideIndex + 1}`}
              className={cn("size-2 rounded-full bg-white/30", slideIndex === index && "bg-paper")}
              onClick={() => go(slideIndex)}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className="rounded-full border border-white/15 px-3 py-1 text-sm" onClick={() => go(index - 1)} aria-label="Slide anterior">
            Anterior
          </button>
          <button type="button" className="rounded-full border border-white/15 px-3 py-1 text-sm" onClick={() => go(index + 1)} aria-label="Próximo slide">
            Próximo
          </button>
        </div>
      </div>
    </section>
  );
}
