# Stack

| Escolha | Por quê | O que ficou de fora |
| --- | --- | --- |
| pnpm 10.33.4 + Turborepo | Um lockfile, três pacotes, scripts na raiz | Bun no app. O runtime é Node 22. |
| Next.js 16, React 19, Tailwind 4 | Catálogo com SEO, Server Components, Cache Components já no scaffold | Remix, Astro, SPA pura |
| shadcn/ui sobre Base UI | Botão, input, diálogo, rótulo, sem desenhar primitiva à mão | Radix. `Button` com `render={<Link>}` não é botão nativo: link com `buttonVariants` |
| `@lume/domain` + Zod 4 | A mesma conta no browser e na API. `z.email()`, não `z.string().email()` | Duplicar fórmula na tela |
| Hono | API pequena, testável com `app.request`, sem framework de loja | Saleor (Python) e Medusa no MVP. Medusa continua saída se o admin de pedido virar o gargalo |
| Drizzle + Postgres 16 | SQL visível, centavos inteiros | Prisma |
| Vitest | Domínio e API | — |
| Playwright | O fluxo home → cor Cobre → R$ 64.700,00 → checkout | — |
| Meilisearch no Compose | Índice da v1. Hoje a busca é `searchCatalog` em memória | Algolia |
| Payload, planejado | CMS no mesmo Postgres | Sanity |

Fonte Inter Tight, pesos 200 a 600, via `next/font`. O 360° é React Three Fiber, carregado só no clique, fora do bundle da home.

Dinheiro é `number` inteiro em centavos. `formatBRL` é a única formatação de moeda.
