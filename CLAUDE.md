# Facilita OAB

Companion de estudos para a primeira fase do Exame da OAB. É um aplicativo
single-user, com autenticação privada, usado em contexto real de estudo.

## Stack

- Frontend: React 18, Vite e Tailwind CSS.
- Backend: FastAPI, SQLAlchemy 2, Alembic e PostgreSQL.
- IA: Google Gemini para Mentor Jurídico e geração de simulados.

## Referências oficiais

- Visão geral, setup e deploy: README.md
- Fluxo de desenvolvimento: .claude/docs/workflow.md
- Contratos e modelos relevantes ao frontend: .claude/docs/data-models.md
- Design System: .claude/docs/design-system.md (fonte de verdade visual; o Dashboard é a referência principal)
- Fluxo de design e ordem das skills visuais: .claude/docs/design-workflow.md
- Limitações e riscos conhecidos: .claude/docs/debito-tecnico.md
- Pendências acionáveis: TODO.md

## Princípios de trabalho

- Investigue o código, contratos e riscos antes de editar.
- Preserve funcionalidades de produção, contratos existentes e lógica de negócio.
- Faça alterações incrementais e não invente endpoints, dados ou funcionalidades.
- Alterações visuais não devem modificar API, persistência ou regras de negócio sem solicitação explícita.
- Antes de alterações relevantes de UI, leia .claude/skills/facilita-oab-design/SKILL.md e preserve a identidade do Dashboard em telas novas.
- Para auditoria de UI/UX, use .claude/skills/design-review/SKILL.md; o design-workflow define a ordem das skills e a precedência em caso de conflito.
- Referências visuais externas servem para composição e acabamento; nunca para introduzir funcionalidades ou dados inexistentes.
- Preserve a branch atual e todas as alterações locais. Não descarte trabalho existente, troque de branch, faça merge, commit ou push sem solicitação explícita.
- Não altere banco de dados, autenticação ou infraestrutura sem necessidade comprovada e escopo autorizado.

## Validação e entrega

- Valide proporcionalmente ao tipo e ao risco da alteração.
- Para frontend, execute npm --prefix frontend run build.
- Para alterações somente em Markdown, confira referências e caminhos; não é necessário executar build.
- Revise as alterações com git diff --check.
- Relate o que foi verificado, o que não foi possível verificar e riscos remanescentes.

O workflow contém o processo detalhado e prevalece para decisões operacionais.
