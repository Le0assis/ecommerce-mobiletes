# Roadmap e status

Sem prazo em dias. A ordem é a dependência. Status de outubro de 2026, neste repositório.

## Feito

Fundação: monorepo, domínio testado, API com checkout simulado, Compose, CI, requisitos.

Vitrine: home, catálogo com filtro e ordem, PDP com cor, acessório, 360° esquemático, autonomia, parcelas, review com fallback local, comparação, quiz, test ride, lojas com esquema, carrinho, checkout com prévia, conta local, pedidos, desejos, financiamento e páginas institucionais. Camada `lib/catalog.ts` e `lib/shop-api.ts`.

## MVP-a — cobrar de verdade

Catálogo servido pelo banco, de forma que o admin de estoque mude a vitrine. Pix com um adquirente em homologação e depois produção. ViaCEP e frete de transportadora no lugar da tabela por prefixo. Pedido com status vindo de webhook. Sentry.

## MVP-b — o resto da compra

Boleto e cartão na Pagar.me com webhook, idempotência de webhook duplicado, quiz e comparação lendo o catálogo do banco, test ride confirmado pela loja, conta por link mágico, review moderado de verdade, desejos na conta, e-mail transacional.

## MVP-c — operação

Segundo adquirente se o contrato pedir. Payload para banner e página. Meilisearch de fato. Mapa com coordenada. Pedido de exclusão de conta que apaga a linha. Funil observado.

## v2

NF-e (Focus NFe, NFe.io ou eNotas), com o contador, porque veículo tem emplacamento. glTF no 360° e filme HLS. GSAP só se houver cena pinada. CDC bancário, além da parcela do cartão. Troca de usado. Manual e garantia operacionais. Rede de recarga. Multi-depósito. Indicação.

Fora até alguém reabrir: assinatura, troca de bateria no modelo de estação, aplicativo nativo, multi-marca.

## Como saber se regrediu

`pnpm test` no domínio e na API. Playwright na troca de cor da Apex. A pessoa, no navegador: home, filtro do catálogo, configurador, quiz, test ride, checkout Pix e a lista de pedidos.
