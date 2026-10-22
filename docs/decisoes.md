# Decisões

Registro curto. A data é a do repositório, não um calendário de entrega.

## ADR 1 — Commerce próprio, não Saleor nem Medusa no MVP

O núcleo é preço configurado, Pix, boleto, 21x e CEP, com NF-e depois. Um commerce genérico em Python (Saleor) ou o Medusa v2 empurrariam a regra para plugin antes de ela existir. A API é Hono e a regra é `@lume/domain`. Medusa fica como saída se o admin de pedido, e não a regra, virar o gargalo.

## ADR 2 — Payload no mesmo Postgres, não Sanity

Conteúdo editável (banner, página) mora junto do pedido. Sanity deixaria o conteúdo noutra conta e noutro modelo. Payload entra no MVP-c, depois que a compra funcionar. Até lá o catálogo é código.

## ADR 3 — Meilisearch, não Algolia

A busca da v1 cabe num índice que sobe no Compose. Hoje `searchCatalog` filtra em memória, com dobra de acento. Não há chamada ao Meilisearch no pedido.

## ADR 4 — Drizzle, não Prisma

A migration é SQL legível e o centavo é inteiro. O DBA revisa o arquivo em `apps/commerce/drizzle` antes de produção.

## ADR 5 — 21 vezes sem juros como campanha, juros no código

O varejo brasileiro que serviu de referência mostra a parcela grande e o Pix. `LAUNCH_INTEREST_FREE_UP_TO` é 21. A Tabela Price permanece testada com `interestFreeUpTo: 6` para o financeiro encurtar a carência sem reescrever o checkout.

## ADR 6 — Catálogo no domínio, vitrine independente da API

A página abre e o configurador responde sem rede. O custo é o admin de estoque não alterar a vitrine. Aceito até o banco ser a fonte, no MVP-a. A troca passa por `lib/catalog.ts`.

## ADR 7 — Pagamento simulado com prefixo

Nenhum centavo sai. Pix de demonstração começa com `LUME-MOCK-PIX`. Provedor escolhido por `selectProvider`: Mercado Pago para Pix e boleto, Pagar.me para cartão. Stripe não é o adquirente principal.

## ADR 8 — Sem CPF e sem nome em relato

Conta de demonstração é nome e e-mail no navegador. Review leva cidade. Pessoa fictícia não entra no texto.

## ADR 9 — Um acento

Vermelho `#ff2d2d` no CTA, no ponto e num detalhe da moto. Verde-água oficial do Pix só no selo. O grafite e o tipo fino vêm da direção VanMoof/Cowboy; a conversão (21x, Pix, quiz, test ride, busca por cidade) vem do varejo brasileiro.

## ADR 10 — Next em 127.0.0.1

O dev server escuta em `127.0.0.1:43123`. Origem `localhost` no Next 16 não entrega o asset de hidratação para quem abre pelo IP, e o configurador parece quebrado. `allowedDevOrigins` lista os dois hosts.

## ADR 11 — Medição só no console, com escolha separada

Não há script de anúncio. `track` não faz nada até `NEXT_PUBLIC_ANALYTICS=console` e `lume-cookies` ser `analytics`. `ok` e `essential` escondem o aviso e não medem. O evento leva slug, cor, meio ou código de pedido, nunca e-mail.
