const items = [
  ["21×", "Sem juros no cartão"],
  ["Pix", "5% na hora"],
  ["CEP", "Frete calculado"],
  ["WhatsApp", "Conversa sobre o modelo"],
  ["Bateria", "Garantia a detalhar no contrato"],
  ["Peças", "Rede própria, não marketplace"],
];

export function TrustRow() {
  return (
    <section className="border-y border-white/10" aria-label="Por que comprar na LUME">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-white/10 md:grid-cols-3 lg:grid-cols-6">
        {items.map(([title, text]) => (
          <li key={title} className="bg-background px-4 py-5">
            <p className="text-sm tracking-wide text-paper">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
