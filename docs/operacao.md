# Operação

O passo a passo de instalação, variáveis e erros comuns está no [README.md](../README.md). Aqui fica o mapa curto.

## Subir

Na raiz, com as dependências instaladas:

```bash
pnpm dev
```

Vitrine: [http://127.0.0.1:43123](http://127.0.0.1:43123). API: [http://127.0.0.1:8787/health](http://127.0.0.1:8787/health).

O Next precisa do hostname `127.0.0.1`. Em `localhost` o dev server do Next 16 bloqueia o asset e a página não hidrata: a cor não muda o preço. `allowedDevOrigins` inclui os dois, e os scripts `dev` e `start` já prendem o host.

Sem Docker a loja abre em dev e teste. `persistence` fica `memoria`. Postgres, Redis e Meilisearch são o Compose, portas 54329, 63799 e 7709. Docker não é obrigatório para ver a vitrine. Em produção a API não sobe sem `DATABASE_URL`.

## Testar

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @lume/storefront exec playwright test
```

`pnpm db:audit` lê o Postgres e não apaga nada. Exige `DATABASE_URL`. Lista centavos negativos em `orders` (`subtotal_cents`, `shipping_cents`, `total_cents`), `customers.email` repetido sem diferenciar maiúsculas, `test_ride_bookings` sem dealer ou sem produto, e pedido com `status` fora de `aguardando_pagamento | pago | em_preparo | em_transporte | entregue | recusado` ou `installments` fora de 1 a 21. Sai 0 sem achado e 1 se houver linha para o DBA olhar antes do `VALIDATE`.

`pnpm test` cobre o domínio (preço, 21x, juros quando a carência cai, CEP, quiz) e a API (checkout simulado, cupom, troca, serviço e a visão do admin). O Playwright abre a home, troca a Apex para Cobre, espera R$ 64.700,00 e cai no checkout. Ele exige `html[data-configurator=ready]`. Outro teste filtra `marca=VOLTIS` e abre a legislação.

O typecheck da vitrine roda `next typegen` antes do `tsc`, porque `PageProps` e `LayoutProps` nascem aí.

## Publicar

O passo a passo está em [deploy.md](deploy.md). O CI (`.github/workflows/ci.yml`) faz lint, typecheck, teste, build da vitrine e, noutro job, Playwright contra `next start`.

Vitrine na Vercel ou OpenNext. API e Postgres em sa-east-1. `STOREFRONT_ORIGIN` é a allowlist de CORS, separada por vírgula. Em produção, sem essa lista, o browser não recebe origem permitida. Em produção o admin entra com `ADMIN_PASSWORD_HASH` (scrypt) e cookie httpOnly, com sessão de 12 horas no servidor. `BLOB_READ_WRITE_TOKEN` assina o upload de foto em `lume/`. O limite por IP usa Redis quando `REDIS_URL` existe e a memória do processo quando não existe ou o Redis falha. O IP é o do socket, `TRUSTED_PROXIES` ou, na Vercel, `x-vercel-forwarded-for`. Segredo fora do git. `ADMIN_TOKEN` não autentica quando `NODE_ENV=production`, e o processo nem sobe se esse token faltar ou tiver menos de 24 caracteres.

Build local da vitrine: `pnpm --filter @lume/storefront build`. Páginas dinâmicas que leem `params` precisam do `Suspense` já usado em `/motos/[slug]` e `/pedido/[code]`.
