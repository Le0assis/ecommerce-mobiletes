import { Quiz } from "@/components/quiz";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Me ajude a escolher",
  description: "Quiz para cruzar uso, distância, velocidade e orçamento com a linha LUME.",
};

export default function QuizPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Bike Quiz</p>
      <h1 className="display mt-3 text-6xl md:text-8xl">Me ajude a escolher.</h1>
      <Quiz />
    </main>
  );
}
