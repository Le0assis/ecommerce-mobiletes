# Estrutura

```
apps/storefront          Next.js. Páginas em app/, peças em components/, dados em lib/
apps/commerce            Hono. src/app.ts é o contrato HTTP. src/db é Drizzle
packages/domain          Regras e catálogo de demonstração
docs                     Este contexto
.github/workflows/ci.yml lint, typecheck, test, build e Playwright
docker-compose.yml       Postgres 54329, Redis 63799, Meilisearch 7709
```

## Vitrine

| Caminho | Função |
| --- | --- |
| `app/page.tsx` | Home |
| `app/motos/page.tsx` | Catálogo |
| `app/motos/[slug]/page.tsx` | PDP, JSON-LD, `generateStaticParams` |
| `app/comparar/page.tsx` | Comparador |
| `app/me-ajude-a-escolher/page.tsx` | Quiz |
| `app/test-ride/page.tsx` | Conversa no WhatsApp |
| `lib/whatsapp.ts` | Número e link `wa.me` |
| `app/carrinho/page.tsx` | Carrinho |
| `app/checkout/page.tsx` | Pagamento |
| `app/pedido/[code]/page.tsx` | Acompanhamento |
| `app/pedidos/page.tsx` | Lista local de códigos |
| `app/conta/page.tsx` | Perfil local |
| `app/desejos/page.tsx` | Lista de desejos |
| `app/financiamento/page.tsx` | Simulador |
| `app/sobre`, `energia`, `garantia`, `trocas`, `contato`, `privacidade` | Institucional |
| `app/admin/page.tsx` | Senha, pedidos, produtos, acessórios e carrossel. Fora do índice |
| `lib/admin-api.ts` | Chamadas do admin e upload por URL assinada |
| `components/configurator.tsx` | O gesto de comprar um modelo |
| `components/shop-provider.tsx` | Carrinho, desejos, códigos de pedido |
| `lib/catalog.ts` | Leitura de `GET /v1/products` e preço de prévia |
| `lib/shop-api.ts` | Escrita. Ponto de troca das mutações |
| `lib/commerce.ts` | `fetch` de `/api/commerce` |

Página que espera `searchParams` ou `params` faz isso dentro de `<Suspense>`. Sem isso o build do Next 16 falha no prerender.

## Domínio

`catalog.ts` modelos e acessórios. `pricing.ts` configuração. `financing.ts` parcelas. `payments.ts` Pix, boleto e provedor. `shipping.ts` CEP. `range.ts` autonomia. `autopropelido.ts` selo da CONTRAN 996/2023. `quiz.ts` recomendação. `showroom.ts` filtro. `content.ts` lojas, reviews, banners. `schemas.ts` corpos da API. `money.ts` formatação. `errors.ts` `DomainError`.
