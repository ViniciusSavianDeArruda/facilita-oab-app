# Facilita OAB

Companion de estudo pra 1ª fase do Exame da OAB, com mentor jurídico via IA, simulados inéditos, caderno de erros unificado e cronograma automático distribuído por peso FGV.

> **Projeto pessoal** desenvolvido pra apoiar preparação real pra prova da OAB. App single-user com autenticação privada.

## Motivação

Vi a oportunidade de aplicar boas práticas de engenharia num contexto real e útil: um companion de estudos personalizado, com mentor jurídico afinado no estilo FGV, gerador de simulados inéditos e organização automatizada de erros. Todas as decisões arquiteturais foram tomadas priorizando manutenibilidade, segurança e custo zero de operação.

## Screenshots

*(em breve)*

<!--
Depois de tirar as screenshots, descomente esse bloco:

### Login
![Login](docs/screenshots/login.png)

### Chat com mentor
![Chat](docs/screenshots/chat.png)

### Simulados
![Simulado](docs/screenshots/simulado.png)

### Caderno de erros
![Caderno](docs/screenshots/caderno.png)

### Cronograma
![Cronograma](docs/screenshots/cronograma.png)

### Estatísticas
![Stats](docs/screenshots/stats.png)
-->

## Stack

**Frontend**
- React 18 + Vite + Tailwind CSS
- Heroicons + react-markdown
- Deploy: Vercel

**Backend**
- FastAPI + SQLAlchemy 2 + Alembic
- 7 routers organizados por domínio
- Rate limiting com slowapi
- Streaming SSE pro chat
- Deploy: Render

**Banco**
- PostgreSQL (Neon em produção, Docker local em dev)
- Migrations versionadas com Alembic

**IA**
- Google Gemini (`gemini-flash-latest`)
- Structured output pra geração de simulados

**Monitoring**
- UptimeRobot (anti cold-start no Render Free)


## Features

- **Chat mentor**: streaming em tempo real, histórico de conversas por sessão, contextualização automática com caderno de erros
- **Simulados**: 10 questões inéditas via structured output do Gemini, modo rápido (variado) ou focado por matéria, alerta especial de Ética < 50%
- **Caderno de erros unificado**: chat e simulado alimentam a mesma fonte, status por item (aberto → revisando → dominado), anotações com salvamento automático
- **Cronograma adaptável**: com data de prova gera plano com reserva ~25% pra simulado/revisão, sem data vira rodízio contínuo pelas 18 matérias
- **Estatísticas**: nota por simulado ao longo do tempo, acerto por matéria, sequência de dias estudando, funil aberto/revisando/dominado

## Arquitetura

Backend foi refatorado de `main.py` monolítico (1104 linhas) pra routers por domínio (112 linhas — só bootstrap). Cada router tem responsabilidade clara e importa helpers compartilhados.

### Estrutura

```
backend/app/
├── main.py              Bootstrap: config, middleware, lifespan, include_router
├── config.py            Configuração via pydantic-settings
├── db.py                Engine + modelos SQLAlchemy
├── security.py          Verificação de senha, JWT, dependency de auth
├── auth.py              Serviço de login
├── ai.py                Cliente Gemini + tradução de erro
├── schemas.py           Modelos Pydantic
├── serializers.py       Serialização compartilhada
├── parsers.py           Parse seguro de datas (422 em vez de 500)
├── activity.py          Helpers cross-cutting (register_activity)
├── rate_limit.py        Limiter compartilhado (slowapi)
├── materias.py          Fonte única de matérias + peso FGV
├── backup.py            Export/import JSON
├── routers/
│   ├── auth.py          POST /auth/login (5/min)
│   ├── perfil.py        GET/PATCH /me + backup
│   ├── caderno.py       CRUD do caderno
│   ├── cronograma.py    Config + plano de estudos
│   ├── simulado.py      Geração (30/hour) + salvar resultado
│   ├── chat.py          Conversas + streaming SSE (60/min)
│   └── stats.py         GET /me/stats
└── prompts/
    ├── mentor.md        Persona do mentor jurídico
    └── simulado.md      Instruções pra gerador de questões
```

### Decisões técnicas

- **Router por domínio, sem camada de service adicional**: adequado ao contexto single-user. Camada de service faria sentido em app multi-user ou multi-consumidor (HTTP + CLI + jobs), o que não é o caso.
- **JWT com HS256 explícito**: simples pra single-user, sem cadastro/multi-tenant.
- **Rate limit por IP**: `key_func=get_remote_address`, compartilhado entre routers via `rate_limit.py`.
- **Streaming SSE com `SessionLocal()` explícito**: `Depends(get_session)` não tem vida garantida após `StreamingResponse` retornar, então o generator abre sessão própria pra persistência pós-streaming.
- **`parsers.py` centralizado**: `try/except ValueError` retornando 422 estruturado em vez de 500 cru. Aplicado em 6 pontos que faziam parse de datas do usuário.

## Segurança

- **Auth**: `hmac.compare_digest` (timing-safe), rate limit no login (5/min)
- **Autorização**: 24/24 rotas protegidas testadas em cenários sem token, token inválido, token expirado
- **SQL Injection**: 100% ORM/parametrizado, zero concatenação em query
- **XSS**: backend só retorna JSON, sem execução de conteúdo da IA como código
- **Rate limit**: 5/min login, 60/min chat, 30/hour simulado
- **CORS**: origem restrita ao domínio do frontend em produção
- **Headers**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **Segredos**: env vars separadas por ambiente, `.env` fora do git
- **/docs**: desabilitado em produção via `ENV=production`
- **Dependências**: PyJWT pinado em versão sem CVEs conhecidos; Starlette (dependência transitiva do FastAPI) acompanhado via atualização do FastAPI

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

### 2. Backend

```bash
docker compose up -d
```

Sobe backend em `http://localhost:8000` e Postgres em `localhost:5433`. Migrations do Alembic rodam sozinhas no startup.

### 3. Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Abre em `http://localhost:5173`. O Vite proxya `/api/*` pro backend automaticamente (não precisa configurar `VITE_API_URL` em dev).

## Deploy em produção

Fluxo CI/CD ativo via git push:

1. `git push origin main`
2. Render detecta push → rebuilda backend → deploy (~3 min)
3. Vercel detecta push → rebuilda frontend → deploy (~2 min)
4. UptimeRobot pinga `/health` a cada 5 min pra evitar cold start

### Serviços

| Serviço | Provedor
|---------|----------
| Frontend | Vercel |
| Backend | Render |
| Banco | Neon |
| Monitor | UptimeRobot

### Env vars em produção

**Render (backend):**
- `DATABASE_URL` (Neon com `+psycopg2` e `?sslmode=require`)
- `GEMINI_API_KEY`
- `JWT_SECRET` (chave forte, diferente de dev)
- `APP_PASSWORD`
- `CORS_ORIGINS` (URL do Vercel, sem barra final)
- `ENV=production`

**Vercel (frontend):**
- `VITE_API_URL` (URL do backend Render)

## Persistência e migrations

Mudanças de schema ou dados viram migration do Alembic — nunca `DROP`/`CREATE` manual. Fluxo:

```bash
docker compose run --name gerar_migration backend alembic revision --autogenerate -m "descrição"
docker cp gerar_migration:/app/migrations/versions/<arquivo>.py migrations/versions/
docker rm gerar_migration
```

Migrations rodam sozinhas (`alembic upgrade head`) toda vez que o container sobe (local ou Render).

## Prompts vivos

Comportamento das IAs vem dos `.md` em `backend/app/prompts/`. Iterar qualidade = editar em português, sem tocar em código.

## Trabalho realizado (resumo)

- Migração SQLite → PostgreSQL preservando dados
- Refactor de `main.py`: 1104 → 112 linhas
- 7 routers extraídos por domínio + 4 módulos cross-cutting
- Auditoria de segurança com 27+ checks 
- 3 fixes de segurança aplicados pré-deploy (PyJWT, Starlette, 422 em vez de 500)
- Deploy CI/CD em Render + Vercel + Neon com auto-deploy via git push
- Monitoring com anti cold-start

## Status do projeto

Em produção e manutenção contínua.

Sem novas features planejadas no momento — a arquitetura e o escopo atuais atendem integralmente ao caso de uso, e adicionar complexidade sem necessidade concreta iria contra os princípios que guiaram as decisões técnicas do projeto.

Manutenção ativa contempla:

- Atualizações periódicas de dependências e correções de CVEs
- Ajustes reativos conforme uso real
- Refinamentos pontuais de performance e UX


## Licença

MIT
