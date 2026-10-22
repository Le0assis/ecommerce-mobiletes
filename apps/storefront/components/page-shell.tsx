import type { ReactNode } from "react";

export function PageShell({
  eyebrow,
  title,
  lede,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main id="conteudo" className={`mx-auto px-5 pt-28 pb-24 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{eyebrow}</p>
      <h1 className="display mt-3 text-6xl md:text-8xl">{title}</h1>
      <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{lede}</p>
      <div className="mt-10">{children}</div>
    </main>
  );
}
