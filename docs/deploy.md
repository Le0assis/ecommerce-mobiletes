# Publicar

Este guia descreve o caminho de produção. Ele não liga pagamento real, não cria conta em adquirente e não coloca segredo no git.

## O que sobe

Dois processos:

1. A vitrine (`apps/storefront`) na Vercel, ou com OpenNext se a hospedagem não for a Vercel. Região da borda perto do Brasil.
2. A API (`apps/commerce`) e o Postgres na mesma região, `sa-east-1` quando o provedor oferecer. `REDIS_URL` liga o limite de taxa no Redis. Sem a variável, ou se o Redis cair, o processo usa memória.

A vitrine lê `GET /v1/products`: modelos de `@lume/domain` mais o cadastro `ativo` e habilitado. Com `DATABASE_URL`, o admin grava esse cadastro no Postgres e o checkout usa essa ficha. Sem a variável, criar e editar produto responde 503. Publicar o admin não altera o estoque dos modelos que só existem no código.

## Variáveis

Vitrine:

| Variável | Produção |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL pública com `https`, sem barra no fim. Entra no sitemap e no Open Graph. |
| `COMMERCE_API_URL` | URL interna da API. O navegador continua falando com `/api/commerce` no mesmo domínio da vitrine. |
| `NEXT_PUBLIC_WHATSAPP` | Número internacional, sem `+`. |
| `NEXT_PUBLIC_ANALYTICS` | Vazio. `console` é só para o computador de quem desenvolve. |

API:

| Variável | Produção |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | A porta que o processo escuta. |
| `DATABASE_URL` | Postgres da região, com senha fora do repositório. |
| `ADMIN_PASSWORD_HASH` | Obrigatório para o login. Hash scrypt no formato `scrypt$<sal hex>$<hash hex>`. Gere com `hashAdminPassword` em `apps/commerce/src/auth.ts`. Não commite a senha nem o hash de produção. |
| `BLOB_READ_WRITE_TOKEN` | Token de escrita do Vercel Blob, store da LUME. Só no servidor. O admin recebe um token de cliente, com JPG/PNG/WebP e teto de 5 MB. |
| `ADMIN_TOKEN` | Fora de produção, cabeçalho `x-admin-token`. Em produção o cabeçalho não autentica, mas o processo recusa subir se o valor faltar, tiver menos de 24 caracteres ou for `dev-admin-token`. |
| `STOREFRONT_ORIGIN` | Origens da vitrine, com esquema e sem caminho, separadas por vírgula. Em produção o CORS só reflete uma origem dessa lista. Lista vazia não libera browser. |
| `MAILER_URL` | POST JSON do código de acesso (`to`, `subject`, `text`). Em produção, sem essa URL, `POST /v1/auth/request` responde 503. |
| `REDIS_URL` | Limite de taxa. Opcional. Falha de conexão volta para a memória do processo. |
| `SANDBOX` | `1` ou `true` aceita o código `LUME-SANDBOX` fora de produção. Em produção o código não entra. |
| `TRUSTED_PROXIES` | IPs do proxy, separados por vírgula. Só então `x-forwarded-for` entra no limite. Vazio: vale o socket. |
| `VERCEL` | A plataforma define `1`. A API lê `x-vercel-forwarded-for` e ignora o `x-forwarded-for` do cliente. Não grave isso no `.env` local. |

Pix de demonstração continua prefixado com `LUME-MOCK-PIX`. Não troque esse prefixo por um BR Code enquanto não houver credencial de homologação e webhook.

## Ordem

1. `pnpm install --frozen-lockfile`
2. `pnpm lint && pnpm typecheck && pnpm test`
3. `pnpm --filter @lume/storefront build`
4. Subir a API com `NODE_ENV=production`, `ADMIN_TOKEN` de pelo menos 24 caracteres e `STOREFRONT_ORIGIN` com a origem pública da vitrine.
5. Subir a vitrine apontando `COMMERCE_API_URL` para essa API.
6. Abrir `/health` na API e a home na URL pública.
7. Confirmar que `/admin` sem o token de produção não lista pedido.

O CI já faz lint, typecheck, teste, build e Playwright. Um deploy só promove o que passou nesse fluxo.

## O que fica de fora deste guia

Mercado Pago e Pagar.me de verdade, webhook, ViaCEP, NF-e, Payload, Meilisearch em produção, mapa de tiles, e-mail de código e o estoque do admin refletido na vitrine. Cada um desses pede contrato ou credencial que este repositório não guarda.

## Desempenho e acesso

O Three.js entra só no clique “Ver em 360°”, por import dinâmico com `ssr: false`. A home não carrega GSAP. Título, descrição, Open Graph, cartão do Twitter, sitemap e `lang="pt-BR"` nascem no servidor. O nome e o preço do modelo não dependem do configurador hidratar. O link “Pular para o conteúdo” permanece. O botão de WhatsApp tem nome acessível. `prefers-reduced-motion` continua desligando o filme e o giro automático.
