# API

Base local: `http://127.0.0.1:8787`. A vitrine chama `/api/commerce/...`, e o Next reescreve para `COMMERCE_API_URL` (padrão `http://127.0.0.1:8787`).

Erro de domínio volta como JSON `{ error, message }` e o status adequado. A mensagem é a do `DomainError`, sem stack. Checkout: 30 pedidos por minuto por IP. Test ride: 20. O limite é memória do processo.

`GET /health` → `{ ok, service: "lume-commerce", persistence: "memoria" | "postgres-configurado" }`.

## Leitura

| Método | Caminho | Resposta |
| --- | --- | --- |
| GET | `/v1/products` | `{ products }` do catálogo. Sem lista de lojas. Cada item traz `autopropelido`. |
| GET | `/v1/products/:slug` | `{ product }` ou 404. O produto traz `autopropelido`. |
| GET | `/v1/reviews?produto=` | semente mais relatos pendentes do processo |
| GET | `/v1/banners` | carrossel: só ativos, ordenados por `position`. Campos `imageUrl`, `subtitle`, `href`, `title`. |
| GET | `/v1/orders/:code` | `{ order }` ou 404. Código em maiúsculas |

`autopropelido` é calculado no domínio (`autopropelidoBadge`), nunca gravado à mão. Limites da CONTRAN 996/2023: potência nominal até 1.000 W, velocidade até 32 km/h, largura até 70 cm, entre-eixos até 130 cm. Falta qualquer um e `eligible` fica `false`, `label` fica `null` e `missing` lista o campo. `powerKw` é pico e não preenche a nominal. `registrationClass` do catálogo antigo não liga o selo. O aviso fixo é `notice`: "verifique as regras da sua cidade".

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

`POST /v1/test-rides` — a vitrine não chama mais esta rota. O agendamento virou botão de WhatsApp. A rota ainda existe na API até o backend tirá-la.

`POST /v1/reviews` — `productId`, `city`, `rating` 1–5, `title`, `body`. Resposta marca `pending: true` e não entra na semente publicada.

`POST /v1/checkout` — `lines[]` (`productId`, `colorId`, `accessoryIds`, `batteryId?`, `qty` 1–2, no máximo 5 linhas), `cep`, `shippingServiceId` (`dedicado`), `method` (`pix` | `boleto` | `cartao`), `installments` (1 se não for cartão), `couponCode?`, `customer` (`name`, `email`, `phone`). Não há retirada em loja.

`POST /v1/orders/:code/sandbox` avança um passo do rastreio. A mensagem contém `LUME-SANDBOX`.

`POST /v1/auth/request` e `POST /v1/auth/verify` com o código `LUME-SANDBOX`. `GET /v1/account/orders` exige `Authorization: Bearer`.

A resposta traz `order` recalculado e a frase de que nenhum pagamento foi ao Mercado Pago ou à Pagar.me. Pix: `order.pix.copyPaste` começa com `LUME-MOCK-PIX-`.

## Admin

A entrada é `POST /v1/admin/login` com `{ password }`. A senha não fica no código: `ADMIN_PASSWORD_HASH` é `scrypt$<sal hex>$<hash hex>`, gerado por `hashAdminPassword` em `apps/commerce/src/auth.ts`. O cookie `lume_admin` é `httpOnly`, `SameSite=Lax` e, em produção, `Secure`. `POST /v1/admin/logout` apaga a sessão. O login aceita 8 tentativas por minuto por IP.

Fora de produção, `x-admin-token` ainda abre o admin (o valor de `ADMIN_TOKEN`, ou `dev-admin-token` se a variável não existir). Com `NODE_ENV=production` o cabeçalho não autentica.

`GET /v1/admin/dealers?cidade=` é a única leitura de lojas. A rota pública `/v1/dealers` não existe mais. A vitrine não lista lojas.

`GET /v1/admin/overview` estoque efetivo por cor, variantes de bateria, banners, cupons, títulos de guia, contagem de pedidos, test rides, trocas e serviços, e as listas recentes (pedido sem e-mail, troca sem telefone). Serviço gravado em `POST /v1/service-bookings` entra nessa memória.

`PATCH /v1/admin/stock` — `productId`, `colorId`, `stock`. Não altera `@lume/domain`.

O catálogo de autopropelidos do admin vive na memória do processo, semeado com `sampleScooters`. O Postgres da migration `0001` continua sendo o seed do banco; esta fase não grava o CRUD nele. Checkout segue precificando `@lume/domain`.

| Método | Caminho | Uso |
| --- | --- | --- |
| GET/POST | `/v1/admin/products` | Lista com `q` e cria. |
| PATCH/DELETE | `/v1/admin/products/:id` | Edita. DELETE arquiva (`arquivado`), não apaga. |
| POST | `/v1/admin/products/:id/duplicate` | Cópia em rascunho. |
| POST/PATCH/DELETE | `/v1/admin/products/:id/variants` e `.../variants/:variantId` | Variantes. |
| POST/PATCH/DELETE | `/v1/admin/products/:id/images` e `.../images/:imageId` | Foto, ordem e capa. |
| GET/POST/PATCH/DELETE | `/v1/admin/accessories` e `.../:id` | Acessórios. |
| GET/POST/PATCH/DELETE | `/v1/admin/damages` e `.../:id` | Avarias. No site só entram as públicas e não resolvidas. |
| GET/POST/PATCH/DELETE | `/v1/admin/banners` e `.../:id` | Carrossel. |
| POST | `/v1/admin/uploads` | Token de cliente do Vercel Blob. JPG, PNG ou WebP, até 5 MB. Exige `BLOB_READ_WRITE_TOKEN`. O token de escrita não vai na resposta. |

A tela usa esses caminhos. A ficha vai no `PATCH` com `{ specs }` e a potência nominal em `powerNominalW`, sem derivar de `powerKw`. O vínculo é `{ accessories: [{ accessoryId, recommended }] }`. A ordem das fotos é `{ images: [{ id, position, isCover }] }`. A avaria manda `isPublic`. Preço e desconto são centavos. O selo não é campo do formulário.
