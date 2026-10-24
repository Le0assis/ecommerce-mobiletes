import { PageShell } from "@/components/page-shell";
import { faq } from "@lume/domain";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description: "Pix, parcela, CNH e troca do usado.",
};

export default function FaqPage() {
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return (
    <PageShell eyebrow="Ajuda" title="FAQ." lede="Respostas curtas. O que vale na compra é o pedido.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />
      <div className="grid gap-3">
        {faq.map((item) => (
          <details key={item.question} className="rounded-[1.5rem] border border-white/10 p-5">
            <summary className="cursor-pointer text-lg font-light">{item.question}</summary>
            <p className="mt-3 text-sm text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </PageShell>
  );
}
