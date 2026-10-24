# Para agentes de IA

Leia [docs/README.md](docs/README.md) antes de alterar este repositório. A documentação em `docs/` é o contexto do produto, em português: visão, arquitetura, contratos, design system, como fazer uma mudança comum e o que ainda não existe.

`apps/storefront/AGENTS.md` é o guia de versão do Next.js, gerado pelo framework. Não é o guia da LUME. Se os dois discordarem, valem `docs/` e `packages/domain`.

Regras que não se negociam ao implementar:

- Parcela, Pix, boleto, frete e economia contra gasolina nascem em `packages/domain`. O preço de tabela de um produto do cadastro é o `basePriceCents` gravado no Postgres. A vitrine não inventa número. A API recalcula no checkout.
- `batteryId` é opcional. Ausente, a bateria de série entra com delta zero. O schema do checkout precisa repassar o campo, senão o Zod descarta e o servidor cobra a de série.
- Dinheiro é inteiro em centavos.
- O vermelho `#ff2d2d` é o único acento de marca, no CTA principal, no ponto da marca e num detalhe da moto. O verde-água `#32bcad` só aparece no selo Pix.
- Campanha de lançamento: 21x sem juros. Não reescreva a Tabela Price. Para encurtar a carência, baixe `LAUNCH_INTEREST_FREE_UP_TO`.
- Pix de demonstração começa com `LUME-MOCK-PIX`. Sem CPF. Sem nome de pessoa em review.
- A vitrine lê o catálogo em `GET /v1/products`, por `apps/storefront/lib/catalog.ts`. Sem a API, a página mostra erro e não abre o catálogo do código. O checkout e `POST /v1/pricing/configure` precificam o produto do Postgres (id ou slug, variante como cor). Id ausente no cadastro segue em `@lume/domain`. Desabilitado ou fora de `ativo` responde 400 `produto_desabilitado`. Estoque da variante do cadastro entra no card e no checkout. `PATCH /v1/admin/stock` grava `color_stock` e não altera essa variante nem `@lume/domain`. A ficha e a lista pública cobrem cor e variante com esse número; sem a linha, fica o estoque de origem. O preço do modelo de domínio continua em `configurePrice`.
- Marcas parceiras do catálogo de domínio (VOLTIS, BRUMA, SENDA) são inventadas. Não copie foto nem preço de loja para esse catálogo. A semente em `apps/commerce/src/db/sample-scooters.ts` usa Yadea, Aima, MotoChefe, Shineray, MXF e Watts, todas com `isSample: true` e números de exemplo. A Watts é a W1, piso de demonstração, sem bateria nem autonomia inventadas.
- Só produto `ativo` e `isEnabled` entra na loja, na busca, no quiz, no carrinho e no checkout. Desabilitado no carrinho sai com aviso. O admin grava `isEnabled` na API. `is_enabled` está na migration `0004`. Criar, editar e arquivar produto, ficha, variante, foto, acessório e avaria grava no Postgres. Sem `DATABASE_URL`, essa escrita responde 503 `catalogo_indisponivel` e não fica na memória. Com `DATABASE_URL`, falha de conexão ou de migração encerra o processo, salvo `LUME_ALLOW_MEMORY_FALLBACK=1`. `DELETE` arquiva; apagar a linha não está aprovado. `rangeKm` é a autonomia declarada (`specs.rangeKmDeclared`) e fica `null` se a ficha não tem o número. Medidas da ficha são `numeric(12,2)` desde a migration `0005`. O carrossel continua na memória do processo.
- `registrationClass` é texto de referência. Não transforme em aconselhamento de CNH.
- Carrinho antigo em `lume-shop-v1` pode não ter `orderCodes`. O parse precisa continuar aceitando.
- Não remova nem duplique `data-testid` de `live-price`, `color-cobre`, `reserve`, `hero-title`, `installment-price` e `pix-price`. Mantenha `html[data-configurator=ready]` na hidratação do configurador.
- O servidor de desenvolvimento escuta em `http://127.0.0.1:43123`. Não suba o Next em `localhost`: a página deixa de hidratar.
- `lume-cookies` aceita `ok`, `essential` e `analytics`. Só `analytics` liga `track`, e só com `NEXT_PUBLIC_ANALYTICS=console`. Sem script de terceiro.
- Serviço e troca ficam na memória da API e aparecem em `GET /v1/admin/overview`. O estoque de `PATCH /v1/admin/stock` entra na ficha e no card pelo `color_stock`. Sem essa linha, o card segue o estoque da variante do cadastro ou o do código.
- Publicar segue [docs/deploy.md](docs/deploy.md). Em produção o admin exige `ADMIN_PASSWORD_HASH` e o cookie `lume_admin`. `ADMIN_TOKEN` não autentica com `NODE_ENV=production`. O processo não sobe sem `ADMIN_TOKEN` de pelo menos 32 caracteres. Não há token padrão.
- Se a mudança alterar comportamento que o próximo agente precisaria saber, atualize o arquivo correspondente em `docs/`.
