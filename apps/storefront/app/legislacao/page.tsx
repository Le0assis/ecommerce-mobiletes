import { PageShell } from "@/components/page-shell";
import { registrationLabel, registrationNote, type RegistrationClass } from "@lume/domain";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legislação e CNH",
  description: "Autopropelido dispensa registro e habilitação. Ciclomotor pede placa e ACC ou CNH A. Moto pede a categoria A.",
};

const classes: RegistrationClass[] = ["autopropelido", "ciclomotor", "moto"];

export default function LegislationPage() {
  return (
    <PageShell
      eyebrow="Referência"
      title="CNH."
      lede="Autopropelido dispensa registro e habilitação. Ciclomotor pede placa e ACC ou CNH A. Moto pede a categoria A."
    >
      <div className="grid gap-4">
        {classes.map((item) => (
          <article key={item} className="rounded-[1.5rem] border border-white/10 p-5">
            <h2 className="text-2xl font-light">{registrationLabel[item]}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{registrationNote[item]}</p>
          </article>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        O modelo certo para o seu uso continua no <Link className="text-paper underline" href="/me-ajude-a-escolher">quiz</Link>.
      </p>
    </PageShell>
  );
}
