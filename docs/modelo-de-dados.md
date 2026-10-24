# Modelo de dados

O catálogo de demonstração da casa continua em `packages/domain/src/catalog.ts`. O Postgres em `apps/commerce/src/db/schema.ts` guarda pedidos e, desde a migration `0001_autopropelidos_catalog`, o cadastro de autopropelidos. Com `DATABASE_URL`, a vitrine lê esse cadastro em `GET /v1/products` junto do domínio.

## Modelo (`Motorcycle`)

`id`, `slug`, `name`, `tagline`, `category` (`mobilete | scooter | naked | adventure | sport`), `brand` (`LUME`, `VOLTIS`, `BRUMA` ou `SENDA`), `registrationClass` (`autopropelido | ciclomotor | moto`), `description`, `basePriceCents`, `topSpeedKmh`, `rangeKm`, `powerKw`, `powerNominalW`, `widthCm`, `wheelbaseCm`, `torqueNm`, `batteryKwh`, `weightKg`, `seatHeightMm`, `chargeHours`, `fastChargeMin` ou `null`, `licenseNote`, `colors`, `accessoryIds`, `optimalSpeedKmh`.

`powerNominalW`, `widthCm` e `wheelbaseCm` são opcionais no catálogo de código. O selo da vitrine não lê `registrationClass`. Ele sai de `autopropelidoBadge`: nominal até 1.000 W, 32 km/h, 70 cm de largura e 130 cm de entre-eixos. Sem um desses quatro, o modelo não é elegível. `powerKw` continua sendo pico.

Linha de demonstração:

| Slug | Nome | Preço de entrada | Máxima | Autonomia |
| --- | --- | --- | --- | --- |
| `s` | LUME S | R$ 14.900 | 45 km/h | 70 km |
| `city` | LUME City | R$ 21.900 | 95 km/h | 120 km |
| `via` | LUME Via | R$ 34.900 | 130 km/h | 180 km |
| `serra` | LUME Serra | R$ 46.900 | 150 km/h | 230 km |
| `apex` | LUME Apex | R$ 62.900 | 180 km/h | 280 km |

Apex obsidiana no Pix: R$ 59.755,00 (`5_975_500` centavos). Apex Cobre: +R$ 1.800, total R$ 64.700,00. A cor Sal da Serra tem estoque 0 e não pode ser escolhida.

## Cor e acessório

Cor: `id`, `name`, `hex`, `priceDeltaCents`, `stock`. Acessório: `id`, `name`, `description`, `priceCents`, `group`. Compatibilidade é a lista `accessoryIds` do modelo. `configurePrice` recusa acessório de outro modelo e cor sem estoque.

## Preço configurado

`subtotalCents` = base + delta da cor + acessórios, sem duplicar. `pixCents` tira 5% (`PIX_DISCOUNT_BPS = 500`). `boletoCents` tira 3%. O frete não leva desconto. `amountForMethod` escolhe qual dos três entra no pedido.

## Parcela

`LAUNCH_INTEREST_FREE_UP_TO = 21` e `MAX_INSTALLMENTS = 21`. Com a campanha, o total sem juros é o valor à vista. A Tabela Price (1,49% a.m. até 12, 1,99% depois) só cobra quando `interestFreeUpTo` for menor. O teste usa `interestFreeUpTo: 6`.

## Frete

CEP com 8 dígitos. `00000000` é inválido. Região pelo primeiro dígito. O único serviço é `dedicado`, entrega em casa. Não há retirada em loja. Não é Correios.

## Pedido

Código `LM` + ano em dois dígitos + quatro dígitos. Status inicial `aguardando_pagamento`. Campos: método, provedor (`mercadopago` ou `pagarme`), parcelas, subtotal, frete, total, CEP, cliente (nome, e-mail, telefone), linhas. Pix: `copyPaste` e `expiresAt`. Boleto: linha e vencimento. Sem CPF.

## Review, loja, test ride

Review publicado não tem nome de pessoa, só cidade. Review novo nasce `pending`. Lojas: SP Vila Madalena, RJ Botafogo, BH Savassi, Curitiba Batel, POA Moinhos. Test ride exige o modelo na lista da loja.

## Fiscal

A tabela `fiscal_documents` existe com status `nao_emitida`. Não há emissão.

## Postgres do catálogo autopropelido

Migration `apps/commerce/drizzle/0001_autopropelidos_catalog.sql`. Dinheiro continua em centavos inteiros. A vitrine chama `autopropelidoBadge` na resposta, nunca grava o selo. No Postgres, os quatro campos nominais ficam em `product_specs`: potência até 1.000 W, 32 km/h, largura até 70 cm e entre-eixos até 130 cm. Sem um deles, o selo fica oculto. A migration `0004_products_habilitacao_ficha` cria `products.is_enabled` e os `CHECK` de teto. A `0005_product_specs_numeric` passa as medidas para `numeric(12,2)`, repete `is_enabled` com `ADD COLUMN IF NOT EXISTS` e só cria o CHECK do teto se o nome ainda não existe. `rangeKm` da API é `range_km_declared`.

| Tabela | Papel |
| --- | --- |
| `products` | `slug`, `brand`, `category` (`scooter`, `mobilete`, `citycoco`), `style`, `tagline`, `description`, `base_price_cents`, `status` (`rascunho`, `ativo`, `arquivado`), `is_sample`, `is_enabled`, `created_at`, `updated_at`. O peso mora em `product_specs`. `status` ocupa o lugar da antiga coluna `active`. `is_enabled` (migration `0004`, default `true`) tira o produto da loja sem arquivar. |
| `product_specs` | Uma ficha por produto. Medida desconhecida fica `null`, inclusive os booleanos de limitador, campainha e luz. |
| `product_variants` | SKU, cor, rótulo de bateria, `price_delta_cents`, estoque e `active`. |
| `product_images` | Foto com `url`, `alt`, `position`, `is_cover`. `variant_id` é opcional. |
| `accessories` | Ganha `slug`, `kind`, `stock` e `image_url`. `kind` é texto aberto (`bau`, `cesta`, `cadeirinha`… ou o grupo já existente). |
| `product_accessories` | Par produto–acessório e `recommended`. |
| `damages` | Avaria por produto, com `variant_id` opcional, `severity`, `discount_cents`, `public` e `resolved_at`. |
| `damage_images` | Foto da avaria, com `position`. |

`product_colors` permanece da migration `0000`. O grão novo de cor e bateria é `product_variants`.

`banners` ganha `image_url`, `position` e `subtitle` na migration `0002_banners_imagem`. O seed copia esses campos do domínio. O slide de demonstração ainda não tem arquivo, então `image_url` fica nulo.

O seed (`apps/commerce/src/db/seed.ts`) grava as 8 scooters de exemplo com `is_sample = true`, `status = ativo` e `is_enabled = true`. As marcas são Yadea (três modelos), Aima, MotoChefe, Shineray, MXF e Watts. A Watts W1 guarda o piso de demonstração de R$ 4.300, sem ficha de bateria: esse valor não é tabela do fabricante. Os outros números da semente também são de exemplo. O seed apaga o id antigo `foston-x15-max` antes do upsert. Rodar de novo atualiza essas linhas pela chave e não duplica. `is_enabled` fica de fora do `ON CONFLICT`, então um produto desligado continua desligado. O peso de exemplo fica em `product_specs.weight_kg`, inteiro em quilogramas: a mesma unidade de `quoteShipping`, que recusa peso menor ou igual a zero e acima de 400 kg. O teto do banco é 1000 kg. Os valores (DT3 74, M6-H 86, GFX6 98, JET 118, Liberty 91, PT2XS 57, Muv 63, W1 51) não são ficha do fabricante; a descrição diz “Peso e medidas de exemplo.”. Largura e entre-eixos de exemplo também entram na ficha, em centímetros: a unidade de `width_cm`, `wheelbase_cm` e de `autopropelidoBadge` (o banco continua em milímetros e não entra no selo). Potência nominal é watt e velocidade é km/h. A descrição diz “Peso e medidas de exemplo.”. Watts W1 (350 W, 32 km/h, 64 cm, 110 cm) e Shineray PT2XS (450 W, 32 km/h, 68 cm, 122 cm) cabem nos quatro limites. As outras seis passam de 70 cm ou de 130 cm; só a DT3 tem potência nominal (1.000 W), e o selo delas fica oculto. A variante não tem coluna de peso. Toda variante da semente nasce com estoque de exemplo 5. A cor é de exemplo, no formato Nome (EXEMPLO), e o upsert atualiza a linha pelo id: Yadea DT3 Branco `#f4f4f4` (`yadea-dt3-padrao`), M6-H Cinza `#8a8a8a`, GFX6 Azul `#2458a6`, MotoChefe JET Verde `#2f6b4f`, Aima Liberty Bege `#c4b7a6`, Shineray PT2XS Prata `#c0c4c8`, MXF Muv Amarelo `#e0b84a`, Watts W1 Preto `#111111`. O nome leva o sufixo `(EXEMPLO)`. Um pedido que já apontou `yadea-dt3-padrao` (ex.: LM269544) continua nessa variante. Não há foto, nem avaria, nem vínculo em `product_accessories` — o plano não diz qual acessório cabe em qual modelo, e preço de acessório novo não se inventa. Os acessórios que já estavam no domínio continuam no seed, com `slug` igual ao `id`, `kind` igual ao grupo e estoque 0. Lojas e banners seguem o seed anterior.

## Integridade

Migration `0003_catalogo_integridade`. Preço, delta, estoque, desconto de avaria e posições não aceitam negativo. `products.slug`, `accessories.slug` e `product_variants.sku` são únicos. `status` só aceita `rascunho`, `ativo` ou `arquivado`. `category` só aceita `scooter`, `mobilete` ou `citycoco`. `style` fica livre. `severity` só aceita `leve`, `moderada` ou `grave`. Cada produto tem no máximo uma foto com `is_cover`.

Apagar o produto apaga ficha, variantes, fotos, cores legadas, vínculos e avarias. Apagar a variante zera `variant_id` na foto e na avaria, e o registro continua no produto. Apagar a avaria apaga as fotos dela. Apagar o acessório apaga só o vínculo.

Uma avaria é uma unidade: várias linhas no mesmo produto ou variante são várias unidades. `public` nasce falso. `resolved_at` nulo significa avaria aberta. O índice `damages_public_open_idx` cobre as abertas que podem aparecer no site. O banco não confere se a variante pertence ao mesmo produto; isso fica para o CRUD. `image_url`, medidas desconhecidas da ficha, `battery_label`, `variant_id` e `resolved_at` continuam nulos.

Em `0001`, produto que já existia recebe `brand`, `style`, `tagline` e `description` vazios, e acessório que já existia recebe `slug` igual ao `id` e `kind` vazio. Essas colunas entram nullable, o backfill roda, e só então ficam `NOT NULL`. `stock`, `status`, `is_sample` e os timestamps já nasciam com default. `0002` só acrescenta `NOT NULL` com default (`subtitle`, `position`). `0003` não acrescenta coluna.

`products.is_enabled` é `boolean NOT NULL DEFAULT true`, independente de `status` (`rascunho`, `ativo`, `arquivado`). A listagem pública (`status = ativo`) também exige `is_enabled`. A migration do DBA, `0004_products_habilitacao_ficha`, cria a coluna e o índice `products_is_enabled_idx` com `IF NOT EXISTS`, e troca os CHECKs de `product_specs` pelos tetos de `productSpecsBody` (`<= 20000` W, `150` km/h, `300` cm, `400` cm, `1000` kg, `1500` mm, `200` V, `500` Ah, `48` h, `1000` km), ainda aceitando `NULL` e `>= 0`. Cada CHECK faz `DROP CONSTRAINT IF EXISTS` antes de nascer de novo. A `0005` repete `ADD COLUMN IF NOT EXISTS` e o índice, passa as onze medidas para `numeric(12,2)` e só cria o CHECK quando o nome ainda não existe. As duas podem rodar em qualquer ordem, mais de uma vez. A semente das marcas Yadea, Aima, MotoChefe, Shineray, MXF e Watts marca `is_sample` e não recoloca `is_enabled` no conflito. A `0006_consultas_loja` só cria índice e o check `orders_money_non_negative` como `NOT VALID`. Não apaga linha. Antes do `VALIDATE`, `pnpm db:audit` lista centavos negativos, e-mail duplicado, test ride órfão e status ou parcela fora do conjunto, sem gravar. O id `foston-x15-max` só sai da semente quando nenhum `orders.payload` o cita.

A `0007_acesso_operacao` acrescenta `orders.public_id` (`text` NULL) e o índice único `orders_public_id_idx`. Vários NULL cabem. O backfill copia `payload->>'publicId'` quando o texto não é vazio e `public_id` ainda é NULL. Se o mesmo publicId aparece em mais de um pedido ainda nulo, nenhum recebe o valor (`count` na janela = 1 e `NOT EXISTS`). A migration emite `RAISE WARNING` e não apaga a linha. `public_id` já preenchido não muda. O restante de `orders` não muda. Também cria `sessions` (`token` PK, `kind` `customer`|`admin`, e-mail obrigatório só no cliente), `login_codes` (hash e salt, `attempts` de 0 a 5, sem código em claro), `exchanges` (ano 1990–2030, km 0–500000), `service_bookings` (sem FK; `preferred_date` no formato `YYYY-MM-DD`) e `color_stock` (PK `product_id`+`color_id`, `stock >= 0`, sem FK). Não mexe em `test_ride_bookings` nem no estoque de `product_variants` ou `product_colors`. Pode rodar de novo. A API grava e lê essas tabelas, e também `test_ride_bookings`, quando `DATABASE_URL` conecta. Pedido novo grava `public_id` no insert/upsert por `code`. O índice único rejeita token repetido. A API não preenche `public_id` de linha antiga: isso fica na migração. A `0008_public_id_restante` repete o backfill só onde `public_id` ainda é NULL e `payload->>'publicId'` não é vazio. Se o valor já está em outro pedido, ou se mais de um candidato nulo traz o mesmo valor (`count` na janela e `NOT EXISTS`), a linha continua NULL. Não apaga pedido e não altera outra coluna. Pode rodar de novo. A leitura do token é `where public_id = $1`. A `0009_public_id_gatilho` só cria a função e o gatilho se ainda não existem, com corpo que não copia token: reaplicar esse arquivo não desfaz a `0010`. A `0010_public_id_gatilho_seguro` substitui a função e recria o gatilho `BEFORE INSERT OR UPDATE OF payload, public_id`, com `WHEN (NEW.public_id IS NULL)`. A função copia `payload->>'publicId'` só quando o texto não é vazio, nenhum outro pedido tem o valor em `public_id` e nenhum outro pedido tem o valor em `payload->>'publicId'`. A chave da linha é `code`; não existe coluna `id`. Token vazio, repetido ou já usado deixa `public_id` NULL e o insert não falha no índice único. Valor já preenchido não muda. Não há DEFAULT nem NOT NULL. As duas podem rodar de novo. O arranque ainda aplica `0004` a `0008`; a `0010` passa a valer quando o runner listar o arquivo.

O CRUD de produto, ficha, variante, foto, acessório e avaria grava no Postgres. Cada escrita relê o cadastro e, na mesma transação, faz upsert por linha (`INSERT ... ON CONFLICT DO UPDATE`). Linha igual não é regravada. Só sai a filha que o admin tirou: variante, foto, vínculo, avaria, foto da avaria ou acessório sem vínculo. O id não muda, então pedido e FK continuam na mesma linha. `product_colors` não entra nesse flush. Banners não entram no flush. Sem banco, a escrita responde 503. `DELETE` de produto só muda `status` para `arquivado`. O checkout e `POST /v1/pricing/configure` precificam o produto do banco pelo `base_price_cents` e pela variante; linha desabilitada ou fora de `ativo` responde `produto_desabilitado`. O catálogo de `@lume/domain` continua no preço quando o id não está no cadastro.
