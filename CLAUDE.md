# Facilita OAB — Contexto do projeto

Companion de estudos pra 1ª fase do Exame da OAB, com mentor jurídico via IA, simulados inéditos, caderno de erros e cronograma adaptável. App single-user, feito pra uso pessoal real (não multi-tenant, não SaaS).

## Documentação detalhada

- Sistema de design: .claude/docs/design-system.md
- Modelos de dados: .claude/docs/data-models.md
- Fluxo de trabalho esperado: .claude/docs/workflow.md
- Débito técnico conhecido: .claude/docs/debito-tecnico.md

## Stack rápida

- Backend: FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL (Neon em prod, Docker local em dev). Deploy: Render.
- Frontend: React 18 + Vite + Tailwind CSS. Deploy: Vercel.
- IA: Google Gemini — gemini-3.5-flash principal, gemini-3.6-flash como fallback em erro 5xx (ver ai.py, funções generate_with_fallback e stream_with_fallback).

## Princípios do projeto

- Single-user, sem camada de service: lógica direto nos routers por decisão consciente (YAGNI). Não sugere refatorar pra arquitetura multi-tenant sem pedido explícito.
- Nunca inventa dado ou funcionalidade: se algo pedido depende de campo/endpoint que não existe no backend, avisa em vez de simular.
- Custo zero de operação: toda a stack roda em free tier (Render, Vercel, Neon, Gemini). Ao sugerir serviços novos, prioriza opções gratuitas.
