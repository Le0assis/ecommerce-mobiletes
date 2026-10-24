# API

Base local: `http://127.0.0.1:8787`. A vitrine chama `/api/commerce/...`, e o Next reescreve para `COMMERCE_API_URL` (padrão `http://127.0.0.1:8787`).

Erro de domínio volta como JSON `{ error, message }` e o status adequado. A mensagem é a do `DomainError`, sem stack. Checkout: 30 pedidos por minuto por IP. Test ride: 20. Consulta de pedido: 20. Login de admin: 8. Com `REDIS_URL`, o limite usa Redis (`lume:rl:`). Se o Redis não responder, o processo volta para a memória. Sem `REDIS_URL`, o limite já nasce na memória. O IP é o do socket. `x-forwarded-for` só entra se esse socket estiver em `TRUSTED_PROXIES` (o endereço observado pelo proxy é o último hop que não é o próprio proxy). Com `VERCEL=1`, o IP é o de `x-vercel-forwarded-for`, não o `x-forwarded-for` enviado pelo cliente.

`GET /health` → `{ ok, service: "lume-commerce", persistence: "memoria" | "postgres-configurado" }`.

## Leitura

| Método | Caminho | Resposta |
| --- | --- | --- |
| GET | `/v1/products` | `{ products }` do catálogo de `@lume/domain` mais os produtos `ativo` e `is_enabled` do cadastro. Com Postgres, essa segunda lista sai do banco. Sem `DATABASE_URL`, sai da semente em memória. Sem lista de lojas. Filtro `cidade` não inclui o cadastro. |
| GET | `/v1/products/:slug` | `{ product, accessories, reviews }` ou 404. `reviews` fica vazio no produto do cadastro. Slug que existe e não está `ativo` e habilitado responde 404, mesmo que o domínio tenha o mesmo slug. |
| GET | `/v1/reviews?produto=` | semente mais relatos pendentes do processo |
| GET | `/v1/banners` | carrossel: só ativos, ordenados por `position`. Campos `imageUrl`, `subtitle`, `href`, `title`. |
| GET | `/v1/orders/:ref` | `{ order, tracking }`. `:ref` é o `publicId` (token longo) e abre o pedido. O código `LM` + ano + 4 dígitos é só exibição: sem o e-mail do cliente (`?email=`) ou a sessão `Authorization: Bearer` do mesmo e-mail, a resposta é 404 `pedido_inexistente`. O limite é 429 `limite`. |

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

A resposta traz `order` recalculado e a frase de que nenhum pagamento foi ao Mercado Pago ou à Pagar.me. `order.code` é `LM` + ano + 4 dígitos, só para mostrar. `order.publicId` é o token longo que a vitrine guarda e abre. Com Postgres, o checkout grava esse token em `orders.public_id` no insert/upsert pela chave `code`. O índice único rejeita o mesmo token em outro pedido. A API não faz backfill. A leitura do token é `where public_id = $1`; se a requisição traz e-mail ou sessão, a query também exige esse dono. Sem e-mail, o token abre sozinho. Pix: `order.pix.copyPaste` começa com `LUME-MOCK-PIX-` seguido do código `LM`.

`POST /v1/orders/:ref/sandbox` avança um passo do rastreio só com `LUME_ENABLE_SANDBOX=1` ou `true`. A flag não depende de `NODE_ENV`: com ela a rota avança até em produção; sem ela responde 404 em desenvolvimento e em produção. `:ref` aceita `publicId` ou o código `LM`. A mensagem contém `LUME-SANDBOX`. Sem a flag a rota responde 404 `{ error: "nao_encontrado", message: "Não encontrado." }` e não muda o pedido. O botão “Avançar no sandbox” da página do pedido chama essa rota e fica em 404 enquanto a API não tiver a flag.

`POST /v1/auth/request` com `{ email }` responde `{ email, message: "Código enviado." }`. O código tem 6 dígitos, vale 10 minutos, aceita no máximo 5 tentativas e só serve uma vez. Um novo pedido antes de 60 segundos responde 429 `{ error: "limite", message: "Espere um minuto para pedir outro código." }`. A resposta não traz o código. O envio passa por um mailer: `MAILER_URL` recebe um POST JSON `{ to, subject, text }`. Sem provedor e fora de produção, a API escreve o código no log (`mail_log`). Em produção, sem `MAILER_URL`, a rota responde 503 `{ error: "email_indisponivel", message: "Não foi possível enviar o código." }` e não grava nem loga o código.

`POST /v1/auth/verify` com `{ email, code }` responde `{ token, email }`. Código errado: 400 `codigo_invalido`. Expirado: 400 `codigo_expirado`. Quinta falha: 400 `codigo_esgotado` e o código deixa de valer. `LUME-SANDBOX` só entra com `LUME_SANDBOX=1` ou `true`, em qualquer `NODE_ENV`. Sem a flag o código é `codigo_invalido`, inclusive em teste e com `SANDBOX=1`.

`GET /v1/account/orders` exige `Authorization: Bearer` e devolve os pedidos daquele e-mail, cada um com `code` e `publicId`.

O CORS reflete só uma origem presente em `CORS_ORIGINS` (lista separada por vírgula, com esquema e sem caminho). Essa variável substitui `STOREFRONT_ORIGIN`. Sem a lista, com lista vazia ou com origem de fora, a resposta não traz `Access-Control-Allow-Origin`, em qualquer `NODE_ENV`. A API não devolve `*`. `STOREFRONT_ORIGIN` não abre o CORS. A vitrine no mesmo host passa pelo rewrite `/api/commerce` e não depende desse cabeçalho. `Authorization` entra nos cabeçalhos permitidos.

`ADMIN_TOKEN` precisa existir com pelo menos 32 caracteres, 16 caracteres distintos e entropia Shannon de pelo menos 3 bits por caractere, em qualquer `NODE_ENV`. Um caractere repetido não passa. Sem isso o processo sai com `boot_recusado` e não escuta porta. Não há token padrão. O cabeçalho `x-admin-token` continua sem autenticar em produção. Sem `DATABASE_URL`, ou se o Postgres não conectar, produção também sai com `boot_recusado`. A semente em memória fica só em dev e teste.

## Admin

A entrada é `POST /v1/admin/login` com `{ password }`. A senha não fica no código: `ADMIN_PASSWORD_HASH` é `scrypt$<sal hex>$<hash hex>`, gerado por `hashAdminPassword` em `apps/commerce/src/auth.ts`. O cookie `lume_admin` é `httpOnly`, `SameSite=Lax`, `Path=/` e, em produção, `Secure`. A sessão no servidor dura 12 horas e o logout a apaga. O `Set-Cookie` do logout repete `Path`, `HttpOnly`, `Secure` e `SameSite`. O login aceita 8 tentativas por minuto por IP.

Fora de produção, `x-admin-token` abre o admin com o valor de `ADMIN_TOKEN`. Com `NODE_ENV=production` o cabeçalho não autentica. Em todo ambiente a API não sobe se `ADMIN_TOKEN` faltar, tiver menos de 32 caracteres, menos de 16 caracteres distintos ou entropia Shannon abaixo de 3 bits por caractere.

`GET /v1/admin/dealers?cidade=` é a única leitura de lojas. A rota pública `/v1/dealers` não existe mais. A vitrine não lista lojas.

`GET /v1/admin/overview` estoque efetivo por cor, variantes de bateria, banners, cupons, títulos de guia, contagem de pedidos, test rides, trocas e serviços, e as listas recentes (pedido sem e-mail, troca sem telefone). Com Postgres, pedido, test ride, troca, serviço, sessão e `color_stock` saem das tabelas da `0007`. Sem banco, fora de produção, continuam na memória do processo.

`PATCH /v1/admin/stock` — `productId`, `colorId`, `stock`. Não altera `@lume/domain`. A ficha pública (`GET /v1/products` e `GET /v1/products/:slug`) usa esse estoque no lugar do número do domínio, na cor e na variante. Sem linha em `color_stock`, continua o estoque de origem.

O cadastro de autopropelidos grava no Postgres quando `DATABASE_URL` conecta: produto, ficha, variante, foto, acessório, vínculo e avaria. A semente continua Yadea, Aima, MotoChefe, Shineray, MXF e Watts, com `isSample: true`. A vitrine não tem outro catálogo local: se a API cai, a página mostra erro. Fora de produção, sem `DATABASE_URL`, `POST`, `PATCH` e `DELETE` desse cadastro respondem 503 `{ error: "catalogo_indisponivel", message: "O cadastro precisa do Postgres." }` e não guardam o produto na memória. A leitura pública, nesse caso, continua na semente do processo. Com `DATABASE_URL`, falha de conexão ou de migração encerra o processo. `LUME_ALLOW_MEMORY_FALLBACK=1` volta para essa memória. Em produção, sem Postgres de pé, o processo sai antes de escutar. `GET /health` com `persistence: "postgres-configurado"` só diz que `DATABASE_URL` existe. Pedido, test ride, sessão de cliente e de admin, código de login, troca, serviço e estoque por cor gravam e leem em `orders` (com `public_id`), `test_ride_bookings`, `sessions`, `login_codes`, `exchanges`, `service_bookings` e `color_stock`. A sessão de admin expira em 12 horas e o logout apaga a linha. O código de login guarda hash e sal, aceita no máximo 5 tentativas e o reenvio substitui a linha. O `LM` só abre para o dono; o `public_id` abre direto. `PATCH /v1/admin/stock` faz upsert em `color_stock`. O carrossel (`/v1/admin/banners` e `GET /v1/banners`) continua na memória do processo; o flush do cadastro não apaga a tabela `banners` nem `product_colors`. O flush faz upsert por linha na mesma transação e só apaga a filha que o admin removeu. O id da variante permanece, para o pedido continuar apontando a mesma cor.

`products.is_enabled` já está na migration `0004_products_habilitacao_ficha`. O JSON chama o campo `isEnabled`. `status` continua `rascunho | ativo | arquivado`. Habilitado não substitui o status. O `PATCH` aceita `{ isEnabled }`. A listagem pública, o slug, a busca (`q`) e o quiz exigem `status = ativo` e `is_enabled = true`.

`DELETE /v1/admin/products/:id` arquiva (`status: "arquivado"`). A linha, a ficha e as variantes continuam no banco. Apagar de verdade não está aprovado.

A migration `0005_product_specs_numeric` converte as medidas de `product_specs` para `numeric(12,2)`. Também repete `products.is_enabled boolean NOT NULL DEFAULT true` com `ADD COLUMN IF NOT EXISTS` e só cria o CHECK do teto se o nome ainda não existe, para conviver com a migration do DBA. Pode rodar de novo. `32.5` volta na leitura. No arranque, a API descobre os arquivos `0000` até o último `NNNN_nome.sql` ou `NNNN-nome.sql`, em ordem, e aplica cada um uma vez, numa transação com `pg_advisory_xact_lock`, gravando o nome em `schema_migrations` (`name` text PK, `applied_at` timestamptz, `checksum` text, `checksum_enforced` boolean). Banco vazio roda o `0000`. Um `.sql` fora desse padrão, ou um número menor que a última migração aplicada, falha com mensagem. Checksum vazio recebe o hash atual. Checksum antigo de linha anterior a esta checagem, como `0007` e `0009`, só gera aviso e não reaplica o SQL. Checksum divergente de linha gravada por esta checagem derruba o boot. Falha de conexão ou de migração encerra o processo; `LUME_ALLOW_MEMORY_FALLBACK=1` é a única queda para a memória. Um arquivo novo entra sozinho. Se o schema já mostra que a migração rodou, ela só é registrada, sem reexecutar o SQL: o backfill da `0007` não roda de novo. A `0008` não cria objeto; na primeira passagem do livro ela roda uma vez. A `0009` e a `0010` entram por esse caminho. Se a função e o gatilho já existem, a `0009` só é registrada. A `0010` só é registrada quando o gatilho já inclui `UPDATE`. O histórico `0000` não entra nesse arranque. A `0007_acesso_operacao` cria `orders.public_id`, sessão, código de login, troca, agendamento de serviço e `color_stock`, sem apagar linha. A `0008_public_id_restante` preenche `public_id` nulo a partir do payload quando o valor é único e ainda não está em outro pedido. A `0010_public_id_gatilho_seguro` copia o mesmo token no gatilho, no INSERT e no UPDATE, só se ele não está em `public_id` nem em `payload->>'publicId'` de outro pedido. A linha corrente sai pela `code`; `orders` não tem coluna `id`. Token repetido ou já usado fica NULL.

Rodar de novo o seed atualiza as oito scooters pela chave e apaga `foston-x15-max`. Não recoloca `is_enabled` numa linha que o admin já desligou. A Watts da semente é a W1, piso de demonstração R$ 4.300, sem bateria nem autonomia inventadas. Largura e entre-eixos de exemplo ficam em centímetros; a potência nominal de exemplo da W1 (350 W) e da Shineray PT2XS (450 W) fica em watts, com 32 km/h, e essas duas recebem o selo. A descrição marca “Peso e medidas de exemplo.”. Toda variante da semente nasce com estoque de exemplo 5 e cor no formato `Nome (EXEMPLO)`. O seed atualiza essa variante pelo id e não cria outra. Estoque 0 ainda responde `cor_sem_estoque`.

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
