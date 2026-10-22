# Modelo de dados

O catálogo que a vitrine lê está em `packages/domain/src/catalog.ts`. O Postgres, quando ligado, espelha isso em `apps/commerce/src/db/schema.ts` e na migration `apps/commerce/drizzle/0000_bumpy_turbo.sql`. Os dois não estão sincronizados em tempo real.

## Modelo (`Motorcycle`)

`id`, `slug`, `name`, `tagline`, `category` (`mobilete | scooter | naked | adventure | sport`), `brand` (`LUME`, `VOLTIS`, `BRUMA` ou `SENDA`), `registrationClass` (`autopropelido | ciclomotor | moto`), `description`, `basePriceCents`, `topSpeedKmh`, `rangeKm`, `powerKw`, `torqueNm`, `batteryKwh`, `weightKg`, `seatHeightMm`, `chargeHours`, `fastChargeMin` ou `null`, `licenseNote`, `colors`, `accessoryIds`, `optimalSpeedKmh`.

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

CEP com 8 dígitos. `00000000` é inválido. Região pelo primeiro dígito. Serviços `retirada` e `dedicado` quando a região tem loja. Não é Correios.

## Pedido

Código `LM` + ano em dois dígitos + quatro dígitos. Status inicial `aguardando_pagamento`. Campos: método, provedor (`mercadopago` ou `pagarme`), parcelas, subtotal, frete, total, CEP, cliente (nome, e-mail, telefone), linhas. Pix: `copyPaste` e `expiresAt`. Boleto: linha e vencimento. Sem CPF.

## Review, loja, test ride

Review publicado não tem nome de pessoa, só cidade. Review novo nasce `pending`. Lojas: SP Vila Madalena, RJ Botafogo, BH Savassi, Curitiba Batel, POA Moinhos. Test ride exige o modelo na lista da loja.

## Fiscal

A tabela `fiscal_documents` existe com status `nao_emitida`. Não há emissão.
