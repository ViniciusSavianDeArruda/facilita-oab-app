# Facilita OAB

Companion de estudo para a **1ª fase do Exame da OAB**.

Chat com mentor jurídico afinado no estilo FGV, simulados inéditos, caderno de erros, cronograma automático e estatísticas de progresso — protegido por senha, acessível do celular e desktop.

## Stack

**Frontend**
- React 18 + Vite + Tailwind CSS
- Deploy: Vercel

**Backend**
- FastAPI + SQLAlchemy + Alembic
- Rotas organizadas em routers por domínio (`app/routers/`)
- Deploy: Render

**Banco**
- PostgreSQL 16 (Neon em produção, Docker local em dev)

**IA**
- Google Gemini (`gemini-flash-latest`)

**Segurança**
- Auth: senha única + JWT (`hmac.compare_digest`)
- Rate limit: 5/min login, 60/min chat, 30/hour simulado (`slowapi`)
- Headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- CORS: origem restrita

## Features

- **Início**: contagem regressiva pra prova, plano do dia, revisões pendentes
- **Chat mentor**: streaming SSE com histórico de conversas, deep-link contextual
- **Simulados**: 10 questões inéditas (rápido ou focado por matéria), alerta especial de Ética < 50%
- **Caderno de erros**: unificado (chat + simulado), status por item (aberto → revisando → dominado)
- **Cronograma**: distribuição por peso FGV, com ou sem data de prova definida
- **Estatísticas**: nota por simulado, acerto por matéria, sequência de dias

## Setup local

### Requisitos
- Docker + Docker Compose
- Node.js 20+ e pnpm
- Chave grátis do Gemini: https://aistudio.google.com/apikey

### 1. Variáveis de ambiente
```bash
cd backend
cp .env.example .env
```

Edite `.env`:
- `GEMINI_API_KEY` — chave do Gemini
- `APP_PASSWORD` — senha do app
- `JWT_SECRET` — gere com `python -c "import secrets; print(secrets.token_hex(32))"`

### 2. Backend (Postgres + FastAPI via Docker)
```bash
cd backend
docker compose up -d
```

Sobe backend em `http://localhost:8000` e Postgres em `localhost:5433`. Migrações do Alembic rodam sozinhas no startup.

### 3. Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

Abre em `http://localhost:5173`.

## Estrutura

```
facilita-oab/
├── backend/
│   ├── app/
│   │   ├── main.py            Bootstrap: config, middleware, include_router
│   │   ├── config.py          Env vars (pydantic-settings)
│   │   ├── db.py              SQLAlchemy engine + modelos ORM
│   │   ├── auth.py            Serviço de login
│   │   ├── security.py        JWT + dependency de auth
│   │   ├── ai.py               Cliente Gemini
│   │   ├── schemas.py         Modelos Pydantic
│   │   ├── serializers.py     Serialização compartilhada
│   │   ├── parsers.py         Parse seguro de dados de entrada
│   │   ├── activity.py        Helpers cross-cutting (register_activity)
│   │   ├── rate_limit.py      Limiter compartilhado (slowapi)
│   │   ├── materias.py        Fonte única de matérias + peso FGV
│   │   ├── backup.py          Export/import JSON
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── perfil.py
│   │   │   ├── caderno.py
│   │   │   ├── cronograma.py
│   │   │   ├── simulado.py
│   │   │   ├── chat.py
│   │   │   └── stats.py
│   │   └── prompts/
│   │       ├── mentor.md      Comportamento do chat
│   │       └── simulado.md    Estilo das questões
│   ├── migrations/            Alembic
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/        Login, Inicio, Chat, Simulado*, Caderno,
        │                      Cronograma*, Estatisticas, Settings, etc.
        └── lib/                api, authClient, conversas, materias,
                                caderno, cronograma, simulados, etc.
```

## Arquitetura

Após auditoria de qualidade, o backend foi refatorado de `main.py` monolítico (1104 linhas) para routers por domínio. Cada router tem uma responsabilidade clara e importa helpers compartilhados (`serializers`, `parsers`, `activity`, `rate_limit`).

Auditoria de segurança aplicada: rate limiting por IP, headers de segurança, CORS restritivo, `/docs` desabilitado em produção, PyJWT e Starlette em versões sem CVEs conhecidos.

## Prompts vivos

Todo comportamento das IAs vem dos `.md` em `backend/app/prompts/`. Iterar qualidade = editar em português, sem tocar em código.

## Próximas evoluções

- Notificações web push pra lembrar de revisar
- 2FA opcional
- Colapsar/expandir sidebar de conversas
