# Decisões

Registro curto. A data é a do repositório, não um calendário de entrega.

## ADR 1 — Commerce próprio, não Saleor nem Medusa no MVP

O núcleo é preço configurado, Pix, boleto, 21x e CEP, com NF-e depois. Um commerce genérico em Python (Saleor) ou o Medusa v2 empurrariam a regra para plugin antes de ela existir. A API é Hono e a regra é `@lume/domain`. Medusa fica como saída se o admin de pedido, e não a regra, virar o gargalo.

## ADR 2 — Payload no mesmo Postgres, não Sanity

Conteúdo editável (banner, página) mora junto do pedido. Sanity deixaria o conteúdo noutra conta e noutro modelo. Payload entra no MVP-c, depois que a compra funcionar. Até lá o catálogo é código.

## ADR 3 — Meilisearch, não Algolia

A busca da v1 cabe num índice que sobe no Compose. Hoje `searchCatalog` filtra em memória, com dobra de acento. Não há chamada ao Meilisearch no pedido.

## ADR 4 — Drizzle, não Prisma

A migration é SQL legível e o centavo é inteiro. O DBA revisa o arquivo em `apps/commerce/drizzle` antes de produção.

## ADR 5 — 21 vezes sem juros como campanha, juros no código

O varejo brasileiro que serviu de referência mostra a parcela grande e o Pix. `LAUNCH_INTEREST_FREE_UP_TO` é 21. A Tabela Price permanece testada com `interestFreeUpTo: 6` para o financeiro encurtar a carência sem reescrever o checkout.

## ADR 6 — Catálogo no domínio, vitrine independente da API

A vitrine passou a ler `GET /v1/products`. Sem a API, a página mostra erro em vez de abrir o catálogo do código. Pix, parcela e frete de prévia continuam nas funções do domínio, em cima dos números da resposta. O checkout precifica o cadastro do Postgres quando o produto está lá, e `@lume/domain` quando o id não está.

## ADR 7 — Pagamento simulado com prefixo

Nenhum centavo sai. Pix de demonstração começa com `LUME-MOCK-PIX`. Provedor escolhido por `selectProvider`: Mercado Pago para Pix e boleto, Pagar.me para cartão. Stripe não é o adquirente principal.

## ADR 8 — Sem CPF e sem nome em relato

Conta de demonstração é nome e e-mail no navegador. Review leva cidade. Pessoa fictícia não entra no texto.

## ADR 9 — Um acento

Vermelho `#ff2d2d` no CTA, no ponto e num detalhe da moto. Verde-água oficial do Pix só no selo. O grafite e o tipo fino vêm da direção VanMoof/Cowboy; a conversão (21x, Pix, quiz, test ride, busca por cidade) vem do varejo brasileiro.

## ADR 10 — Next em 127.0.0.1

O dev server escuta em `127.0.0.1:43123`. Origem `localhost` no Next 16 não entrega o asset de hidratação para quem abre pelo IP, e o configurador parece quebrado. `allowedDevOrigins` lista os dois hosts.

## ADR 11 — Medição só no console, com escolha separada

Não há script de anúncio. `track` não faz nada até `NEXT_PUBLIC_ANALYTICS=console` e `lume-cookies` ser `analytics`. `ok` e `essential` escondem o aviso e não medem. O evento leva slug, cor, meio ou código de pedido, nunca e-mail.

## ADR 12 — Selo autopropelido calculado

A Resolução CONTRAN 996/2023 pede potência nominal até 1.000 W, 32 km/h, 70 cm de largura e 130 cm de entre-eixos. `autopropelidoBadge` aplica os quatro com `<=`. Valor ausente, negativo ou não finito entra em `missing` e o selo some. `registrationClass` e `powerKw` não ligam o selo. O aviso "verifique as regras da sua cidade" vai em todo resultado. Zero conta como medida informada.

## ADR 13 — Pontuação do quiz

O plano não fixou os pontos. `recommendMotorcycles` soma orçamento (até 6 mil, 6 a 10 mil, acima de 10 mil), autonomia declarada contra faixas de 20, 40, 70 e 90 km, uso, ladeira, bateria removível, quem vai junto, carga, estilo e cor. O teto de até 6 mil e de 6 a 10 mil é rígido: quem passa do valor sai da lista, sem a folga de 12%. Se ninguém cabe, a resposta é vazia. Bateria sem ficha não ganha o ponto de removível nem é eliminada. Garupa, quando `carries` não veio, só é presumida fora de mobilete. Criança e pet não são presumidos. Voltam no máximo três com pontuação positiva; se ninguém passar de zero, volta o menos distante entre os que cabem no teto. Se a lista vier vazia, a API continua vazia: a vitrine é que mostra as mais próximas do catálogo público e o WhatsApp. Acessórios sugeridos dependem da resposta, não de um cadastro novo. `POST /v1/quiz` manda o catálogo de domínio e os produtos ativos e habilitados do cadastro. Autonomia ausente conta 0 na pontuação e continua `null` em `rangeKm`.

## ADR 14 — Sessão de admin e cadastro no Postgres

Uma senha só. O hash scrypt fica em `ADMIN_PASSWORD_HASH`. O cookie `lume_admin` é httpOnly, Path=/ e SameSite=Lax. `Secure` liga em produção: no http local o navegador descartaria o cookie. O logout repete esses atributos. A sessão no servidor cai em 12 horas, e o logout apaga a entrada. Fora de produção o cabeçalho `x-admin-token` continua válido para a tela antiga e para os testes, com o `ADMIN_TOKEN` do ambiente. Não há token padrão. Em produção ele não autentica. O processo não sobe se o token faltar ou tiver menos de 32 caracteres. O limite por IP usa o socket. `x-forwarded-for` só vale com `TRUSTED_PROXIES` apontando para esse socket. Na Vercel, `VERCEL=1` faz a API ler `x-vercel-forwarded-for`. O upload pede `BLOB_READ_WRITE_TOKEN`, devolve só o token de cliente, e o caminho tem de ser `lume/<arquivo>` em JPG, PNG ou WebP de 5 MB. `..` não passa. Criar, editar e arquivar produto, ficha, variante, foto, acessório e avaria grava no Postgres. Sem `DATABASE_URL`, essas rotas respondem 503 e não confirmam a escrita na memória. Com `DATABASE_URL`, falha de conexão ou de migração encerra o processo, salvo `LUME_ALLOW_MEMORY_FALLBACK=1`. `DELETE` arquiva; apagar a linha não está aprovado. O carrossel segue na memória do processo. Pedido, test ride, sessão, código, troca, serviço e estoque por cor estão no ADR 17. A forma pública está em `docs/api.md`.

## ADR 15 — Amostra das marcas pedidas e loja só com habilitado

A semente de exemplo usa Yadea, Aima, MotoChefe, Shineray, MXF e Watts. A Watts é a W1, piso de demonstração de R$ 4.300, sem bateria nem autonomia inventadas. A Foston sai do seed. `rangeKm` segue na vitrine como “Autonomia (declarada)”. `isEnabled` é independente de `status`: só `ativo` e habilitado aparece na loja, na busca, no quiz, no carrinho e no checkout. Desabilitado no carrinho é removido com aviso. O catálogo de domínio responde `isEnabled: true` até viver na mesma tabela. A coluna `is_enabled` está na migration `0004`. O cadastro grava no Postgres. A API não confirma criar, editar ou arquivar só na memória: sem banco a resposta é 503. `rangeKm` é a autonomia declarada, igual a `specs.rangeKmDeclared`, e fica `null` quando a ficha não traz o número.

## ADR 16 — Código de acesso, pedido e borda de produção

O login do cliente gera um código de 6 dígitos por e-mail. Em repouso fica o hash SHA-256 com sal. Vale 10 minutos, cinco tentativas e um uso. Novo envio antes de 60 segundos responde 429 e mantém o código anterior. `MAILER_URL` recebe o texto. Sem provedor, fora de produção, o log `mail_log` carrega o código; em produção a rota responde 503 e não loga. `LUME-SANDBOX` só passa com `LUME_SANDBOX=1` ou `true`, em qualquer `NODE_ENV`. Sem a flag o código não entra.

O código `LM` continua na tela e no Pix de demonstração. A URL e a lista local usam `publicId`. `GET /v1/orders/:LM` exige o e-mail do pedido na query ou na sessão. O identificador longo abre sozinho. A consulta tem limite. `POST /v1/orders/:ref/sandbox` responde 404 sem `LUME_ENABLE_SANDBOX=1` ou `true`, em qualquer `NODE_ENV`.

`CORS_ORIGINS` é a allowlist. Sem origem listada a API não devolve CORS e não usa `STOREFRONT_ORIGIN` nem `*`. `ADMIN_TOKEN` fraco ou ausente impede o processo de escutar. O limite usa Redis em `REDIS_URL` e cai para a memória se o comando falhar. O contrato está em `docs/api.md`.

## ADR 17 — Operação no Postgres

Sessão de cliente e de admin, código de login, pedido, test ride, troca, serviço e estoque por cor usam as tabelas da `0007_acesso_operacao`. A sessão de admin grava `expires_at` em 12 horas e o logout apaga a linha. O código guarda hash e sal; a quinta falha apaga a linha; o reenvio substitui a mesma chave de e-mail. O pedido grava `public_id` na coluna, e a leitura do `LM` continua só do dono. `color_stock` faz upsert na chave `product_id` + `color_id`. Fora de produção, sem `DATABASE_URL`, o processo segue na memória. Em produção, sem a variável ou sem conexão, sai com `boot_recusado`.
