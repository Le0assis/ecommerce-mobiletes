# Propostas

Revisão da vitrine e do admin em 24 de outubro de 2026, na `feat/lume-mutirao-frontend`. O que esta passagem já corrigiu fica no código. O resto espera decisão.

## Já nesta passagem

- O FAQ “Preciso de CNH?” cita o registro do ciclomotor no CTB art. 141, junto com placa e ACC ou CNH A.
- O motivo do capacete no quiz atribui a dispensa de habilitação ao autopropelido.
- O token de admin só abre a tela depois que `GET /v1/admin/overview` aceita.
- Salvar estoque no admin recusa campo vazio antes de converter para número e mostra “O estoque deve ser um número inteiro de 0 a 999.” quando o valor sai de 0 a 999. O estoque desta tela continua sem mudar a vitrine.
- A sessão de sandbox deixa de gravar o token em `localStorage` e apaga a chave antiga `lume-session` ao abrir a conta. O valor da visita fica na memória da página.
- O JSON-LD escapa `<` antes de entrar no HTML.

## Segurança

- Se a sessão da conta precisar sobreviver ao recarregar, o lugar é um cookie httpOnly, no mesmo desenho do admin. Não volte a usar `localStorage` para esse token.
- O botão “Entrar com o token de desenvolvimento” aparece para quem abre `/admin`. O campo nasce vazio e o valor não entra em `sessionStorage`. Esconder esse caminho fora de desenvolvimento pede uma flag pública, para a vitrine não aprender o nome do mecanismo.
- O carrossel trata como externo todo `href` que começa com `http`. O schema do domínio só aceita `https` ou um caminho com uma barra. A vitrine pode recusar o resto na hora de desenhar o slide, para um banner antigo não virar link solto.

## Testes

- A vitrine não tem teste de unidade. O Playwright cobre a home e um filtro do catálogo. Falta o quiz com “Quer andar sem CNH?”, o checkout com `peso_invalido` e `cor_sem_estoque`, e o admin com token recusado e estoque inválido.
- O domínio trava a frase do FAQ e o motivo do capacete. A ficha (`/motos/s`, `/motos/pico`) ainda não tem teste automático do texto legal.

## Dívida

- `POST /v1/quiz` não recebe largura nem entre-eixos. Por isso o Sim do quiz lista no cliente quem tem `autopropelido.eligible`. Quando a API passar a enxergar as medidas, a lista pode voltar para a resposta do servidor. Isso é mudança de API.
- A foto do slide sem texto próprio usa `alt` vazio. Um texto curto gravado no banner fecha a lacuna.
- `next/image` segue `unoptimized` fora do Blob. `next.config.ts` não entra nesta branch.
