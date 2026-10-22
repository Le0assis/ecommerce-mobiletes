import { CompareTable } from "@/components/compare-table";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Comparar",
  description: "Compare até três modelos LUME lado a lado.",
};

export default function ComparePage(props: PageProps<"/comparar">) {
  return (
    <Suspense fallback={<p className="px-5 pt-32">Montando a tabela…</p>}>
      <CompareTable {...props} />
    </Suspense>
  );
}
