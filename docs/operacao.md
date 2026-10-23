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

`pnpm test` cobre o domínio (preço, 21x, juros quando a carência cai, CEP, quiz) e a API (checkout simulado, cupom, troca, serviço e a visão do admin). O Playwright abre a home, troca a Apex para Cobre, espera R$ 64.700,00 e cai no checkout. Ele exige `html[data-configurator=ready]`. Outro teste filtra `marca=VOLTIS` e abre a legislação.

O typecheck da vitrine roda `next typegen` antes do `tsc`, porque `PageProps` e `LayoutProps` nascem aí.

## Publicar

O passo a passo está em [deploy.md](deploy.md). O CI (`.github/workflows/ci.yml`) faz lint, typecheck, teste, build da vitrine e, noutro job, Playwright contra `next start`.

Vitrine na Vercel ou OpenNext. API e Postgres em sa-east-1. `STOREFRONT_ORIGIN` trava o CORS. Em produção o admin entra com `ADMIN_PASSWORD_HASH` (scrypt) e cookie httpOnly, com sessão de 12 horas no servidor. `BLOB_READ_WRITE_TOKEN` assina o upload de foto em `lume/`. O limite por IP usa o socket, `TRUSTED_PROXIES` ou, na Vercel, `x-vercel-forwarded-for`. Segredo fora do git. `ADMIN_TOKEN` não autentica quando `NODE_ENV=production`.

Build local da vitrine: `pnpm --filter @lume/storefront build`. Páginas dinâmicas que leem `params` precisam do `Suspense` já usado em `/motos/[slug]` e `/pedido/[code]`.
