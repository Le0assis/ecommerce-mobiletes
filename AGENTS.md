# Para agentes de IA

Leia [docs/README.md](docs/README.md) antes de alterar este repositório. A documentação em `docs/` é o contexto do produto, em português: visão, arquitetura, contratos, design system, como fazer uma mudança comum e o que ainda não existe.

`apps/storefront/AGENTS.md` é o guia de versão do Next.js, gerado pelo framework. Não é o guia da LUME. Se os dois discordarem, valem `docs/` e `packages/domain`.

Regras que não se negociam ao implementar:

- Preço, parcela, Pix, boleto, frete, autonomia e economia contra gasolina nascem em `packages/domain`. A vitrine não inventa número. A API recalcula no checkout.
- `batteryId` é opcional. Ausente, a bateria de série entra com delta zero. O schema do checkout precisa repassar o campo, senão o Zod descarta e o servidor cobra a de série.
- Dinheiro é inteiro em centavos.
- O vermelho `#ff2d2d` é o único acento de marca, no CTA principal, no ponto da marca e num detalhe da moto. O verde-água `#32bcad` só aparece no selo Pix.
- Campanha de lançamento: 21x sem juros. Não reescreva a Tabela Price. Para encurtar a carência, baixe `LAUNCH_INTEREST_FREE_UP_TO`.
- Pix de demonstração começa com `LUME-MOCK-PIX`. Sem CPF. Sem nome de pessoa em review.
- A vitrine lê o catálogo por `apps/storefront/lib/catalog.ts`. Estoque editado no admin não muda a vitrine nesta versão.
- Marcas parceiras (VOLTIS, BRUMA, SENDA) são inventadas. Não copie nome, foto ou preço de Segway, NIU, Super Soco, Yadea ou de outra loja.
- `registrationClass` é texto de referência. Não transforme em aconselhamento de CNH.
- Carrinho antigo em `lume-shop-v1` pode não ter `orderCodes`. O parse precisa continuar aceitando.
- Não remova nem duplique `data-testid` de `live-price`, `color-cobre`, `reserve`, `hero-title`, `installment-price` e `pix-price`. Mantenha `html[data-configurator=ready]` na hidratação do configurador.
- O servidor de desenvolvimento escuta em `http://127.0.0.1:43123`. Não suba o Next em `localhost`: a página deixa de hidratar.
- `lume-cookies` aceita `ok`, `essential` e `analytics`. Só `analytics` liga `track`, e só com `NEXT_PUBLIC_ANALYTICS=console`. Sem script de terceiro.
- Serviço e troca ficam na memória da API e aparecem em `GET /v1/admin/overview`. Estoque do admin continua fora da vitrine.
- Publicar segue [docs/deploy.md](docs/deploy.md). Em produção, sem `ADMIN_TOKEN`, o admin recusa.
- Se a mudança alterar comportamento que o próximo agente precisaria saber, atualize o arquivo correspondente em `docs/`.
