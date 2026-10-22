# Para agentes de IA

Leia [docs/README.md](docs/README.md) antes de alterar este repositório. A documentação em `docs/` é o contexto do produto, em português: visão, arquitetura, contratos, design system, como fazer uma mudança comum e o que ainda não existe.

`apps/storefront/AGENTS.md` é o guia de versão do Next.js, gerado pelo framework. Não é o guia da LUME. Se os dois discordarem, valem `docs/` e `packages/domain`.

Regras que não se negociam ao implementar:

- Preço, parcela, Pix, boleto, frete e autonomia nascem em `packages/domain`. A vitrine não inventa número. A API recalcula no checkout.
- Dinheiro é inteiro em centavos.
- O vermelho `#ff2d2d` é o único acento de marca, no CTA principal, no ponto da marca e num detalhe da moto. O verde-água `#32bcad` só aparece no selo Pix.
- Campanha de lançamento: 21x sem juros. Não reescreva a Tabela Price. Para encurtar a carência, baixe `LAUNCH_INTEREST_FREE_UP_TO`.
- Pix de demonstração começa com `LUME-MOCK-PIX`. Sem CPF. Sem nome de pessoa em review.
- A vitrine lê o catálogo por `apps/storefront/lib/catalog.ts`. Estoque editado no admin não muda a vitrine nesta versão.
- Carrinho antigo em `lume-shop-v1` pode não ter `orderCodes`. O parse precisa continuar aceitando.
- Não remova nem duplique `data-testid` de `live-price`, `color-cobre`, `reserve`, `hero-title`, `installment-price` e `pix-price`. Mantenha `html[data-configurator=ready]` na hidratação do configurador.
- O servidor de desenvolvimento escuta em `http://127.0.0.1:43123`. Não suba o Next em `localhost`: a página deixa de hidratar.
- Se a mudança alterar comportamento que o próximo agente precisaria saber, atualize o arquivo correspondente em `docs/`.
