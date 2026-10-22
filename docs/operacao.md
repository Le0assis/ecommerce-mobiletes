# Operação

O passo a passo de instalação, variáveis e erros comuns está no [README.md](../README.md). Aqui fica o mapa curto.

## Subir

Na raiz, com as dependências instaladas:

```bash
pnpm dev
```

Vitrine: [http://127.0.0.1:43123](http://127.0.0.1:43123). API: [http://127.0.0.1:8787/health](http://127.0.0.1:8787/health).

O Next precisa do hostname `127.0.0.1`. Em `localhost` o dev server do Next 16 bloqueia o asset e a página não hidrata: a cor não muda o preço. `allowedDevOrigins` inclui os dois, e os scripts `dev` e `start` já prendem o host.

Sem Docker a loja abre. `persistence` fica `memoria`. Postgres, Redis e Meilisearch são o Compose, portas 54329, 63799 e 7709. Docker não é obrigatório para ver a vitrine.

## Testar

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @lume/storefront exec playwright test
```

`pnpm test` cobre o domínio (preço, 21x, juros quando a carência cai, CEP, quiz) e a API (checkout simulado). O Playwright abre a home, troca a Apex para Cobre, espera R$ 64.700,00 e cai no checkout. Ele exige `html[data-configurator=ready]`.

O typecheck da vitrine roda `next typegen` antes do `tsc`, porque `PageProps` e `LayoutProps` nascem aí.

## Publicar

Ainda não há ambiente de produção. O CI (`.github/workflows/ci.yml`) faz lint, typecheck, teste, build da vitrine e, noutro job, Playwright contra `next start`.

Quando houver hospedagem: vitrine na Vercel ou OpenNext; API e Postgres em sa-east-1; `STOREFRONT_ORIGIN` travando o CORS; `ADMIN_TOKEN` obrigatório em produção; segredo fora do git. Não publique com o token `dev-admin-token`.

Build local da vitrine: `pnpm --filter @lume/storefront build`. Páginas dinâmicas que leem `params` precisam do `Suspense` já usado em `/motos/[slug]` e `/pedido/[code]`.
