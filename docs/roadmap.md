# Roadmap e status

Sem prazo em dias. A ordem é a dependência. Status de outubro de 2026, neste repositório.

## Feito

Fundação: monorepo, domínio testado, API com checkout simulado, Compose, CI, requisitos.

Vitrine em seis etapas empilhadas, sem merge: fundação multimarca, configurador com bateria e economia, checkout com cupom e sandbox, mapa, WhatsApp e troca, conteúdo (guias, legislação, FAQ, serviço) e operação (admin ampliado, SEO, medição local, aviso de cookie em duas escolhas, Playwright extra e [guia de deploy](deploy.md)).

A loja que essas etapas somam: home, catálogo com marca, galeria, configurador, comparador, quiz, calculadora, carrinho, checkout, conta sandbox, pedidos, desejos, financiamento, WhatsApp, troca, guias, legislação, FAQ, serviço e admin em memória. Camada `lib/catalog.ts` e `lib/shop-api.ts`.

Em `feat/lume-autopropelidos`, a vitrine tirou o filtro Cidade da loja, a aba Lojas, o simulador de autonomia, os acessórios do configurador e o formulário de test ride. A ficha do modelo é uma tabela ao lado do preço. A comparação com gasolina ficou. A loja só lista produto habilitado. O admin já alterna `isEnabled`, mas criar, editar e excluir produto ainda não gravam no Postgres. Esse passo está descrito em `docs/api.md`.

## MVP-a — cobrar de verdade

Catálogo servido pelo banco, de forma que o admin de estoque mude a vitrine. Pix com um adquirente em homologação e depois produção. ViaCEP e frete de transportadora no lugar da tabela por prefixo. Pedido com status vindo de webhook. Sentry.

## MVP-b — o resto da compra

Boleto e cartão na Pagar.me com webhook, idempotência de webhook duplicado, quiz e comparação lendo o catálogo do banco, test ride confirmado pela loja, conta por link mágico, review moderado de verdade, desejos na conta, e-mail transacional.

## MVP-c — operação

Segundo adquirente se o contrato pedir. Payload no lugar de `guides.ts`. Meilisearch de fato. Tiles de mapa no lugar da projeção. Pedido de exclusão de conta que apaga a linha. Funil num coletor, no lugar do `console`.

## v2

NF-e (Focus NFe, NFe.io ou eNotas), com o contador, porque veículo tem emplacamento. glTF no 360° e filme HLS. GSAP só se houver cena pinada. CDC bancário, além da parcela do cartão. Troca de usado. Manual e garantia operacionais. Rede de recarga. Multi-depósito. Indicação.

Fora até alguém reabrir: assinatura, troca de bateria no modelo de estação, aplicativo nativo. A grade multimarca foi reaberta pelo dono na etapa 1, só com marcas de demonstração.

## Como saber se regrediu

`pnpm test` no domínio e na API. Playwright na troca de cor da Apex e no filtro VOLTIS mais a página de legislação. A pessoa, no navegador: home, filtro do catálogo, configurador, quiz, test ride, checkout Pix e a lista de pedidos.
