# API

Base local: `http://127.0.0.1:8787`. A vitrine chama `/api/commerce/...`, e o Next reescreve para `COMMERCE_API_URL` (padrão `http://127.0.0.1:8787`).

Erro de domínio volta como JSON `{ error, message }` e o status adequado. A mensagem é a do `DomainError`, sem stack. Checkout: 30 pedidos por minuto por IP. Test ride: 20. Login de admin: 8. O limite é memória do processo. O IP é o do socket. `x-forwarded-for` só entra se esse socket estiver em `TRUSTED_PROXIES` (o endereço observado pelo proxy é o último hop que não é o próprio proxy). Com `VERCEL=1`, o IP é o de `x-vercel-forwarded-for`, não o `x-forwarded-for` enviado pelo cliente.

`GET /health` → `{ ok, service: "lume-commerce", persistence: "memoria" | "postgres-configurado" }`.

## Leitura

| Método | Caminho | Resposta |
| --- | --- | --- |
| GET | `/v1/products` | `{ products }` do catálogo de `@lume/domain` mais os produtos `ativo` e `is_enabled` do cadastro. Com Postgres, essa segunda lista sai do banco. Sem `DATABASE_URL`, sai da semente em memória. Sem lista de lojas. Filtro `cidade` não inclui o cadastro. |
| GET | `/v1/products/:slug` | `{ product, accessories, reviews }` ou 404. `reviews` fica vazio no produto do cadastro. Slug que existe e não está `ativo` e habilitado responde 404, mesmo que o domínio tenha o mesmo slug. |
| GET | `/v1/reviews?produto=` | semente mais relatos pendentes do processo |
| GET | `/v1/banners` | carrossel: só ativos, ordenados por `position`. Campos `imageUrl`, `subtitle`, `href`, `title`. |
| GET | `/v1/orders/:code` | `{ order }` ou 404. Código em maiúsculas |

Cada produto, na lista e em `product`, tem a mesma forma:

`id`, `slug`, `name`, `brand`, `category`, `style` (`retro` | `citycoco` | `esportivo` | `null`), `tagline`, `description`, `basePriceCents`, `isSample`, `isEnabled`, `rangeKm` (número declarado ou `null`), `topSpeedKmh`, `powerKw`, `powerNominalW`, `widthCm`, `wheelbaseCm`, `torqueNm`, `batteryKwh`, `weightKg`, `seatHeightMm`, `chargeHours`, `fastChargeMin`, `registrationClass`, `licenseNote`, `optimalSpeedKmh`, `colors` (`id`, `name`, `hex`, `priceDeltaCents`, `stock`), `batteries` (`id`, `name`, `kwh`, `rangeKm`, `priceDeltaCents`, `stock`), `accessoryIds`, `specs`, `variants`, `accessories`, `damages`, `images`, `autopropelido`.

`specs`: `powerNominalW`, `powerPeakW`, `topSpeedKmh`, `widthCm`, `wheelbaseCm`, `weightKg`, `seatHeightMm`, `batteryV`, `batteryAh`, `batteryChem`, `batteryRemovable`, `chargeHours`, `rangeKmDeclared`, `hasSpeedLimiter`, `hasBell`, `hasLights`. Medida desconhecida é `null`. O `PATCH` da ficha aceita decimal entre 0 e o teto de `productSpecsBody` (`32.5` entra). Os tetos são 20000 W nominal, 20000 W de pico, 150 km/h, 300 cm de largura, 400 cm de entre-eixos, 1000 kg, 1500 mm de banco, 200 V, 500 Ah, 48 h e 1000 km de autonomia declarada. Negativo responde “O valor não pode ser negativo”. `rangeKm` é a autonomia declarada pelo fabricante, o mesmo valor de `specs.rangeKmDeclared`. Se a ficha não tem autonomia, os dois ficam `null`. Pico, potência e o simulador não preenchem esse campo. No Postgres as medidas são `numeric(12,2)` (migration `0005_product_specs_numeric`), com os mesmos `CHECK`. `batteryKwh` e `batteries` ficam vazios no cadastro: não se inventa kWh.

`variants`: `id`, `sku`, `colorName`, `colorHex`, `batteryLabel`, `priceDeltaCents`, `stock`, `active`. No domínio, uma variante por cor.

`accessories`: `id`, `slug`, `name`, `kind`, `priceCents`, `description`, `imageUrl`, `stock`, `recommended`. No slug, o array irmão `accessories` repete `product.accessories`.

`damages`: só avaria pública e sem `resolvedAt`. Campos `id`, `variantId`, `description`, `severity` (`leve` | `moderada` | `grave`), `discountCents`, `images` (`id`, `url`, `position`). O domínio não tem avaria, então o array vem vazio.

`images`: `id`, `variantId`, `url`, `alt`, `position`, `isCover`. Vazio no domínio.

`autopropelido` é calculado (`autopropelidoBadge`), nunca gravado à mão. Limites da CONTRAN 996/2023: potência nominal até 1.000 W, velocidade até 32 km/h, largura até 70 cm, entre-eixos até 130 cm. Falta qualquer um e `eligible` fica `false`, `label` fica `null` e `missing` lista o campo. `powerKw` é pico e não preenche a nominal. `registrationClass` do catálogo antigo não liga o selo. O aviso fixo é `notice`: "verifique as regras da sua cidade". `isSample: true` marca as scooters de exemplo. `isEnabled: false` também fica de fora, mesmo com `status: ativo`. A busca (`q`, `categoria`, `marca`), o slug e o quiz usam a mesma lista. O catálogo de `@lume/domain` responde `isEnabled: true`: essas motos ainda não têm interruptor. Rascunho e arquivado não entram na rota pública.

## Cálculo

Todos POST com JSON.

| Caminho | Corpo | Uso |
| --- | --- | --- |
| `/v1/pricing/configure` | `productId`, `colorId`, `accessoryIds`, `batteryId?` | Preço do cadastro quando o id ou o slug existe nele. Senão, `@lume/domain`. A vitrine ainda pinta com `priceProduct` a partir da ficha pública |
| `/v1/pricing/installments` | `amountCents`, `max?` | Planos de 1 até `max` |
| `/v1/shipping/quote` | `cep`, `weightKg` | Cotação. Peso ausente, `null`, zero, negativo ou acima de 400 kg responde 400 `{ error: "peso_invalido", message: "Peso fora da faixa de transporte." }` |
| `/v1/quiz` | uso, km/dia, ladeiras, carga da bateria, quem vai junto, carga, orçamento, estilo e cor | `{ recommendations: [{ slug, name, score, reasons, accessories }] }` de 0 a 3 |

`POST /v1/quiz` pontua o catálogo de `@lume/domain` junto com os produtos `ativo` e habilitados do cadastro (Postgres quando o banco responde; a semente em memória quando não há `DATABASE_URL`). Rascunho, arquivado e desabilitado ficam de fora. O teto do orçamento é rígido: até 6 mil não devolve quem passa de R$ 6.000, e 6 a 10 mil não passa de R$ 10.000. Se ninguém cabe, a lista vem vazia e a vitrine mostra as mais próximas de `GET /v1/products` mais um WhatsApp, sem inventar preço. O estilo muda a ordem. Autonomia declarada ausente entra na conta como 0 km, sem virar número de fabricante na ficha: `rangeKm` na API continua `null`. A tela do quiz chama essa rota e busca o preço na lista de produtos.

`POST /v1/range` saiu da API pública. A estimativa `estimateRange` continua em `@lume/domain`. O simulador saiu da vitrine; o código antigo fica em `backup/lume-versao-completa`.

## Mutação

`POST /v1/test-rides` — a vitrine não chama mais esta rota. O agendamento virou botão de WhatsApp. A rota ainda existe na API até o backend tirá-la.

`POST /v1/reviews` — `productId`, `city`, `rating` 1–5, `title`, `body`. Resposta marca `pending: true` e não entra na semente publicada.

`POST /v1/checkout` — `lines[]` (`productId`, `colorId`, `accessoryIds`, `batteryId?`, `qty` 1–2, no máximo 5 linhas), `cep`, `shippingServiceId` (`dedicado`), `method` (`pix` | `boleto` | `cartao`), `installments` (1 se não for cartão), `couponCode?`, `customer` (`name`, `email`, `phone`). Não há retirada em loja. Produto do cadastro entra pelo `id` ou pelo `slug`. A variante é a cor. Sem `batteryId`, a série entra com delta zero. Pix e boleto continuam nos descontos de `@lume/domain`. O frete usa `specs.weightKg` de cada linha e não inventa quilograma. Peso ausente, zero ou acima de 400 kg em qualquer linha, e a soma das linhas acima de 400 kg, responde 400 `{ error: "peso_invalido", message: "Peso fora da faixa de transporte." }` e o pedido não é criado. `POST /v1/shipping/quote` devolve o mesmo corpo quando o `weightKg` do pedido falta, é zero ou passa de 400 kg. Linha desabilitada ou fora de `ativo` responde 400 `{ error: "produto_desabilitado", message: "Esse modelo não está habilitado." }` e o pedido não é criado. Id desconhecido no cadastro segue para `@lume/domain` e, se também não existir, responde `produto_inexistente`.

`POST /v1/orders/:code/sandbox` avança um passo do rastreio. A mensagem contém `LUME-SANDBOX`.

`POST /v1/auth/request` e `POST /v1/auth/verify` com o código `LUME-SANDBOX`. `GET /v1/account/orders` exige `Authorization: Bearer`.

A resposta traz `order` recalculado e a frase de que nenhum pagamento foi ao Mercado Pago ou à Pagar.me. Pix: `order.pix.copyPaste` começa com `LUME-MOCK-PIX-`.

## Admin

A entrada é `POST /v1/admin/login` com `{ password }`. A senha não fica no código: `ADMIN_PASSWORD_HASH` é `scrypt$<sal hex>$<hash hex>`, gerado por `hashAdminPassword` em `apps/commerce/src/auth.ts`. O cookie `lume_admin` é `httpOnly`, `SameSite=Lax`, `Path=/` e, em produção, `Secure`. A sessão no servidor dura 12 horas e o logout a apaga. O `Set-Cookie` do logout repete `Path`, `HttpOnly`, `Secure` e `SameSite`. O login aceita 8 tentativas por minuto por IP.

Fora de produção, `x-admin-token` ainda abre o admin (o valor de `ADMIN_TOKEN`, ou `dev-admin-token` se a variável não existir). Com `NODE_ENV=production` o cabeçalho não autentica.

`GET /v1/admin/dealers?cidade=` é a única leitura de lojas. A rota pública `/v1/dealers` não existe mais. A vitrine não lista lojas.

`GET /v1/admin/overview` estoque efetivo por cor, variantes de bateria, banners, cupons, títulos de guia, contagem de pedidos, test rides, trocas e serviços, e as listas recentes (pedido sem e-mail, troca sem telefone). Serviço gravado em `POST /v1/service-bookings` entra nessa memória.

`PATCH /v1/admin/stock` — `productId`, `colorId`, `stock`. Não altera `@lume/domain`.

O cadastro de autopropelidos grava no Postgres quando `DATABASE_URL` conecta: produto, ficha, variante, foto, acessório, vínculo e avaria. A semente continua Yadea, Aima, MotoChefe, Shineray, MXF e Watts, com `isSample: true`. A vitrine não tem outro catálogo local: se a API cai, a página mostra erro. Sem `DATABASE_URL`, ou com o banco fora, `POST`, `PATCH` e `DELETE` desse cadastro respondem 503 `{ error: "catalogo_indisponivel", message: "O cadastro precisa do Postgres." }` e não guardam o produto na memória. A leitura pública, nesse caso, continua na semente do processo. `GET /health` com `persistence: "postgres-configurado"` só diz que `DATABASE_URL` existe. Pedido e test ride seguem o atalho de `persist.ts`. O carrossel (`/v1/admin/banners` e `GET /v1/banners`) continua na memória do processo; o flush do cadastro não apaga a tabela `banners`.

`products.is_enabled` já está na migration `0004_products_habilitacao_ficha`. O JSON chama o campo `isEnabled`. `status` continua `rascunho | ativo | arquivado`. Habilitado não substitui o status. O `PATCH` aceita `{ isEnabled }`. A listagem pública, o slug, a busca (`q`) e o quiz exigem `status = ativo` e `is_enabled = true`.

`DELETE /v1/admin/products/:id` arquiva (`status: "arquivado"`). A linha, a ficha e as variantes continuam no banco. Apagar de verdade não está aprovado.

A migration `0005_product_specs_numeric` converte as medidas de `product_specs` para `numeric(12,2)`. Também repete `products.is_enabled boolean NOT NULL DEFAULT true` com `ADD COLUMN IF NOT EXISTS` e só cria o CHECK do teto se o nome ainda não existe, para conviver com a migration do DBA. Pode rodar de novo. `32.5` volta na leitura. No arranque, a API aplica só `0004` e `0005` em cima de um banco que já passou por `db:push`. O histórico `0000`–`0003` não roda de novo nesse arranque.

Rodar de novo o seed atualiza as oito scooters pela chave e apaga `foston-x15-max`. Não recoloca `is_enabled` numa linha que o admin já desligou. A Watts da semente é a W1, piso de demonstração R$ 4.300, sem bateria nem autonomia inventadas. Estoque de exemplo é 0: o checkout dessa cor responde `cor_sem_estoque` até o admin gravar estoque.

| Método | Caminho | Uso |
| --- | --- | --- |
| GET/POST | `/v1/admin/products` | Lista com `q` e cria. |
| PATCH/DELETE | `/v1/admin/products/:id` | Edita, inclusive `{ isEnabled }` e `{ specs }`. DELETE arquiva (`arquivado`) e mantém a linha. |
| POST | `/v1/admin/products/:id/duplicate` | Cópia em rascunho. |
| POST/PATCH/DELETE | `/v1/admin/products/:id/variants` e `.../variants/:variantId` | Variantes. |
| POST/PATCH/DELETE | `/v1/admin/products/:id/images` e `.../images/:imageId` | Foto, ordem e capa. |
| GET/POST/PATCH/DELETE | `/v1/admin/accessories` e `.../:id` | Acessórios. |
| GET/POST/PATCH/DELETE | `/v1/admin/damages` e `.../:id` | Avarias. No site só entram as públicas e não resolvidas. |
| GET/POST/PATCH/DELETE | `/v1/admin/banners` e `.../:id` | Carrossel. |
| POST | `/v1/admin/uploads` | Token de cliente do Vercel Blob. JPG, PNG ou WebP, até 5 MB, caminho `lume/<arquivo>`. Exige `BLOB_READ_WRITE_TOKEN`. O token de escrita não vai na resposta. |

A tela usa esses caminhos. A ficha vai no `PATCH` com `{ specs }` e a potência nominal em `powerNominalW`, sem derivar de `powerKw`. O vínculo é `{ accessories: [{ accessoryId, recommended }] }`. A ordem das fotos é `{ images: [{ id, position, isCover }] }`. A avaria manda `isPublic`. Preço e desconto são centavos. O selo não é campo do formulário.

`href` de banner e URL de imagem (foto, banner, acessório, avaria) aceitam `https://…` com host ou um caminho que começa com `/`. `javascript:`, `http:` e `//` são recusados. O upload do Blob que a tela dispara pede o caminho `lume/<arquivo>`; `..` e outro prefixo recebem 400.
