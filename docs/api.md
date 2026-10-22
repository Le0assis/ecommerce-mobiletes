# API

Base local: `http://127.0.0.1:8787`. A vitrine chama `/api/commerce/...`, e o Next reescreve para `COMMERCE_API_URL` (padrão `http://127.0.0.1:8787`).

Erro de domínio volta como JSON `{ error, message }` e o status adequado. A mensagem é a do `DomainError`, sem stack. Checkout: 30 pedidos por minuto por IP. Test ride: 20. O limite é memória do processo.

`GET /health` → `{ ok, service: "lume-commerce", persistence: "memoria" | "postgres-configurado" }`.

## Leitura

| Método | Caminho | Resposta |
| --- | --- | --- |
| GET | `/v1/products` | `{ products }` do catálogo |
| GET | `/v1/products/:slug` | `{ product }` ou 404 |
| GET | `/v1/dealers?cidade=` | `{ dealers }` filtrados |
| GET | `/v1/reviews?produto=` | semente mais relatos pendentes do processo |
| GET | `/v1/orders/:code` | `{ order }` ou 404. Código em maiúsculas |

## Cálculo

Todos POST com JSON.

| Caminho | Corpo | Uso |
| --- | --- | --- |
| `/v1/pricing/configure` | `productId`, `colorId`, `accessoryIds` | A vitrine calcula no domínio e não precisa desta rota para pintar |
| `/v1/pricing/installments` | `amountCents`, `max?` | Planos de 1 até `max` |
| `/v1/shipping/quote` | `cep`, `weightKg` | Cotação |
| `/v1/range` | `productId`, `speedKmh`, `extraWeightKg`, `mode` | Autonomia |
| `/v1/quiz` | respostas do quiz | `{ recommendations: [{ slug, name, score, reasons }] }` |

## Mutação

`POST /v1/test-rides` — `productId`, `dealerId`, `name`, `email`, `phone`, `preferredDate` (`YYYY-MM-DD`). 400 se o modelo não está na loja.

`POST /v1/reviews` — `productId`, `city`, `rating` 1–5, `title`, `body`. Resposta marca `pending: true` e não entra na semente publicada.

`POST /v1/checkout` — `lines[]` (`productId`, `colorId`, `accessoryIds`, `batteryId?`, `qty` 1–2, no máximo 5 linhas), `cep`, `shippingServiceId` (`retirada` | `dedicado`), `method` (`pix` | `boleto` | `cartao`), `installments` (1 se não for cartão), `couponCode?`, `customer` (`name`, `email`, `phone`).

`POST /v1/orders/:code/sandbox` avança um passo do rastreio. A mensagem contém `LUME-SANDBOX`.

`POST /v1/auth/request` e `POST /v1/auth/verify` com o código `LUME-SANDBOX`. `GET /v1/account/orders` exige `Authorization: Bearer`.

A resposta traz `order` recalculado e a frase de que nenhum pagamento foi ao Mercado Pago ou à Pagar.me. Pix: `order.pix.copyPaste` começa com `LUME-MOCK-PIX-`.

## Admin

Cabeçalho `x-admin-token`. Fora de produção, se `ADMIN_TOKEN` não existir, o token é `dev-admin-token`.

`GET /v1/admin/overview` estoque efetivo, banners, contagem de pedidos e agendamentos.

`PATCH /v1/admin/stock` — `productId`, `colorId`, `stock`. Não altera `@lume/domain`.
