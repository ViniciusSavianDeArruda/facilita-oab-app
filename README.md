# Facilita OAB

Companion de estudo para a **1ª fase do Exame da OAB**.

Chat com mentor jurídico afinado no estilo FGV (com histórico de conversas), simulados de questões inéditas, caderno de erros, cronograma automático (com ou sem data de prova definida) e estatísticas de progresso — tudo salvo numa conta protegida por senha, acessível do celular e do notebook.

## Stack

- **Front**: React 18 + Vite + JavaScript + Tailwind CSS + Heroicons + react-markdown (pnpm)
- **Back**: FastAPI (Python) + SQLAlchemy síncrono + SQLite + Alembic (migrações versionadas) + Google Gemini
- **Modelo**: `gemini-flash-latest` (alias que a Google mantém sempre apontado pro flash atual)
- **Auth**: senha única comparada em tempo constante (`hmac.compare_digest`) + JWT de sessão — app de usuário único, sem cadastro/e-mail
- **Segurança**: rate limiting (`slowapi`, 5 tentativas/minuto por IP) no login; erros de API traduzidos pro usuário sem vazar detalhe interno (`resumo_erro_ia`)
- **Deploy**: Docker (`Dockerfile` + `docker-compose.yml`), volume nomeado pro SQLite sobreviver a rebuilds
- **Design**: mobile-first, sidebar fixa em desktop / bottom nav em mobile, tema claro (paleta pêssego/vinho)

## Features

### Início
Saudação personalizada, contagem regressiva pra prova, plano de estudo de hoje (se houver cronograma ativo), cards de "revisar hoje" com itens do caderno, botão de simulado com último desempenho, e retomada da última conversa.

### Chat mentor
Streaming em tempo real (SSE), com **histórico completo de conversas**: sidebar fixa de 280px em desktop, drawer bottom-sheet em mobile, renomear inline (Enter/blur salva, Esc cancela), deletar com confirmação, estado vazio próprio. Título e primeira mensagem são gerados automaticamente quando a conversa nasce a partir de outra tela (ex.: "Dúvida: ..." ao discutir uma questão errada, "Revisar: ..." ao voltar numa dúvida antiga do caderno) — nesses casos o prompt já inclui enunciado/pergunta, resposta anterior (se houver) e a anotação pessoal salva. Botão "salvar no caderno" nas respostas que importam.

### Simulados
Dez questões inéditas via structured output do Gemini. Modo rápido (variado) ou focado numa matéria específica — nesse modo, o nome da matéria salva no caderno é sempre o nome curto pedido, não o texto livre que o Gemini eventualmente escreve. Alerta especial de Ética < 50%. Deep-link "discutir com o mentor" nas erradas. Erros salvos automaticamente no caderno, com histórico completo de todos os simulados já feitos.

### Cronograma
Plano de estudo automático, distribuído por peso de matéria (aproximação da FGV real, dobrando dias das matérias marcadas como fracas — até 5 selecionáveis). **Com data de prova**: contagem regressiva e reserva ~25% dos dias pra simulado/revisão. **Sem data definida**: vira um rodízio contínuo pelas 17 matérias, regenerável a qualquer momento assim que a data for definida. Tela "Próximos dias" (esta semana + próxima) e um calendário mensal completo à parte. Reorganiza sozinho os itens de dias perdidos.

### Caderno de erros
Toda questão errada de simulado, ou resposta salva do chat, vem parar aqui — uma única fonte, diferenciada só pelo campo `origem`. Grid de 2 colunas em desktop (1 em mobile); ao expandir, o card ocupa a linha inteira pra caber a resposta do mentor e o formulário de anotação com espaço de sobra. Cada item tem status (aberto → revisando → dominado, com clique direto), anotação com salvamento automático no blur, filtro por matéria/status (nomes de matéria normalizados e curtos — "Civil", não "Direito Civil"), e botão pra abrir chat contextualizado.

### Estatísticas
Nota por simulado ao longo do tempo, acerto por matéria (agregado de todo o histórico), sequência de dias estudando, e o funil aberto/revisando/dominado do caderno.

### Ajustes
Nome (usado na saudação) + logout. Data da prova mora na tela de configuração do cronograma, não aqui.

## Setup

### 1. Chave grátis do Gemini
https://aistudio.google.com/apikey → **Create API key** → copie (começa com `AIza...`)

### 2. Configurar variáveis de ambiente
```bash
cd backend
cp .env.example .env
```
Edite o `.env`:
- `GEMINI_API_KEY` — a chave do passo 1
- `APP_PASSWORD` — a senha que você vai usar pra entrar no app
- `JWT_SECRET` — gere com `python -c "import secrets; print(secrets.token_hex(32))"`

### 3. Backend — via Docker (recomendado)
```bash
cd backend
docker compose up -d --build
```
Sobe em `http://localhost:8000`. As migrações do Alembic rodam sozinhas no startup; o banco SQLite fica num volume nomeado (`facilita_data`), sobrevivendo a rebuilds.

<details>
<summary>Alternativa sem Docker</summary>

```bash
cd backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
</details

### 4. Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

Abre `http://localhost:5173` e entra com a senha configurada em `APP_PASSWORD`.

## Estrutura

```
facilita-oab/
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI: todas as rotas (auth, me, caderno, cronograma,
│   │   │                      simulados, stats, backup, conversas, chat)
│   │   ├── config.py          Configuração via variáveis de ambiente (pydantic-settings)
│   │   ├── db.py              Engine/sessão SQLAlchemy + modelos ORM + pragmas do SQLite
│   │   │                      (WAL, foreign_keys=ON pra CASCADE funcionar de verdade)
│   │   ├── auth.py            Serviço de login
│   │   ├── security.py        Verificação de senha, JWT, dependency de autenticação
│   │   ├── ai.py               Cliente Gemini + tradução de erro da API (resumo_erro_ia)
│   │   ├── schemas.py         Modelos Pydantic (request/response)
│   │   ├── backup.py          Export completo em JSON
│   │   └── prompts/
│   │       ├── mentor.md      ← ajusta o comportamento do chat aqui
│   │       └── simulado.md    ← ajusta o estilo das questões aqui
│   ├── migrations/            Alembic — histórico de mudanças no schema
│   ├── Dockerfile / docker-compose.yml
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── App.jsx                    Auth gate + hidratação + router entre as views
        ├── components/
        │   ├── Login.jsx
        │   ├── Inicio.jsx
        │   ├── Chat.jsx                    Chat streaming + histórico de conversas
        │   ├── SimuladoLanding.jsx / SimuladoRun.jsx / SimuladoResults.jsx
        │   ├── Caderno.jsx                 Grid de cards + filtros + detalhes
        │   ├── Cronograma.jsx / CronogramaConfig.jsx / CronogramaCalendario.jsx
        │   ├── Estatisticas.jsx
        │   ├── Settings.jsx
        │   ├── Sidebar.jsx / BottomNav.jsx
        │   └── QuestionCard.jsx
        └── lib/
            ├── api.js              authFetch + streamChat (SSE)
            ├── authClient.js       Login/logout/token
            ├── conversas.js        Histórico de conversas do chat (cache + hydrate)
            ├── materias.js         Fonte única de matérias + peso FGV (cronograma usa
            │                       todas; simulado filtra peso ≥ 4)
            ├── erros.js            Erro de API → mensagem amigável
            ├── settings.js / caderno.js / cronograma.js / simulados.js / lastActivity.js
            │                       Cache em memória hidratado da API (getters síncronos)
            └── importLegacy.js     Import único de dados que estavam em localStorage
```

## Persistência e migrações

Tudo em SQLite (`facilita.db`, num volume Docker em produção), atrás de uma senha única — sem cadastro, sem múltiplas contas.

Mudanças de schema (ou de dados, quando necessário) viram uma migração do Alembic — nunca `DROP`/`CREATE` manual, mesmo em dev. Fluxo padrão:
```bash
docker compose run --name gerar_migration backend alembic revision --autogenerate -m "descrição"
docker cp gerar_migration:/app/migrations/versions/<arquivo>.py migrations/versions/
docker rm gerar_migration
```
As migrações rodam sozinhas (`alembic upgrade head`) toda vez que o container sobe.

## Prompts vivos

Todo comportamento das IAs vem dos `.md` em `backend/app/prompts/`. Iterar qualidade = editar em português mesmo, sem tocar em código.

## Próximas evoluções

- Notificações web push pra lembrar de revisar
- Colapsar/expandir a sidebar de conversas do chat
- Migração pra Postgres se algum dia precisar de mais de um usuário
