# Facilita OAB

Este repositório é um companion de estudos para a primeira fase da OAB,
single-user e com autenticação privada. O sistema possui uso real; preserve
funcionalidades em produção.

## Contexto rápido

- Frontend: React 18, Vite e Tailwind CSS.
- Backend: FastAPI, SQLAlchemy 2, Alembic e PostgreSQL.
- IA: Google Gemini para Mentor Jurídico e simulados.

## Fontes de referência

- README.md: visão geral, setup e deploy.
- .claude/docs/workflow.md: processo detalhado de desenvolvimento e validação.
- .claude/docs/data-models.md: contratos e modelos consumidos pelo frontend.
- .claude/docs/design-system.md: fonte de verdade visual e padrões aprovados. O Dashboard (Inicio.jsx + Sidebar.jsx) é a referência visual principal do produto; telas novas devem preservar essa identidade.
- .claude/docs/design-workflow.md: orquestração das skills de design, ordem de uso, precedência e conflitos já adjudicados.
- .claude/docs/debito-tecnico.md: riscos e limitações persistentes.
- TODO.md: pendências acionáveis.

## Regras de trabalho

- Investigue antes de editar e confirme o comportamento no código.
- Preserve contratos, persistência, regras de negócio e funcionalidades existentes.
- Não invente endpoints, campos, dados ou recursos ausentes.
- Referências visuais externas podem inspirar composição e acabamento, mas não podem introduzir funcionalidades ou dados inexistentes.
- Prefira alterações pequenas e incrementais.
- Alterações visuais não autorizam mudanças em backend, API, banco ou lógica de negócio.
- Preserve alterações locais; não descarte trabalho, troque de branch, faça merge, commit ou push sem solicitação explícita.
- Não altere banco de dados, autenticação ou infraestrutura sem escopo e necessidade comprovados.

## Skills especializadas

- .claude/docs/design-workflow.md é o orquestrador: diz qual skill usar, em que ordem e quem decide em caso de conflito. Consulte-o antes de trabalho visual não trivial.
- Próprias do projeto: .claude/skills/facilita-oab-design/SKILL.md (identidade e implementação visual) e .claude/skills/design-review/SKILL.md (auditoria de UI/UX e gate final).
- Externas instaladas: impeccable (direção UX/UI), emil-design-eng (motion e microinteração) e design-taste-frontend (filtro anti-genérico, sem autoridade sobre estrutura em telas de produto).
- As skills complementam estas instruções gerais e a documentação oficial.

## Validação

- Para alterações no frontend, execute npm --prefix frontend run build.
- Para alterações exclusivamente em Markdown, valide referências e caminhos; build não é obrigatório.
- Execute git diff --check antes da entrega.
- Relate verificações realizadas, limitações e testes manuais pendentes.

Consulte o workflow para orientações detalhadas; este arquivo não substitui a
documentação técnica e visual oficial.
