# Facilita OAB — Backend

API FastAPI que serve o frontend do Facilita OAB.

Para visão geral do projeto, veja o [README principal](../README.md).

## Stack

- **Python 3.12** + FastAPI 0.116
- **SQLAlchemy 2** + Alembic (migrations versionadas)
- **PostgreSQL** (Neon em produção, Docker local em dev)
- **Google Gemini** (`gemini-flash-latest`) para chat e simulados
- **slowapi** para rate limiting
- **PyJWT** para autenticação
- **Docker** para containerização

## Como rodar localmente

### Requisitos

- Docker + Docker Compose
- Chave grátis do Gemini: https://aistudio.google.com/apikey

### Setup

```bash
# 1. Copiar arquivo de env
cp .env.example .env

# 2. Editar .env com suas credenciais
# GEMINI_API_KEY, APP_PASSWORD, JWT_SECRET

# 3. Subir backend + Postgres
docker compose up -d

# 4. Verificar que subiu
curl http://localhost:8000/health
```

Migrations do Alembic rodam automaticamente no startup. Backend fica disponível em `http://localhost:8000`, Postgres em `localhost:5433`.

### Sem Docker (opcional)

```bash
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Nesse caso, você precisa de um PostgreSQL rodando separadamente e ajustar `DATABASE_URL` no `.env`.

## Estrutura

```
backend/
├── app/
│   ├── main.py              Bootstrap FastAPI (112 linhas)
│   ├── config.py            Configuração via pydantic-settings
│   ├── db.py                Engine SQLAlchemy + modelos ORM
│   ├── security.py          JWT + dependency de autenticação
│   ├── auth.py              Serviço de login
│   ├── ai.py                Cliente Gemini + tradução de erro
│   ├── schemas.py           Modelos Pydantic (request/response)
│   ├── serializers.py       Serialização compartilhada
│   ├── parsers.py           Parse seguro de datas (retorna 422)
│   ├── activity.py          Helpers cross-cutting
│   ├── rate_limit.py        Limiter compartilhado
│   ├── materias.py          Matérias + peso FGV
│   ├── backup.py            Export/import JSON
│   ├── routers/
│   │   ├── auth.py          POST /auth/login (5/min)
│   │   ├── perfil.py        GET/PATCH /me + backup
│   │   ├── caderno.py       CRUD do caderno
│   │   ├── cronograma.py    Config + plano de estudos
│   │   ├── simulado.py      Geração (30/hour) + salvar resultado
│   │   ├── chat.py          Conversas + streaming SSE (60/min)
│   │   └── stats.py         GET /me/stats
│   └── prompts/
│       ├── mentor.md        Persona do mentor jurídico
│       └── simulado.md      Instruções pra gerador de questões
├── migrations/              Alembic
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── alembic.ini
└── .env.example
```

## Rotas principais

Todas exigem header `Authorization: Bearer <jwt-token>` obtido via `POST /auth/login`, exceto:

- `GET /health` — health check público (aceita GET e HEAD)
- `POST /auth/login` — endpoint de login

### Auth
- `POST /auth/login` — 5 req/min, retorna JWT

### Perfil
- `GET /me` — dados do usuário
- `PATCH /me` — atualizar perfil
- `PUT /me/last-chat` — salvar última conversa
- `GET /me/export` — exportar backup JSON
- `POST /me/import` — importar backup JSON
- `GET /me/stats` — estatísticas agregadas

### Caderno
- `GET /me/caderno` — listar itens
- `POST /me/caderno` — criar item
- `PATCH /me/caderno/{id}` — atualizar
- `DELETE /me/caderno/{id}` — excluir

### Cronograma
- `GET/PUT /me/cronograma/config`
- `GET/PUT/DELETE /me/cronograma/plano`

### Simulado
- `POST /simulado` — gera novo simulado (30/hour)
- `GET /me/simulados` — histórico
- `POST /me/simulados` — salvar resultado

### Chat
- `POST /chat` — mensagem com streaming SSE (60/min)
- `GET /chat/conversas` — listar conversas
- `POST /chat/conversas` — criar conversa
- `GET/PATCH/DELETE /chat/conversas/{id}`

Em desenvolvimento, `GET /docs` expõe Swagger UI. Em produção (`ENV=production`), o Swagger é desabilitado.

## Migrations

Mudanças de schema ou dados viram migration do Alembic — nunca `DROP`/`CREATE` manual.

### Gerar migration

```bash
docker compose run --name gerar_migration backend alembic revision --autogenerate -m "descrição"
docker cp gerar_migration:/app/migrations/versions/<arquivo>.py migrations/versions/
docker rm gerar_migration
```

### Aplicar migrations

Rodam automaticamente no startup do container (`alembic upgrade head` no lifespan do FastAPI). Para aplicar manualmente:

```bash
docker compose exec backend alembic upgrade head
```

### Reverter

```bash
docker compose exec backend alembic downgrade -1
```

## Variáveis de ambiente

Todas obrigatórias, exceto onde indicado:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql+psycopg2://user:pass@host:5432/db` |
| `GEMINI_API_KEY` | Chave da API Google Gemini | `AIza...` |
| `JWT_SECRET` | Chave para assinar JWT | Gerar com `secrets.token_hex(32)` |
| `APP_PASSWORD` | Senha única do app | String forte |
| `CORS_ORIGINS` | Domínios permitidos no CORS | `https://facilita-oab.vercel.app` |
| `ENV` | Ambiente (opcional) | `production` ou vazio pra dev |

## Prompts customizados

O comportamento das IAs é definido pelos `.md` em `app/prompts/`. Iterar qualidade = editar em português, sem tocar em código.

- `mentor.md` — persona do mentor jurídico afinado no estilo FGV
- `simulado.md` — instruções pro gerador de questões

## Segurança

- **Auth**: `hmac.compare_digest` (timing-safe) + JWT HS256
- **Rate limit**: por IP via `slowapi` (5/min login, 60/min chat, 30/hour simulado)
- **Headers**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **CORS**: origem restrita em produção
- **SQL Injection**: 100% ORM/parametrizado
- **Segredos**: env vars separadas por ambiente, `.env` fora do git
- **/docs**: desabilitado em produção via `ENV=production`

Auditoria de segurança aplicada com score 9+/10 cobrindo 27+ checks.

## Deploy

Backend deployado no [Render](https://render.com) via Docker.

Push em `main` triggera rebuild automático. Migrations rodam no startup do container.

## Status

Em produção e manutenção contínua. Sem novas features planejadas — arquitetura e escopo atuais atendem ao caso de uso.
