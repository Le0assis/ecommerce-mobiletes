# API

Base local: `http://127.0.0.1:8787`. A vitrine chama `/api/commerce/...`, e o Next reescreve para `COMMERCE_API_URL` (padrão `http://127.0.0.1:8787`).

Erro de domínio volta como JSON `{ error, message }` e o status adequado. A mensagem é a do `DomainError`, sem stack. Checkout: 30 pedidos por minuto por IP. Test ride: 20. O limite é memória do processo.

`GET /health` → `{ ok, service: "lume-commerce", persistence: "memoria" | "postgres-configurado" }`.

## Leitura

| Método | Caminho | Resposta |
| --- | --- | --- |
| GET | `/v1/products` | `{ products }` do catálogo. Sem lista de lojas. Cada item traz `autopropelido`. |
| GET | `/v1/products/:slug` | `{ product }` ou 404. O produto traz `autopropelido`. |

`autopropelido` é calculado no domínio (`autopropelidoBadge`), nunca gravado à mão. Limites da CONTRAN 996/2023: potência nominal até 1.000 W, velocidade até 32 km/h, largura até 70 cm, entre-eixos até 130 cm. Falta qualquer um e `eligible` fica `false`, `label` fica `null` e `missing` lista o campo. `powerKw` é pico e não preenche a nominal. `registrationClass` do catálogo antigo não liga o selo. O aviso fixo é `notice`: "verifique as regras da sua cidade".
| GET | `/v1/reviews?produto=` | semente mais relatos pendentes do processo |
| GET | `/v1/banners` | carrossel: só ativos, ordenados por `position`. Campos `imageUrl`, `subtitle`, `href`, `title`. |
| GET | `/v1/orders/:code` | `{ order }` ou 404. Código em maiúsculas |

## Cálculo

Todos POST com JSON.

| Caminho | Corpo | Uso |
| --- | --- | --- |
| `/v1/pricing/configure` | `productId`, `colorId`, `accessoryIds` | A vitrine calcula no domínio e não precisa desta rota para pintar |
| `/v1/pricing/installments` | `amountCents`, `max?` | Planos de 1 até `max` |
| `/v1/shipping/quote` | `cep`, `weightKg` | Cotação |
| `/v1/quiz` | uso, km/dia, ladeiras, carga da bateria, quem vai junto, carga, orçamento, estilo e cor | `{ recommendations: [{ slug, name, score, reasons, accessories }] }` de 1 a 3 |

`POST /v1/range` saiu da API pública. A estimativa `estimateRange` continua em `@lume/domain` enquanto a vitrine ainda desenha o simulador; a seção some na vitrine, e o código antigo fica em `backup/lume-versao-completa`.

## Mutação

`POST /v1/test-rides` — `productId`, `dealerId`, `name`, `email`, `phone`, `preferredDate` (`YYYY-MM-DD`). 400 se o modelo não está na loja.

`POST /v1/reviews` — `productId`, `city`, `rating` 1–5, `title`, `body`. Resposta marca `pending: true` e não entra na semente publicada.

`POST /v1/checkout` — `lines[]` (`productId`, `colorId`, `accessoryIds`, `batteryId?`, `qty` 1–2, no máximo 5 linhas), `cep`, `shippingServiceId` (`retirada` | `dedicado`), `method` (`pix` | `boleto` | `cartao`), `installments` (1 se não for cartão), `couponCode?`, `customer` (`name`, `email`, `phone`).

`POST /v1/orders/:code/sandbox` avança um passo do rastreio. A mensagem contém `LUME-SANDBOX`.

`POST /v1/auth/request` e `POST /v1/auth/verify` com o código `LUME-SANDBOX`. `GET /v1/account/orders` exige `Authorization: Bearer`.

A resposta traz `order` recalculado e a frase de que nenhum pagamento foi ao Mercado Pago ou à Pagar.me. Pix: `order.pix.copyPaste` começa com `LUME-MOCK-PIX-`.

## Admin

Cabeçalho `x-admin-token`. Fora de produção, se `ADMIN_TOKEN` não existir, o token é `dev-admin-token`.

`GET /v1/admin/dealers?cidade=` é a única leitura de lojas. A rota pública `/v1/dealers` não existe mais. A vitrine ainda importa `dealers` de `@lume/domain` até a aba Lojas sair.

`GET /v1/admin/overview` estoque efetivo por cor, variantes de bateria, banners, cupons, títulos de guia, contagem de pedidos, test rides, trocas e serviços, e as listas recentes (pedido sem e-mail, troca sem telefone). Serviço gravado em `POST /v1/service-bookings` entra nessa memória.

`PATCH /v1/admin/stock` — `productId`, `colorId`, `stock`. Não altera `@lume/domain`.
