# Modelo de dados

O catálogo que a vitrine lê está em `packages/domain/src/catalog.ts`. O Postgres em `apps/commerce/src/db/schema.ts` guarda pedidos e, desde a migration `0001_autopropelidos_catalog`, o catálogo de autopropelidos. A vitrine ainda não lê essas tabelas.

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

Migration `apps/commerce/drizzle/0001_autopropelidos_catalog.sql`. Dinheiro continua em centavos inteiros. A vitrine hoje chama `autopropelidoBadge` no catálogo de código. No Postgres, os mesmos quatro campos ficam em `product_specs`: potência nominal até 1.000 W, 32 km/h, largura até 70 cm e entre-eixos até 130 cm. Sem um deles, o selo fica oculto.

| Tabela | Papel |
| --- | --- |
| `products` | `slug`, `brand`, `category` (`scooter`, `mobilete`, `citycoco`), `style`, `tagline`, `description`, `base_price_cents`, `status` (`rascunho`, `ativo`, `arquivado`), `is_sample`, `created_at`, `updated_at`. O peso mora em `product_specs`. `status` ocupa o lugar da antiga coluna `active`. |
| `product_specs` | Uma ficha por produto. Medida desconhecida fica `null`, inclusive os booleanos de limitador, campainha e luz. |
| `product_variants` | SKU, cor, rótulo de bateria, `price_delta_cents`, estoque e `active`. |
| `product_images` | Foto com `url`, `alt`, `position`, `is_cover`. `variant_id` é opcional. |
| `accessories` | Ganha `slug`, `kind`, `stock` e `image_url`. `kind` é texto aberto (`bau`, `cesta`, `cadeirinha`… ou o grupo já existente). |
| `product_accessories` | Par produto–acessório e `recommended`. |
| `damages` | Avaria por produto, com `variant_id` opcional, `severity`, `discount_cents`, `public` e `resolved_at`. |
| `damage_images` | Foto da avaria, com `position`. |

`product_colors` permanece da migration `0000`. O grão novo de cor e bateria é `product_variants`.

`banners` ganha `image_url`, `position` e `subtitle` na migration `0002_banners_imagem`. O seed copia esses campos do domínio. O slide de demonstração ainda não tem arquivo, então `image_url` fica nulo.

O seed (`apps/commerce/src/db/seed.ts`) grava as 8 scooters de exemplo com `is_sample = true` e `status = ativo`. Rodar de novo atualiza essas linhas pela chave e não duplica. Estoque de exemplo é 0. Cor de exemplo é "A confirmar" (`#8a8a8a`): o plano não trouxe cor. Não há foto, nem avaria, nem vínculo em `product_accessories` — o plano não diz qual acessório cabe em qual modelo, e preço de acessório novo não se inventa. Os acessórios que já estavam no domínio continuam no seed, com `slug` igual ao `id`, `kind` igual ao grupo e estoque 0. Lojas e banners seguem o seed anterior.

## Integridade

Migration `0003_catalogo_integridade`. Preço, delta, estoque, desconto de avaria e posições não aceitam negativo. `products.slug`, `accessories.slug` e `product_variants.sku` são únicos. `status` só aceita `rascunho`, `ativo` ou `arquivado`. `category` só aceita `scooter`, `mobilete` ou `citycoco`. `style` fica livre. `severity` só aceita `leve`, `moderada` ou `grave`. Cada produto tem no máximo uma foto com `is_cover`.

Apagar o produto apaga ficha, variantes, fotos, cores legadas, vínculos e avarias. Apagar a variante zera `variant_id` na foto e na avaria, e o registro continua no produto. Apagar a avaria apaga as fotos dela. Apagar o acessório apaga só o vínculo.

Uma avaria é uma unidade: várias linhas no mesmo produto ou variante são várias unidades. `public` nasce falso. `resolved_at` nulo significa avaria aberta. O índice `damages_public_open_idx` cobre as abertas que podem aparecer no site. O banco não confere se a variante pertence ao mesmo produto; isso fica para o CRUD. `image_url`, medidas desconhecidas da ficha, `battery_label`, `variant_id` e `resolved_at` continuam nulos.

Em `0001`, produto que já existia recebe `brand`, `style`, `tagline` e `description` vazios, e acessório que já existia recebe `slug` igual ao `id` e `kind` vazio. Essas colunas entram nullable, o backfill roda, e só então ficam `NOT NULL`. `stock`, `status`, `is_sample` e os timestamps já nasciam com default. `0002` só acrescenta `NOT NULL` com default (`subtitle`, `position`). `0003` não acrescenta coluna.

O CRUD de `/v1/admin` desta etapa guarda produtos, variantes, fotos, acessórios, avarias e banners na memória do processo, com a mesma semente das 8 scooters. Não escreve no Postgres. O checkout continua no catálogo de `@lume/domain`.
