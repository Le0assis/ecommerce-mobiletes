import { getGuide, guides } from "@lume/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  return { title: guide?.title ?? "Guia", description: guide?.lede };
}

export default function GuidePage(props: PageProps<"/guias/[slug]">) {
  return (
    <Suspense fallback={<p className="px-5 pt-32 text-muted-foreground">Abrindo o guia…</p>}>
      <GuideBody {...props} />
    </Suspense>
  );
}

async function GuideBody({ params }: PageProps<"/guias/[slug]">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.lede,
    inLanguage: "pt-BR",
  };
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Guia</p>
      <h1 className="display mt-3 text-6xl md:text-8xl">{guide.title}</h1>
      <p className="mt-6 text-lg text-muted-foreground">{guide.lede}</p>
      <div className="mt-8 grid gap-4 text-sm leading-relaxed text-muted-foreground">
        {guide.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <Link className="mt-8 inline-block text-sm underline" href="/guias">
        Todos os guias
      </Link>
    </main>
  );
}
