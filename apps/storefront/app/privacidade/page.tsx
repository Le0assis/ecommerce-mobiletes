import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidade" };

export default function PrivacyPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-5 pt-28 pb-20 text-sm leading-7 text-muted-foreground">
      <h1 className="display text-6xl text-paper md:text-7xl">Privacidade.</h1>
      <p className="mt-6">
        Esta página descreve o tratamento de dados da loja LUME, marca de demonstração. Antes de ir ao ar com clientes reais, o jurídico revisa o texto e publica o nome do operador e do encarregado.
      </p>
      <h2 className="mt-8 text-xl text-paper">O que coletamos</h2>
      <p className="mt-2">
        Nome, e-mail e telefone no test ride e no checkout. CEP para cotar frete. O carrinho e a lista de desejos ficam no seu navegador. Não pedimos CPF nesta versão e não guardamos cartão.
      </p>
      <h2 className="mt-8 text-xl text-paper">Para que serve</h2>
      <p className="mt-2">
        Agendar test ride, calcular entrega, montar o pedido e, no futuro, emitir nota e avisar sobre o pagamento. A base é a execução do pedido e o consentimento para mensagens que não sejam o próprio pedido.
      </p>
      <h2 className="mt-8 text-xl text-paper">Com quem compartilhamos</h2>
      <p className="mt-2">
        Quando os contratos existirem: Mercado Pago ou Pagar.me para pagamento, transportadora para a entrega, e o provedor de NF-e. Cada um recebe só o que precisa daquela etapa.
      </p>
      <h2 className="mt-8 text-xl text-paper">Por quanto tempo</h2>
      <p className="mt-2">
        Pedido e nota ficam pelo prazo fiscal. Test ride sem compra pode ser apagado depois de 12 meses. Você pode pedir acesso, correção ou exclusão em dpo@lume.example.
      </p>
      <h2 className="mt-8 text-xl text-paper">Os seus direitos</h2>
      <p className="mt-2">
        Acesso, correção, portabilidade, informação sobre compartilhamento, revogação do consentimento e exclusão, nos termos da LGPD. Compra online também segue o direito de arrependimento de 7 dias do Código de Defesa do Consumidor, quando aplicável.
      </p>
    </main>
  );
}
