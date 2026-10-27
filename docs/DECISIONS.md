# Decisões preservadas — Facilita OAB

Atualizado em **26/10/2026**. Registro conciso; o documento completo de
continuidade contém a evidência e o histórico ampliados.

## Arquitetura e contratos

- O produto permanece single-user, com JWT por senha única e caches simples no
  frontend; não introduzir Redux/Zustand sem necessidade comprovada.
- Frontend e backend comunicam-se pelos endpoints existentes. Refinamentos de
  UI não alteram schemas, payloads, autenticação, banco ou contratos.
- PostgreSQL/Neon é o banco de produção; Alembic roda no startup. SQLite é
  fallback configurável de desenvolvimento.
- O Simulado gera exatamente 10 questões estruturadas com alternativas A–D.
  Resultado só é persistido após finalização.

## Identidade visual

- Identidade: editorial jurídico, quente e profissional; não é dashboard SaaS
  genérico nem landing chamativa.
- Página creme (`sand-50`/`surface-page`), superfícies claras, bordas quentes e
  vinho/bordô (`brass`/`action-primary`) como marca e CTA principal.
- Fraunces (`font-serif`) fica para títulos/números editoriais; Manrope para
  corpo, labels, botões e metadados.
- Verde/vermelho são reservados a feedback semântico real. Seleções usam
  superfície neutra + borda/indicador vinho; rosa não deve ser superfície
  recorrente.
- Evitar gradientes, glow, glassmorphism, sombras pesadas, chips decorativos e
  cards aninhados sem função. Preservar focus-visible, áreas de toque e
  `prefers-reduced-motion`.
- Dashboard (`Inicio.jsx` + `Sidebar.jsx`) e Chat são referências visuais.
  Tokens de `frontend/tailwind.config.js` vencem valores de referências
  externas.

## Plano

- A agenda preserva a ordem e a identidade dos itens; concluir não move a
  atividade para outra seção.
- `agruparItens` e `destinoPorTipo` vivem em
  `frontend/src/utils/cronogramaHelpers.js`.
- `frontend/src/lib/planoPersistence.js` serializa escritas, consolida edições
  pendentes e mantém DELETE/regeneração separados. Falhas devem ficar visíveis
  e não restaurar snapshot obsoleto.
- A solução cobre a aba atual; múltiplas abas ainda dependem de versionamento
  ou ETag no backend.

## Chat

- Streaming SSE persiste a mensagem do usuário antes do stream e a resposta do
  Mentor ao final. Fallback após o primeiro chunk não é tentado para não
  duplicar conteúdo.
- Histórico, drawer mobile, Markdown GFM, revisão de questão e salvar no
  Caderno permanecem integrados. O menu de três pontos deve preservar seus
  callbacks de renomear/excluir.

## Simulado

- Landing oferece Rápido e Focar em matéria; a execução usa A–D, timer,
  restauração temporária e modal de finalização.
- Resultados mantêm cálculo de acertos, percentual, tempo, por matéria,
  respostas, gabarito, explicação, Mentor e rodapé de navegação.
- `simuladoResultSave.js` evita POST duplicado e distingue salvando, salvo e
  não confirmado. Falha de rede não prova que o servidor não gravou.
- Os previews `SimuladoVisualPreview.jsx`, `mockSimuladoPreview.js`,
  `?simuladoVisual=1`, `?mockSimulado=1`, `preview` e `previewMode` foram
  removidos em 26/10/2026. O design aprovado está nos componentes reais.

## Caderno

- Preservar a composição lista + painel de leitura no desktop e fluxo em etapas
  no mobile, com filtros, seleção estável, Escape, foco restaurado e scroll
  independente.
- Status oficiais: `aberto`, `revisando`, `dominado`; registros podem vir de
  Chat ou Simulado. Dados legados incompletos exigem fallbacks seguros.
- Próximos refinamentos devem ser incrementais e não reconstruir o fluxo.

## Fonte e precedência

Regras de `AGENTS.md`/`CLAUDE.md` e contratos reais prevalecem. Visualmente,
segue-se `design-system.md`, `facilita-oab-design`, direção aprovada,
`impeccable`, `emil-design-eng`, `design-taste-frontend` como veto anti-genérico
e `design-review` como gate final. O workflow classifica o produto como
**Operate**, priorizando previsibilidade e escaneabilidade.

## Referências

- Contexto completo: `docs/continuity/CONTEXTO_FACILITA_OAB_2026-10-26.md`
- Tokens: `.claude/docs/design-system.md`, `frontend/tailwind.config.js`
- Processo: `.claude/docs/design-workflow.md`, `.claude/docs/workflow.md`
- Contratos: `.claude/docs/data-models.md`, `backend/app/schemas.py`
- Implementações: `frontend/src/components/`, `frontend/src/lib/`
