# Funcionalidades

Cada item diz o que faz, onde mora e como estender sem duplicar regra.

## Home

`app/page.tsx`, `components/hero.tsx`, `components/hero-film.tsx`.

O hero pinta um canvas antes de qualquer mp4. Se existir `public/hero.mp4`, o filme entra por cima. Preço, 21x e Pix vêm de `configurePrice` na Apex obsidiana. Os `data-testid` `hero-title`, `installment-price` e `pix-price` são do teste de ponta a ponta: não remova.

Estender: novo capítulo entra como `<section>` na home. Banner editável é v1 (Payload). Não coloque o viewer 3D aqui.

## Catálogo

`app/motos/page.tsx` e `components/category-search.tsx`.

A grade lê `GET /v1/products` e filtra no navegador por categoria, marca e texto. O filtro Cidade da loja saiu junto com a aba Lojas. A busca ignora acento e encontra o nome da marca. `sortProducts` em `lib/catalog.ts` ordena por preço ou velocidade. Não há mais ordem “Maior autonomia”. Os parâmetros são `ordem` e `marca`. A barra usa três colunas (`gap-x-6 gap-y-5`), rótulo pequeno sem tracking largo, e a busca fica numa linha própria com o botão. As marcas são as que a API devolve. Se a API não responde, a página mostra o erro e não abre o catálogo do código.

Estado vazio oferece limpar o filtro. Cor sem estoque não entra no preço do card: o card usa a primeira cor com estoque.

Estender: um filtro novo nasce em `ShowroomQuery` e no formulário. Não filtre preço no componente com uma conta paralela.

## Página do modelo

`app/motos/[slug]/page.tsx` e `components/configurator.tsx`.

A página chama `GET /v1/products/:slug`. Cor e bateria usam `priceProduct` em cima de `basePriceCents`, `colors` e `batteries` da resposta. A seção de acessórios saiu do configurador: a reserva manda `accessoryIds` vazio. Lista de bateria vazia não inventa pacote: a reserva omite `batteryId` e o preço não soma delta. O total ao vivo está em `data-testid="live-price"`. A cor Cobre da Apex é `color-cobre`. Reservar é `reserve` e só existe uma vez: a barra móvel chama a mesma função sem o testid, para o Playwright não achar dois botões. Avarias públicas e não resolvidas aparecem na ficha, com o desconto em centavos. Fotos com `isCover` entram na galeria.

O 360° (`components/bike-viewer.tsx`) só monta no clique. `html[data-configurator=ready]` marca a hidratação. Com `prefers-reduced-motion`, o modelo não gira sozinho.

A ficha é uma tabela de duas colunas (Item / Valor) na coluna da galeria, ao lado do card de preço. No celular ela fica depois do preço. Potência nominal lê `powerNominalW`. Sem esse campo, a célula diz “não informado”: `powerKw` é pico e não entra nessa linha. Largura e entre-eixos usam `widthCm` e `wheelbaseCm` quando existem. A autonomia é só o número publicado. O simulador saiu da página. `POST /v1/range` também saiu da API. `estimateRange` continua no domínio, no backup `backup/lume-versao-completa` para a versão anterior. A comparação com gasolina (`SavingsCalculator`) fica.

O selo usa `product.autopropelido` da API (`eligible`, `label`, `notice`). A vitrine não recalcula o selo. Não use `registrationClass` para ligá-lo. O aviso aponta para `/legislacao` e acompanha o selo; na home e no catálogo o aviso aparece mesmo sem selo. `isSample: true` mostra a faixa “Dado de exemplo”. Campo ausente fica `null` e a ficha diz “não informado”. A autonomia continua no rótulo “Autonomia (declarada)”.

Parcelas de 1, 6, 12 e 21: `InstallmentTable` com `compact`. A parcela de 21 continua escrita por extenso. O botão de conversa usa `whatsappHref` em `lib/whatsapp.ts`.

Reviews publicados vêm de `GET /v1/products/:slug` (`reviews`). O formulário posta em `/v1/reviews`. Se a API não responder, `submitReview` guarda o texto em `lume-reviews-pending` e a página mostra “pendente · só neste navegador”. Não publique relato sem moderação. Não use nome de pessoa.

Modelos próximos saem da mesma lista de `GET /v1/products`. JSON-LD de Product/Offer em BRL usa o preço de tabela, não o configurado.

Estender: campo novo de ficha é uma linha em `SpecTable`. Não recoloque o simulador de autonomia nem a lista de acessórios no configurador.

## Comparar

`app/comparar/page.tsx`, `components/compare-table.tsx`, `components/compare-picker.tsx`.

Até três slugs em `?modelos=`. O preço é o de entrada, sem acessório. O picker faz `router.push`. Não use checkbox em GET.

## Quiz

`components/quiz.tsx` posta em `POST /v1/quiz` e casa o slug com `GET /v1/products` para preço e economia. Sem a lista, o nome ainda aparece e o preço não é inventado. Sem kWh ou autonomia declarada, a linha de gasolina some. O passo anima com Motion e respeita `prefers-reduced-motion`.

Perguntas: uso (trabalho, entregas, passeio, levar criança), km por dia (até 20, 20 a 40, 40 a 70, mais de 70), ladeira, tomada ou bateria removível, sozinho / passageiro / criança / pet, baú / cesta / nenhum, orçamento até 6 mil, 6 a 10 mil ou mais de 10 mil, estilo retrô / citycoco / esportivo e cor escura / clara / quente / tanto faz. O resultado traz de 1 a 3 modelos, o motivo e os acessórios sugeridos (baú 29–41 L, cesta, cadeirinha, retrovisor, capacete, capa, suporte de celular, gaiola pet). Não há pergunta de CNH.

Estender: pergunta nova é um passo no array e um campo em `QuizAnswers`, com teste no domínio.

O carrossel da home (`components/home-carousel.tsx`) lê `GET /v1/banners`. Se a API não responder, ficam o quiz e o WhatsApp, sem a lista de banners do código. Foto, título, subtítulo, link e ordem. Só entra slide ativo. Troca a cada 6 s, pausa no mouse ou no foco, tem setas e bolinhas, e não anima para quem pede menos movimento. Se houver menos de três slides ativos, a vitrine completa com o quiz e o WhatsApp, até cinco.

## WhatsApp no lugar do test ride

`/test-ride` não agenda mais. A página, a faixa fixa, o menu, o rodapé e o card de preço abrem `wa.me` por `whatsappHref` (`lib/whatsapp.ts`), o mesmo número de `NEXT_PUBLIC_WHATSAPP` do botão flutuante. Não há formulário nem `POST /v1/test-rides` a partir da vitrine. A rota antiga `/lojas` redireciona para `/contato`.

O serviço (`app/servico/page.tsx`, `components/service-form.tsx`) não lista loja. A conversa é o WhatsApp (`whatsappHref`) ou `/contato`. A vitrine não chama `POST /v1/service-bookings`.

## Lojas

A aba, a página, o mapa, os stories e o filtro Cidade da loja saíram. Não reponha link para `/lojas`: a rota redireciona para `/contato`. `GET /v1/dealers` saiu da API pública; a lista autenticada ficou em `GET /v1/admin/dealers`. O frete não oferece retirada.

## Carrinho

`components/shop-provider.tsx` e `components/cart-view.tsx`.

Quantidade máxima 2. Linha igual (mesmo modelo, cor e acessórios) soma. `clear` zera as linhas e preserva desejos e códigos de pedido. O preço é refeito com `configurePrice`.

## Checkout

`components/checkout-form.tsx`.

Métodos: Pix (−5%), boleto (−3%), cartão 1 a 21 vezes sem juros. A prévia usa `amountForMethod` e soma o frete. A parcela da prévia inclui o frete. O único serviço é `dedicado` (“Entrega da moto em casa”). O POST manda linhas, CEP, serviço, método e cliente. A API ignora qualquer total. Pix de demonstração começa com `LUME-MOCK-PIX`.

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

`app/admin/page.tsx`, `components/admin-panel.tsx` e `components/admin-catalog.tsx`. A entrada é uma senha só: `POST /v1/admin/login` com `{ password }`. O cookie `lume_admin` é httpOnly. `POST /v1/admin/logout` apaga a sessão. Sem nome de usuário. Se o servidor ainda não tem `ADMIN_PASSWORD_HASH`, a tela mostra a mensagem da API e aceita o token antigo (`x-admin-token`, `lume-admin-token` no `sessionStorage`, desenvolvimento `dev-admin-token`). Em produção esse cabeçalho não autentica.

`GET /v1/admin/overview` lista o catálogo de demonstração, pedido, cupom, guia, troca e serviço. `PATCH /v1/admin/stock` altera só a memória da API. Não muda a vitrine.

O cadastro novo lê `GET /v1/admin/products`, `/accessories`, `/damages` e `/banners`. A lista traz ativo, rascunho ou arquivado, exemplo ou confirmado, e o estoque somado das variantes. Criar é `POST /v1/admin/products`. Duplicar é `POST /v1/admin/products/:id/duplicate`. Arquivar é `DELETE` e não apaga a linha.

- Abas: Dados, Ficha, Fotos, Variantes, Acessórios e Avarias. A ficha manda `powerNominalW`. Não copia pico para a nominal. O selo não tem checkbox. Categoria só scooter, mobilete ou citycoco.
- Fotos: JPG, PNG ou WebP, até 5 MB, pelo cliente do Blob em `POST /v1/admin/uploads`. O token de escrita não entra no browser. Sem `BLOB_READ_WRITE_TOKEN` o envio avisa e para. A ordem é `PATCH /v1/admin/products/:id/images` com `{ images: [{ id, position, isCover }] }`. A primeira é a capa.
- Variante: `POST /v1/admin/products/:id/variants`.
- Acessório: `POST /v1/admin/accessories`. A compatibilidade grava `{ accessories: [{ accessoryId, recommended }] }` no produto.
- Avaria: `POST /v1/admin/damages` com `isPublic`, `discountCents` e `variantId` opcional. A API pública só devolve as avarias públicas e não resolvidas. A página do modelo lista essas avarias e o desconto. O card e o checkout não aplicam esse desconto.
- Carrossel: `POST /v1/admin/banners`.

## Barra de test ride e menu

`components/sticky-test-ride.tsx` é a faixa de WhatsApp. Some em `/checkout`, `/test-ride`, `/admin` e `/motos/[slug]`. `components/floating-nav.tsx` mantém um único Reservar vermelho no desktop. O menu é Motos, Comparar e Quiz. Institucional fica no rodapé e no menu móvel.
