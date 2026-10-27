# Facilita OAB

Companion de estudos para a primeira fase do Exame da OAB, com mentor jurídico
via IA, simulados inéditos gerados pelo Gemini, caderno de erros unificado e
cronograma automático distribuído por peso FGV.

> **Projeto pessoal** desenvolvido para apoiar preparação real para a prova da
> OAB. App single-user com autenticação privada.

## Motivação

Aplicar boas práticas de engenharia em um contexto real e útil: um companion de
estudos personalizado, com mentor jurídico especializado no estilo FGV, gerador
de simulados inéditos e organização automatizada de erros. As decisões
arquiteturais priorizam manutenibilidade, segurança e custo operacional próximo
de zero.

## Funcionalidades

- **Mentor Jurídico** — streaming SSE em tempo real, histórico de conversas,
  cancelamento, retry e integração com o Caderno de Erros
- **Simulados** — 10 questões inéditas via structured output do Gemini, modo
  rápido (matérias variadas) ou focado por matéria; recuperação automática de
  sessão após atualizar a página; feedback explícito de salvamento com retry
- **Caderno de Erros** — alimentado por Simulados e Chat; status por item
  (aberto → revisando → dominado), anotações com salvamento automático,
  rollback otimista e aviso de falha visível
- **Plano de Estudos** — cronograma adaptável com data de prova, distribuição
  por peso FGV, serialização de escritas e feedback de falhas de sincronização
- **Estatísticas** — evolução das notas ao longo do tempo, acerto por matéria,
  sequência de dias estudando, indicador de evolução e funil do Caderno
- **Home** — visão diária com streak, último simulado, atividade recente e
  atalhos para as áreas principais

## Stack

**Frontend**
- React 18 + Vite 6 + Tailwind CSS 3
- Heroicons + react-markdown (GFM)
- Design System editorial: Fraunces (títulos) + Manrope (interface)
- Deploy: Vercel

**Backend**
- Python 3.12 + FastAPI + SQLAlchemy 2 + Alembic
- 7 routers organizados por domínio
- Rate limiting com slowapi
- Streaming SSE para o chat
- Deploy: Render

**Banco de dados**
- PostgreSQL (Neon em produção; Docker local em desenvolvimento)
- Migrations versionadas com Alembic, executadas automaticamente no startup

**IA**
- Google Gemini (`gemini-3.5-flash`, com fallback para `gemini-3.6-flash`)
- Structured output para geração de simulados (schema Pydantic + JSON)

**CI/CD**
- GitHub Actions: lint, testes automatizados e build a cada push

## Estrutura do repositório

```
facilita-oab/
├── backend/
│   ├── app/
│   │   ├── main.py          Bootstrap: middleware, CORS, lifespan, routers
│   │   ├── config.py        Configuração via pydantic-settings
│   │   ├── db.py            Engine + modelos SQLAlchemy (ORM)
│   │   ├── security.py      JWT HS256, validação de senha, dependency de auth
│   │   ├── schemas.py       Contratos Pydantic com validação de limites
│   │   ├── ai.py            Cliente Gemini + mapeamento de erros
│   │   ├── activity.py      Registro de atividade e helpers cross-cutting
│   │   ├── rate_limit.py    Limiter compartilhado (slowapi)
│   │   ├── serializers.py   Serialização de datas para ISO UTC
│   │   ├── parsers.py       Parse seguro de datas (retorna 422 em vez de 500)
│   │   ├── materias.py      Lista canônica de matérias + pesos FGV
│   │   ├── backup.py        Export/import JSON
│   │   ├── routers/
│   │   │   ├── auth.py      POST /auth/login (5 req/min)
│   │   │   ├── perfil.py    GET/PATCH /me, backup
│   │   │   ├── caderno.py   CRUD do Caderno de Erros
│   │   │   ├── cronograma.py Config + plano de estudos
│   │   │   ├── simulado.py  Geração (30 req/hora) + salvar resultado
│   │   │   ├── chat.py      Conversas + streaming SSE (60 req/min)
│   │   │   └── stats.py     GET /me/stats
│   │   └── prompts/
│   │       ├── mentor.md    Persona do Mentor Jurídico
│   │       └── simulado.md  Instruções para geração de questões
│   ├── migrations/          Alembic (versionamento de schema)
│   ├── tests/               Testes Python (unittest)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx          Shell autenticado e roteador por estado
│   │   ├── components/      Telas e componentes React
│   │   └── lib/             Caches, utilitários e contratos do frontend
│   ├── package.json
│   └── package-lock.json
├── docs/
│   ├── CURRENT_STATE.md     Estado atual para novas sessões do Claude
│   ├── DECISIONS.md         Decisões arquiteturais
│   └── continuity/          Registros históricos datados
├── .claude/
│   └── docs/                Referências técnicas para o Claude Code
├── .github/workflows/ci.yml
├── AGENTS.md
└── CLAUDE.md
```

## Configuração local

### Requisitos

- Docker + Docker Compose
- Node.js 20+ e npm
- Chave gratuita do Gemini: https://aistudio.google.com/apikey

### 1. Variáveis de ambiente

```bash
cd backend
cp .env.example .env
```

Edite `.env`:
- `GEMINI_API_KEY` — chave do Gemini
- `APP_PASSWORD` — senha do app (mínimo 8 caracteres)
- `JWT_SECRET` — gere com `python -c "import secrets; print(secrets.token_hex(32))"`

### 2. Backend (Docker)

```bash
docker compose up -d
```

Sobe o backend em `http://localhost:8000` e Postgres em `localhost:5433`.
Migrations do Alembic rodam automaticamente no startup.

### Backend sem Docker

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Nesse caso, ajuste `DATABASE_URL` no `.env` para apontar para um PostgreSQL
local, ou remova-a para usar SQLite (`sqlite:///facilita.db`).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre em `http://localhost:5173`. O Vite faz proxy de `/api/*` para o backend
em desenvolvimento; `VITE_API_URL` não precisa ser configurada nesse modo.

## Testes

**Backend** (52 testes):
```bash
cd backend
python -m unittest discover -s tests
```

**Frontend** (43 testes):
```bash
cd frontend
npm test
```

**Lint e build:**
```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Arquitetura

### Comunicação frontend ↔ backend

O frontend se comunica com o backend exclusivamente via HTTP/JSON (rotas
privadas) e SSE (streaming do chat). Todas as rotas privadas exigem
`Authorization: Bearer <JWT>`. O token JWT é gerado pelo backend no login e
armazenado em `localStorage` pelo frontend.

### Autenticação

Senha única compartilhada validada com `hmac.compare_digest` (timing-safe).
JWT HS256 com expiração obrigatória e campo `sub` validado. Tokens sem
expiração ou sem o `sub` correto são rejeitados com 401.

Em produção, a aplicação valida na inicialização que `JWT_SECRET` tem pelo
menos 32 caracteres e que `APP_PASSWORD` tem pelo menos 8 — segredos fracos
ou em branco fazem o backend recusar a inicialização.

### Banco de dados

Os modelos ORM ficam em `backend/app/db.py`. O banco de produção é PostgreSQL
no Neon. O Render hospeda o backend; o banco não está no Render. SQLite é
suportado como banco de desenvolvimento (valor padrão configurável via
`DATABASE_URL`).

### Headers de segurança

O backend aplica um middleware (`SecurityHeadersMiddleware`) que emite
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `CSP` e `HSTS`
em produção. Em desenvolvimento (`ENV=dev`), CSP e HSTS são omitidos para
permitir o Swagger UI.

## Deploy em produção

A publicação ocorre via push para `main`:

1. GitHub Actions roda lint, testes Python, testes de frontend e build (Ubuntu)
2. Render detecta o push, rebuilda o backend e faz deploy (~3 min)
3. Vercel detecta o push, rebuilda o frontend e faz deploy (~2 min)

### Variáveis de ambiente em produção

**Render (backend):**
- `DATABASE_URL` — string de conexão PostgreSQL do Neon (com `?sslmode=require`)
- `GEMINI_API_KEY`
- `JWT_SECRET` — mínimo 32 caracteres, diferente do valor de desenvolvimento
- `APP_PASSWORD` — mínimo 8 caracteres
- `CORS_ORIGINS` — URL exata do frontend na Vercel, sem barra final
- `ENV=production`

**Vercel (frontend):**
- `VITE_API_URL` — URL do backend no Render

### Migrations em produção

As migrations do Alembic rodam automaticamente no startup do Render. Nunca
altere tabelas manualmente. Para criar uma migration:

```bash
docker compose run --name gen backend alembic revision --autogenerate -m "descricao"
docker cp gen:/app/migrations/versions/<arquivo>.py migrations/versions/
docker rm gen
```

## Documentação técnica

- [Estado atual do projeto](docs/CURRENT_STATE.md)
- [Decisões arquiteturais](docs/DECISIONS.md)
- [Contratos de API e modelos](`.claude/docs/data-models.md`)
- [Design System](`.claude/docs/design-system.md`)
- [Débito técnico e riscos](`.claude/docs/debito-tecnico.md`)
- [Fluxo de desenvolvimento](`.claude/docs/workflow.md`)
- [Backend](backend/README.md)

## Prompts vivos

O comportamento do Mentor Jurídico e do gerador de simulados vem dos arquivos
`backend/app/prompts/mentor.md` e `backend/app/prompts/simulado.md`. Para
ajustar o estilo ou o tom da IA, edite esses arquivos em português, sem
necessidade de alterar código.

## Licença

MIT
