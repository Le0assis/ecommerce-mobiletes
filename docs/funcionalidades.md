# Funcionalidades

Cada item diz o que faz, onde mora e como estender sem duplicar regra.

## Home

`app/page.tsx`, `components/hero.tsx`, `components/hero-film.tsx`.

O hero pinta um canvas antes de qualquer mp4. Se existir `public/hero.mp4`, o filme entra por cima. Preço, 21x e Pix vêm de `configurePrice` na Apex obsidiana. Os `data-testid` `hero-title`, `installment-price` e `pix-price` são do teste de ponta a ponta: não remova.

Estender: novo capítulo entra como `<section>` na home. Banner editável é v1 (Payload). Não coloque o viewer 3D aqui.

## Catálogo

`app/motos/page.tsx` e `components/category-search.tsx`.

`filterShowroom` aplica categoria, marca, cidade e texto. Cidade filtra onde há test ride, não o frete. A busca ignora acento e encontra o nome da marca. `sortProducts` em `lib/catalog.ts` ordena por preço, autonomia ou velocidade. Os parâmetros são `ordem` e `marca`. VOLTIS, BRUMA e SENDA são marcas de demonstração.

Estado vazio oferece limpar o filtro. Cor sem estoque não entra no preço do card: o card usa a primeira cor com estoque.

Estender: um filtro novo nasce em `ShowroomQuery` e no formulário. Não filtre preço no componente com uma conta paralela.

## Página do modelo

`app/motos/[slug]/page.tsx` e `components/configurator.tsx`.

Cor, bateria e acessório chamam `configurePrice`. Sem `batteryId`, vale o primeiro pacote, de delta zero. O total ao vivo está em `data-testid="live-price"`. A cor Cobre da Apex é `color-cobre`. Reservar é `reserve` e só existe uma vez: a barra móvel chama a mesma função sem o testid, para o Playwright não achar dois botões.

O 360° (`components/bike-viewer.tsx`) só monta no clique. `html[data-configurator=ready]` marca a hidratação. Com `prefers-reduced-motion`, o modelo não gira sozinho.

Autonomia: a vitrine ainda chama `estimateRange` no domínio. `POST /v1/range` não existe mais na API. A seção do simulador sai do configurador na etapa da vitrine; o código anterior fica em `backup/lume-versao-completa`. Parcelas de 1, 6, 12 e 21: `InstallmentTable` com `compact`. A parcela de 21 continua escrita por extenso.

Reviews publicados vêm de `reviewsFor`. O formulário posta em `/v1/reviews`. Se a API não responder, `submitReview` guarda o texto em `lume-reviews-pending` e a página mostra “pendente · só neste navegador”. Não publique relato sem moderação. Não use nome de pessoa.

Modelos próximos: `relatedMotorcycles`. JSON-LD de Product/Offer em BRL usa o preço de tabela, não o configurado.

Estender: campo novo de ficha é uma linha em `Spec` lendo a propriedade do modelo. Acessório novo entra em `accessories` e em `accessoryIds` do modelo.

## Comparar

`app/comparar/page.tsx`, `components/compare-table.tsx`, `components/compare-picker.tsx`.

Até três slugs em `?modelos=`. O preço é o de entrada, sem acessório. O picker faz `router.push`. Não use checkbox em GET.

## Quiz

`components/quiz.tsx` chama `recommendMotorcycles`. As mesmas respostas podem ir a `POST /v1/quiz`; a tela calcula no domínio para não depender da API. O passo anima com Motion e respeita `prefers-reduced-motion`.

Estender: pergunta nova é um passo no array e um campo em `QuizAnswers`, com teste no domínio.

## Test ride

`components/test-ride-form.tsx` → `bookTestRide` → `POST /v1/test-rides`.

A loja precisa ter o slug em `testRideSlugs`. A confirmação humana é v1. O protocolo mostrado são os oito primeiros caracteres do id.

## Lojas

`app/lojas/page.tsx`, `components/locator-map.tsx`, `components/dealer-stories.tsx`.

A projeção usa latitude e longitude num desenho do Brasil. A legenda diz que não é um mapa de tiles. O filtro por cidade usa a lista do domínio. `GET /v1/dealers` saiu da API pública; a lista autenticada ficou em `GET /v1/admin/dealers`. A aba Lojas sai da vitrine nesta etapa.

## Carrinho

`components/shop-provider.tsx` e `components/cart-view.tsx`.

Quantidade máxima 2. Linha igual (mesmo modelo, cor e acessórios) soma. `clear` zera as linhas e preserva desejos e códigos de pedido. O preço é refeito com `configurePrice`.

## Checkout

`components/checkout-form.tsx`.

Métodos: Pix (−5%), boleto (−3%), cartão 1 a 21 vezes sem juros. A prévia usa `amountForMethod` e soma o frete. A parcela da prévia inclui o frete. O POST manda linhas, CEP, serviço, método e cliente. A API ignora qualquer total. Pix de demonstração começa com `LUME-MOCK-PIX`.

Depois do sucesso, `rememberOrder` grava o código e `clear` esvazia o carrinho. A navegação vai para `/pedido/[code]`.

## Pedido e lista

`components/order-status.tsx` lê `GET /v1/orders/:code`. `components/order-list.tsx` lê os códigos de `lume-shop-v1` e busca cada um. Se a API reiniciou sem Postgres, o código continua na lista e o detalhe falha com texto explicando.

## Conta e desejos

`components/account-form.tsx` grava nome e e-mail em `lume-profile`. Sem senha. `components/wishlist-view.tsx` e `components/wish-toggle.tsx` usam os slugs do provider. A página é `/desejos`.

## Financiamento

`components/financing-simulator.tsx` em `/financiamento`. O valor digitado é a moto, sem frete. O checkout é a fonte do total com frete. Não há CDC bancário: é parcela de cartão.

## Institucional e contato

`components/page-shell.tsx` dá o título. `/contato` guarda a mensagem em `lume-messages` e avisa que nada foi enviado. Garantia e trocas são texto de demonstração; o contrato futuro prevalece. Energia explica carga em casa, sem troca de bateria.

## Admin

`components/admin-panel.tsx`. Token em `sessionStorage` (`lume-admin-token`). `GET /v1/admin/overview` lista produto, variante de bateria, estoque, pedido, cupom, guia, troca e serviço. `PATCH /v1/admin/stock` altera só a memória da API. Não muda a vitrine.

## Barra de test ride e menu

`components/sticky-test-ride.tsx` some em `/checkout`, `/test-ride`, `/admin` e `/motos/[slug]`. `components/floating-nav.tsx` mantém um único Reservar vermelho no desktop. Institucional fica no rodapé e no menu móvel.
