const phone = process.env.NEXT_PUBLIC_WHATSAPP ?? "551140001900";

/** Link wa.me. O botão flutuante, a faixa e a página de conversa usam o mesmo número. */
export function whatsappHref(message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export const whatsappGreeting = "Olá, quero falar sobre uma moto LUME.";
