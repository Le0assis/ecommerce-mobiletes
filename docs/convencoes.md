# Convenções

- Interface e documentação de produto em português do Brasil. Identificadores de código em inglês, rotas em português.
- Dinheiro em centavos inteiros. Formate com `formatBRL`.
- Não recalcule Pix, boleto, parcela, frete ou autonomia fora de `@lume/domain`.
- A vitrine importa catálogo por `@/lib/catalog` e mutação por `@/lib/shop-api`. `lib/commerce.ts` fica atrás da shop-api.
- Erro de regra é `DomainError` com código estável (`cep_invalido`, `cor_sem_estoque`, `parcelas_invalidas`). A API devolve `message` para a pessoa e `error` para o cliente.
- Estado de `localStorage` usa `useSyncExternalStore`. Não faça `setState` síncrono dentro de `useEffect` para espelhar storage: o lint `react-hooks/set-state-in-effect` recusa.
- Página que espera `params` ou `searchParams` (são Promises) faz o await num filho dentro de `Suspense`.
- Sem CPF, sem nome de pessoa em review, sem payload de Pix que não comece com `LUME-MOCK-PIX` enquanto for simulado.
- Sem lorem e sem “bem-vindo ao app”. O texto descreve a moto ou a regra.
- Acento vermelho só no CTA principal, no ponto da marca e num detalhe da moto. Pix só no selo.
- `data-testid` existentes do fluxo de compra não se removem nem se duplicam.
- Parse de `lume-shop-v1` tolera carrinho antigo sem `orderCodes`.
- Comentário no código só quando a regra comercial não cabe no nome (a carência de 21x, o mock do Pix, o estoque que a vitrine ignora).
- Não estime prazo em dias. O roadmap é por dependência.
