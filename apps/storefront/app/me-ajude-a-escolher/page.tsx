import { Quiz } from "@/components/quiz";
import { loadProducts } from "@/lib/catalog";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Me ajude a escolher",
  description: "Quiz de uso, distância, ladeira, bateria, carga, orçamento, estilo e cor. Até três modelos, sem pergunta de CNH.",
};

export default function QuizPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Bike Quiz</p>
      <h1 className="display mt-3 text-6xl md:text-8xl">Me ajude a escolher.</h1>
      <Suspense fallback={<p className="mt-8 text-muted-foreground">Abrindo o quiz…</p>}>
        <QuizGate />
      </Suspense>
    </main>
  );
}

async function QuizGate() {
  const loaded = await loadProducts();
  return <Quiz products={loaded.ok ? loaded.data : []} catalogMessage={loaded.ok ? null : loaded.message} />;
}
