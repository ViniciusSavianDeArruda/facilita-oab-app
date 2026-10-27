# Facilita OAB — estado atual

Atualizado em **27/10/2026**. Branch `wip/redesign-v2`, **ainda não publicada
em produção** (pendente de PR e merge para `main`).

## Projeto

Companion single-user de estudos para a 1ª fase da OAB. React 18 + Vite 6 +
Tailwind CSS no frontend; FastAPI + SQLAlchemy 2 + Alembic no backend; Google
Gemini para IA; PostgreSQL/Neon em produção.

## Infraestrutura

| Camada | Provedor |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Banco de dados | Neon (PostgreSQL) |
| CI | GitHub Actions |

## Branch e situação

- Branch atual: `wip/redesign-v2`
- Distância de `main`: ~30 commits à frente (redesign V2 completo)
- A branch **não foi mergeada nem publicada**; produção ainda está na `main`
- Próxima etapa: revisão do PR e merge para `main`, seguida de deploy

## Funcionalidades implementadas

Home, Plano de Estudos (com cronograma e calendário), Mentor Jurídico
(streaming, histórico, retry, interrupção), Simulado (geração Gemini, recuperação
de sessão após F5, salvamento com retry e distinção de falha de rede), Caderno
de Erros (status, anotações, rollback otimista, aviso de falha de remoção),
Estatísticas (redesenhadas na V2: evolução, acerto por matéria, indicadores
derivados, estado vazio), Ajustes (nome, data da prova, persistência com
feedback).

## Testes e CI

| Verificação | Resultado |
|---|---|
| Backend (unittest) | 52/52 aprovados |
| Frontend (node --test) | 43/43 aprovados |
| ESLint | aprovado |
| Build (Vite) | aprovado |
| GitHub Actions | aprovado (após correção do lockfile do Rollup) |

Os testes funcionais de browser foram realizados com Chrome headless + CDP
contra um ambiente local isolado (SQLite temporário, Gemini simulado).

## Principais decisões técnicas da V2

- JWT com expiração e `sub` obrigatórios; tokens sem esses campos são rejeitados
- Placar do Simulado recalculado no servidor; payload do cliente é ignorado
- Remoção do Caderno é otimista; falha faz rollback e exibe aviso no pai
- Falhas de hidratação de dados são rastreadas por `cargaFalhas.js` e exibidas
  na faixa global de aviso em `App.jsx`
- `mutacao.js` centraliza o padrão de tentativa + rollback + callback de falha
- Testes migrados para `src/lib/__tests__/` (node --test, sem dependências)
- npm é o gerenciador de pacotes do CI (package-lock.json corrigido para incluir
  binários nativos do Rollup para todas as plataformas)

## Pendências e riscos documentados

- `POST /me/simulados` não é idempotente no servidor: reenvios criam registros
  duplicados (a UI evita, mas o risco existe via outros clientes)
- Rate limit atrás do proxy do Render: não validado em produção (ver
  `debito-tecnico.md`)
- CSP pendente no frontend da Vercel (sem `vercel.json`)
- Cronograma, última atividade e conversas não exibem aviso quando a carga
  falha individualmente
- Múltiplas abas simultâneas podem causar conflitos na escrita do Plano (a fila
  atual cobre apenas uma aba)

## Próxima etapa

Revisão do PR (`wip/redesign-v2` → `main`), verificação das variáveis de
ambiente no Render (`ENV`, `JWT_SECRET`, `APP_PASSWORD`, `CORS_ORIGINS`) e
deploy. Após o deploy, validar o rate limit do login atrás do proxy do Render.

## Referências

- Histórico completo da V2: `docs/continuity/CONTEXTO_FACILITA_OAB_2026-10-27.md`
- Contexto da V1/pré-auditoria: `docs/continuity/CONTEXTO_FACILITA_OAB_2026-10-26.md`
- Decisões: `docs/DECISIONS.md`
- Riscos: `.claude/docs/debito-tecnico.md`
- Contratos: `.claude/docs/data-models.md`
- Regras de trabalho: `AGENTS.md`, `CLAUDE.md`
