# Como fazer

## Acrescentar um modelo

1. Crie o objeto em `packages/domain/src/catalog.ts`, com `id`, `slug`, centavos inteiros e `accessoryIds` que existam em `accessories`.
2. Se a categoria for nova, alargue o tipo `Category`, `categoryLabel` e o desenho em `components/bike-svg.tsx`.
3. Cubra preço e, se a regra mudar, um caso em `packages/domain/src/domain.test.ts`.
4. Rode `pnpm test` e `pnpm typecheck`. `generateStaticParams` e o sitemap leem `motorcycles` sozinhos.
5. O seed do Postgres (`apps/commerce/src/db/seed.ts`) é espelho. Atualize se for usar o banco. A vitrine não depende dele.
6. Não invente o preço na página. O card e o configurador chamam `configurePrice`.

## Acrescentar uma página

1. Arquivo em `apps/storefront/app/<rota>/page.tsx`. Exporte `metadata` com título e descrição em português.
2. Use `PageShell` quando for texto institucional. A home e o catálogo têm layout próprio.
3. Se a página lê `searchParams`, o await fica num componente filho dentro de `Suspense`. O padrão está em `app/motos/page.tsx`.
4. Coloque o link no `SiteFooter`. O menu flutuante só ganha item se for caminho de compra. Um Reservar vermelho continua sendo o único CTA do topo.
5. Se a página for pública, acrescente o caminho em `app/sitemap.ts`. Se for conta, pedido ou checkout, deixe de fora e confira `app/robots.ts`.
6. `pnpm --filter @lume/storefront typecheck` regenera os tipos de rota.

## Acrescentar um componente

1. Peça de loja em `apps/storefront/components/`. Primitiva (botão, campo, diálogo) já está em `components/ui`. Não desenhe outra.
2. Componente sem estado pode ser Server Component. Estado, `localStorage` ou clique pedem `"use client"` na folha, não na página inteira.
3. A ficha vem de `@/lib/catalog` (`GET /v1/products`). Pix, parcela e frete de prévia usam as funções do domínio em cima desses números. Escrita vem de `@/lib/shop-api`.
4. Link com cara de botão usa `buttonVariants`, não `Button render={<Link>}`.
5. Respeite `prefers-reduced-motion` se houver deslocamento.
6. Nomeie em função do que a pessoa vê (`InstallmentTable`), não da tecnologia.

## Acrescentar um meio de pagamento

1. Alargue `PaymentMethod` em `packages/domain/src/payments.ts` e `amountForMethod`. Se houver desconto, a base é o subtotal configurado. Frete fica de fora.
2. `selectProvider` diz qual adquirente recebe o método. Pix e boleto nascem no Mercado Pago. Cartão nasce na Pagar.me. Não chame o adquirente da vitrine.
3. Atualize o enum em `checkoutBody` (`packages/domain/src/schemas.ts`) e o ramo em `apps/commerce/src/app.ts` que recusa parcela fora do cartão e monta o payload.
4. Um payload simulado precisa de prefixo óbvio, no espírito de `LUME-MOCK-PIX`, para ninguém pagar um código falso.
5. Na vitrine, um `PayOption` em `checkout-form.tsx` e a prévia do resumo. O resumo é prévia: o total que vale é o da API.
6. Teste de domínio para o valor e teste de API para o checkout. Não marque o pedido como pago sem webhook. Status real é v1.

Baixar o sem juros de 21 para outro teto é só mudar `LAUNCH_INTEREST_FREE_UP_TO`. Não reescreva a Tabela Price.
