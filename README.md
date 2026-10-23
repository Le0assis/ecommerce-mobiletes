# LUME

Loja da **LUME**, marca de motos e mobiletes elétricas para o Brasil. Este repositório é o monorepo inicial: vitrine, API de commerce, regras de preço compartilhadas, banco e testes.

A vitrine abre em [http://127.0.0.1:43123](http://127.0.0.1:43123). A API responde em [http://127.0.0.1:8787/health](http://127.0.0.1:8787/health).

O documento de produto e arquitetura está em [docs/REQUISITOS-TECNICOS.md](docs/REQUISITOS-TECNICOS.md). O índice para o dono e para quem for alterar o código está em [docs/README.md](docs/README.md).

Você não precisa saber programar para seguir este guia. Cada passo diz o que fazer, o comando, e como saber que deu certo.

## O que você vai ter rodando

- A home, o catálogo com marca, categoria e cidade, a galeria do modelo, o configurador (cor, acessório, 360°, autonomia, preço, 21x e Pix), a comparação, o quiz, as lojas, o test ride, o carrinho, o checkout, a conta, os pedidos, a lista de desejos e as páginas institucionais.
- A construção segue seis etapas empilhadas, descritas em [docs/REQUISITOS-TECNICOS.md](docs/REQUISITOS-TECNICOS.md). A etapa 1 acrescenta a grade multimarca, a galeria e o enquadramento de habilitação. A etapa 2 acrescenta bateria no configurador, a comparação com marca e habilitação, e a estimativa contra gasolina. A etapa 3 acrescenta cupom, rastreio de sandbox e sessão por código visível. A etapa 4 acrescenta o mapa por coordenada, o WhatsApp e o pedido de troca. A etapa 5 acrescenta guias, legislação, FAQ, foto nos relatos e agendamento de serviço. A etapa 6 acrescenta o admin com pedido, cupom e conteúdo, o aviso de cookie em duas escolhas, a medição local e o [guia de publicação](docs/deploy.md).
- Uma API que recalcula o pedido. Pix, boleto e cartão são simulados: nenhum dinheiro sai da conta.
- Opcionalmente, Postgres, Redis e Meilisearch via Docker.

Sem Docker a loja também abre. O catálogo mora no código. Pedido e test ride ficam na memória da API até você desligar o processo.

## 1. Instalar as ferramentas

Versões usadas neste projeto:

| Ferramenta | Versão | Obrigatória? |
| --- | --- | --- |
| Node.js | 22.x (aqui, 22.23) | Sim |
| pnpm | 10.33.4 | Sim |
| Git | qualquer versão atual | Sim, para clonar |
| Docker Desktop ou Docker Engine, com Compose v2 | atual | Não |
| Navegador | Chrome, Edge, Firefox ou Safari atual | Sim, para ver a loja |

Confira depois, em qualquer sistema:

```bash
node -v
pnpm -v
git --version
```

O esperado é `v22...` e `10.33.4`. Se `pnpm` não existir, o passo do Corepack abaixo cria ele.

### Windows

1. Instale o Git em [https://git-scm.com/download/win](https://git-scm.com/download/win). No instalador, pode aceitar as opções padrão.
2. Instale o Node.js 22. Baixe o instalador **22 LTS** em [https://nodejs.org](https://nodejs.org) (não o “Current” se ele for 24 ou maior). Outra opção, no PowerShell:

```powershell
winget install OpenJS.NodeJS.LTS
```

Se o winget instalar uma versão que não começa com 22, desinstale e use o instalador do site, ou o nvm-windows:

```powershell
winget install CoreyButler.NVMforWindows
nvm install 22
nvm use 22
```

3. Feche e abra o PowerShell. Rode `node -v`.
4. Ative o pnpm. No PowerShell **como administrador** se o comando reclamar de permissão:

```powershell
corepack enable
corepack prepare pnpm@10.33.4 --activate
pnpm -v
```

Se o `corepack` não existir:

```powershell
npm install -g pnpm@10.33.4
```

5. Docker, só se quiser o banco: instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/). Na primeira abertura, aceite o WSL 2 se o instalador pedir. Espere o ícone da baleia ficar estável antes de continuar.

### macOS

1. Abra o Terminal (Aplicativos → Utilitários → Terminal).
2. Se `git --version` pedir as ferramentas de desenvolvedor, aceite a instalação. Ou, com Homebrew:

```bash
brew install git
```

3. Instale o Node 22. Com Homebrew:

```bash
brew install node@22
brew link --overwrite node@22
node -v
```

Sem Homebrew, use o nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Feche e abra o Terminal, depois:

```bash
nvm install 22
nvm use 22
node -v
```

4. Ative o pnpm:

```bash
corepack enable
corepack prepare pnpm@10.33.4 --activate
pnpm -v
```

5. Docker, opcional: instale o Docker Desktop para Mac e abra o aplicativo uma vez.

### Linux (Ubuntu ou Debian)

1. Abra o terminal.
2. Ferramentas de base:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates
```

3. Node 22 pelo nvm (não depende do pacote antigo do apt):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Feche e abra o terminal, depois:

```bash
nvm install 22
nvm use 22
node -v
```

4. pnpm:

```bash
corepack enable
corepack prepare pnpm@10.33.4 --activate
pnpm -v
```

5. Docker, opcional. O pacote do Ubuntu já traz o Compose v2:

```bash
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"
```

Saia e entre de novo na sessão para o grupo `docker` valer. Teste com `docker compose version`.

Em Fedora, o equivalente é `sudo dnf install git nodejs` se o Node do sistema for 22, ou o mesmo nvm acima, e `dnf install docker docker-compose-plugin`.

## 2. Baixar o projeto

No terminal, escolha uma pasta sua (no Windows pode ser `C:\dev`, no macOS e no Linux `~/dev`) e clone:

```bash
git clone <url-do-repositorio> lume
cd lume
```

Se você já está dentro da pasta do projeto (existe um `package.json` na raiz com o nome `lume`), não clone de novo. Só confira:

```bash
pwd
ls
```

Você deve ver `apps`, `packages`, `docs`, `package.json` e `docker-compose.yml`.

## 3. Instalar as dependências do código

Ainda na raiz do projeto:

```bash
pnpm install
```

Isso lê o `pnpm-lock.yaml` e baixa as bibliotecas para `node_modules`. A primeira vez leva alguns minutos.

Deu certo quando o comando termina sem `ERR_` e existe a pasta `node_modules`.

## 4. Variáveis de ambiente

Variável de ambiente é um valor que o programa lê do lado de fora do código: porta, senha do banco, endereço da API. Nada disso é segredo de produção aqui. Os arquivos de exemplo já vêm com valores de desenvolvimento.

São dois arquivos, em dois aplicativos.

### 4.1 API (`apps/commerce/.env`)

Copie o exemplo.

Windows (PowerShell, na raiz do projeto):

```powershell
Copy-Item apps\commerce\.env.example apps\commerce\.env
```

macOS e Linux:

```bash
cp apps/commerce/.env.example apps/commerce/.env
```

O que cada linha significa:

| Variável | Exemplo | Para que serve |
| --- | --- | --- |
| `PORT` | `8787` | Porta da API. A vitrine procura a API nessa porta. |
| `DATABASE_URL` | `postgres://lume:lume@127.0.0.1:54329/lume` | Endereço do Postgres. Usuário `lume`, senha `lume`, banco `lume`, porta **54329** no seu computador (o container escuta 5432 por dentro). |
| `REDIS_URL` | `redis://127.0.0.1:63799` | Redis, reservado para carrinho e limite de taxa. A API sobe sem ele. |
| `MEILI_HOST` | `http://127.0.0.1:7709` | Meilisearch, reservado para a busca. Sem ele, a busca usa o catálogo em memória. |
| `MEILI_MASTER_KEY` | `lume-dev-master-key` | Senha do Meilisearch de desenvolvimento. Tem de ser a mesma do `docker-compose.yml`. |
| `ADMIN_TOKEN` | `troque-este-token` | Senha da área `/admin`. Em desenvolvimento, se esta linha não existir, a API aceita `dev-admin-token`. Em produção a API recusa o admin se o token não estiver definido. |
| `STOREFRONT_ORIGIN` | `http://127.0.0.1:43123` | Endereço exato da vitrine. A API só libera chamadas de browser vindas dele. Se você abrir o site por outro endereço, o checkout no browser pode falhar. |

Se for rodar **sem Docker**, não deixe o `DATABASE_URL` apontando para um Postgres desligado. Apague ou comente (coloque `#` no começo) as linhas `DATABASE_URL`, `REDIS_URL`, `MEILI_HOST` e `MEILI_MASTER_KEY`. A API sobe do mesmo jeito e avisa que está em memória.

### 4.2 Vitrine (`apps/storefront/.env.local`)

O Next.js lê `.env.local` dentro de `apps/storefront`. Não use o `.env` da API para a vitrine.

Windows:

```powershell
Copy-Item apps\storefront\.env.example apps\storefront\.env.local
```

macOS e Linux:

```bash
cp apps/storefront/.env.example apps/storefront/.env.local
```

| Variável | Exemplo | Para que serve |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://127.0.0.1:43123` | Endereço público do site, usado no mapa do site e nos metadados. O prefixo `NEXT_PUBLIC_` é o que o Next permite chegar ao navegador. |
| `COMMERCE_API_URL` | `http://127.0.0.1:8787` | Para onde o servidor da vitrine encaminha `/api/commerce/...`. O navegador não fala direto com a porta 8787. |
| `NEXT_PUBLIC_WHATSAPP` | `551140001900` | Número do botão WhatsApp, sem `+` e sem espaços. |
| `NEXT_PUBLIC_ANALYTICS` | vazio | Só o valor `console` escreve evento no navegador, e só se o aviso de cookie for “Permitir medição local”. Deixe vazio. |

Não coloque segredo em variável `NEXT_PUBLIC_`. Ela aparece no JavaScript do site.

## 5. Subir Postgres, Redis e Meilisearch

Pule esta seção inteira se você escolheu rodar sem Docker. Volte para a seção 7.

Na raiz:

```bash
docker compose up -d
```

`-d` significa “em segundo plano”. O comando baixa as imagens na primeira vez.

Confira:

```bash
docker compose ps
```

Os três serviços precisam estar `running` (o Postgres, `healthy`):

- Postgres publicado em `127.0.0.1:54329`
- Redis em `127.0.0.1:63799`
- Meilisearch em `127.0.0.1:7709`

### Criar as tabelas

```bash
pnpm db:push
```

O Drizzle compara `apps/commerce/src/db/schema.ts` com o banco vazio e cria as tabelas. Há também um SQL versionado em `apps/commerce/drizzle/` para o DBA revisar. No dia a dia local, `db:push` basta.

### Gravar o catálogo

```bash
pnpm db:seed
```

Isso copia modelos, cores, acessórios, lojas e banners para o Postgres. Pode rodar de novo: o que já existe é mantido.

Deu certo quando o terminal imprime `Catálogo gravado no Postgres.`

A vitrine **não lê** essa cópia para desenhar a home. Ela lê o mesmo catálogo no pacote `@lume/domain`, para a página abrir mesmo sem banco. O seed existe para o banco nascer igual ao código. Pedido e test ride, se o `DATABASE_URL` estiver no ar, também são gravados no Postgres. O admin de estoque desta versão ainda altera a memória do processo.

## 6. Rodar sem Docker

Não suba o `docker compose`. No `apps/commerce/.env`, comente `DATABASE_URL`, `REDIS_URL` e `MEILI_HOST`, ou simplesmente não crie esse arquivo.

Não rode `pnpm db:push` nem `pnpm db:seed`. Sem Postgres eles falham, e a falha é esperada.

A home, o configurador, o quiz e o carrinho funcionam. O checkout e o test ride funcionam enquanto a API estiver ligada. Ao parar a API, pedidos e agendamentos em memória somem.

## 7. Ligar a vitrine e a API

Na raiz:

```bash
pnpm dev
```

Esse comando sobe os dois de uma vez:

- vitrine em [http://127.0.0.1:43123](http://127.0.0.1:43123)
- API em [http://127.0.0.1:8787/health](http://127.0.0.1:8787/health)

Deixe esse terminal aberto. Quando quiser parar, use a seção 10.

Para ver a API sozinha, abra [http://127.0.0.1:8787/health](http://127.0.0.1:8787/health). O JSON traz `"ok": true`. O campo `persistence` diz `postgres` se houver `DATABASE_URL`, ou `memoria` se não houver.

Para trabalhar em dois terminais em vez de um:

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

### O que abrir no navegador

- `/` a home: tipografia grande, 21x sem juros, selo do Pix, busca por categoria e marca, faixa de WhatsApp embaixo.
- `/motos/apex` o configurador. Troque a cor Cobre e o preço muda. “Ver em 360°” gira um modelo simples.
- `/me-ajude-a-escolher` o quiz.
- `/test-ride` abre o WhatsApp. `/lojas` redireciona para `/contato`.
- `/checkout` Pix, boleto ou cartão. O código do Pix começa com `LUME-MOCK-PIX`. Não pague.

A primeira compilação da home pode levar uns segundos. Atualize a página se o navegador abrir antes do Next terminar.

## 8. Testes, lint e tipos

Na raiz, com ou sem a loja no ar:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

- `lint` procura erro de estilo e de React.
- `typecheck` confere os tipos TypeScript. Na vitrine ele gera os tipos de rota antes.
- `test` roda o Vitest do domínio (preço, 21x, CEP, autonomia, quiz) e da API (checkout Pix e cartão). Não precisa de banco.

O teste de navegador é separado e baixa o Chromium na primeira vez:

```bash
pnpm --filter @lume/storefront exec playwright install chromium
pnpm test:e2e
```

Ele abre a home, entra na Apex, troca a cor e chega ao checkout. Se `pnpm dev` já estiver no ar, o Playwright reaproveita esse servidor. No CI ele sobe um servidor próprio, então lá é preciso `pnpm --filter @lume/storefront build` antes.

## 9. Erros comuns

**`node` não é reconhecido.** Feche e abra o terminal depois de instalar. No Windows, confira se a instalação marcou “Add to PATH”.

**`pnpm` não é reconhecido.** Rode de novo o `corepack enable` num terminal de administrador (Windows) ou com as permissões do seu usuário (macOS e Linux). Alternativa: `npm install -g pnpm@10.33.4`.

**`The engine "node" is incompatible`.** A versão não é 22. `node -v` e, se usar nvm, `nvm use 22` dentro da pasta do projeto (existe um `.nvmrc`).

**`EACCES` ou `EPERM` no `corepack` ou no `pnpm install`.** Não use `sudo pnpm install`. No Windows, rode o terminal como administrador só para o `corepack enable`. Se a pasta do projeto estiver em um local protegido, mova o clone para a sua pasta de usuário.

**Porta 43123 ou 8787 já em uso.** Outro processo ficou preso.

Windows:

```powershell
netstat -ano | findstr :43123
taskkill /PID <numero-da-ultima-coluna> /F
```

macOS e Linux:

```bash
lsof -i :43123
kill <PID>
```

Repita para `8787` se a API não sobe.

**`docker: command not found` ou “Cannot connect to the Docker daemon”.** O Docker Desktop não está aberto, ou no Linux o seu usuário não está no grupo `docker`. Você pode seguir sem Docker pela seção 6.

**`pnpm db:push` recusa conexão em `127.0.0.1:54329`.** O Postgres não subiu. `docker compose ps`. Se o container reinicia, `docker compose logs postgres`.

**O checkout diz que a loja não respondeu.** A API não está no ar, ou `COMMERCE_API_URL` não é `http://127.0.0.1:8787`. Olhe o terminal do `pnpm dev`.

**O navegador bloqueia o checkout por CORS.** Você abriu a vitrine por um endereço diferente de `STOREFRONT_ORIGIN` (por exemplo `localhost` no lugar de `127.0.0.1`). Use o mesmo endereço nos dois, ou apague `STOREFRONT_ORIGIN` do `.env` da API enquanto desenvolve.

**Pedido some depois de reiniciar.** Sem Postgres, o pedido está na memória. Com Postgres desligado e `DATABASE_URL` preenchido, o log da API mostra `postgres_indisponivel` ou `pedido_nao_gravado` e o pedido também fica só na memória.

**Admin responde “Token de admin inválido”.** Na tela `/admin`, use `dev-admin-token` quando `NODE_ENV` não é `production` e `ADMIN_TOKEN` não foi definido. Se você definiu `ADMIN_TOKEN` no `.env`, use esse valor.

**CEP `00000-000` ou com menos de 8 dígitos.** A cotação recusa. Use um CEP real de formato, por exemplo `01310-100`.

**Página branca ou estilo sem CSS logo depois de mudar dependência.** Pare o `pnpm dev`, apague o cache e suba de novo (seção 10).

**`playwright` não acha o navegador.** Rode `pnpm --filter @lume/storefront exec playwright install chromium`.

**`ERR_PNPM_OUTDATED_LOCKFILE` ou pacote não encontrado.** Não edite versões à mão sem `pnpm install`. Se a árvore quebrou, apague `node_modules` (seção 10) e instale de novo. Não apague `pnpm-lock.yaml` sem saber por quê.

## 10. Parar e zerar

### Parar a loja e a API

No terminal onde está o `pnpm dev`, aperte `Ctrl+C`. Espere os dois processos encerrarem. Confirme abrindo de novo o endereço: a página não pode carregar.

### Parar os containers, mantendo os dados

```bash
docker compose stop
```

Para ligar outra vez, `docker compose start` (não baixa imagem de novo).

### Parar e remover os containers, mantendo o volume do banco

```bash
docker compose down
```

### Apagar o banco local

Isso remove motos, pedidos e agendamentos gravados no Postgres deste computador:

```bash
docker compose down -v
```

Depois, para recomeçar: `docker compose up -d`, `pnpm db:push`, `pnpm db:seed`.

### Limpar cache do Next e reinstalar bibliotecas

Pare o `pnpm dev` antes.

macOS e Linux:

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules apps/storefront/.next
pnpm install
```

Windows (PowerShell, na raiz):

```powershell
Remove-Item -Recurse -Force node_modules, apps\storefront\node_modules, apps\commerce\node_modules, packages\domain\node_modules, apps\storefront\.next -ErrorAction SilentlyContinue
pnpm install
```

### Limpar o que ficou no navegador

O carrinho, o aviso de cookie e o perfil de demonstração ficam no navegador, não no banco. No DevTools → Application → Local Storage, apague `lume-shop-v1`, `lume-cookies` e `lume-profile`. `lume-cookies` pode ser `ok` (aceite antigo), `essential` ou `analytics`. O token do admin está em Session Storage como `lume-admin-token`.

## 11. Mapa do repositório

```text
apps/storefront    Next.js, a vitrine
apps/commerce      API Hono, schema Drizzle, seed
packages/domain    preço, parcela, CEP, autonomia, quiz, catálogo
docs               requisitos técnicos
docker-compose.yml Postgres, Redis, Meilisearch
.github/workflows  lint, tipos, testes e build
```

Scripts da raiz:

| Comando | Efeito |
| --- | --- |
| `pnpm dev` | Vitrine e API |
| `pnpm dev:web` | Só a vitrine, porta 43123 |
| `pnpm dev:api` | Só a API, porta 8787 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Vitest |
| `pnpm test:e2e` | Playwright |
| `pnpm build` | Build de produção da vitrine |
| `pnpm db:push` | Cria ou atualiza tabelas |
| `pnpm db:seed` | Grava o catálogo no Postgres |

Build e servidor de produção da vitrine, depois do build:

```bash
pnpm --filter @lume/storefront build
pnpm --filter @lume/storefront start
```

A API de produção local é `pnpm --filter @lume/commerce start`.

## 12. Publicar

O passo a passo de hospedagem, variáveis e o que continua simulado está em [docs/deploy.md](docs/deploy.md). Resumo para quem vai colocar no ar:

1. Rode `pnpm lint`, `pnpm typecheck` e `pnpm test` na raiz. Os três precisam terminar sem erro.
2. Rode `pnpm --filter @lume/storefront build`.
3. Na API, defina `NODE_ENV=production` e um `ADMIN_TOKEN` que não seja `dev-admin-token`. Sem esse token o admin recusa todo mundo, e é assim que deve ser.
4. Aponte `STOREFRONT_ORIGIN` para o endereço exato da vitrine e `COMMERCE_API_URL` para a API.
5. Deixe `NEXT_PUBLIC_ANALYTICS` vazio. Pix de demonstração continua começando com `LUME-MOCK-PIX`.

Não há conta de Mercado Pago nem de Pagar.me neste repositório. Publicar não passa a cobrar.
