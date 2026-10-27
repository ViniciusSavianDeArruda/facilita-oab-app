# Facilita OAB — estado atual

Atualizado em **26/10/2026**. Snapshot observado na branch `wip/redesign-v2`,
alinhada a `origin/wip/redesign-v2` (0 à frente/atrás no momento da auditoria).

## Resumo

Aplicação single-user de estudos para a primeira fase da OAB, com React/Vite/
Tailwind no frontend e FastAPI/SQLAlchemy/Alembic no backend. O fluxo oficial
inclui Home, Plano, Mentor Jurídico, Simulado, Caderno e Estatísticas.

## Concluído recentemente

- Redesign editorial do Simulado oficial: Landing, execução, modal de
  finalização, alternativas A–D, resultados e revisão inline.
- Estados explícitos de salvamento do resultado: salvando, salvo e falha de
  confirmação, sem retry cego.
- Fila de persistência do Plano, com serialização de PUTs, consolidação de
  edições pendentes e proteção contra rollback obsoleto.
- Refinamentos visuais da Home, Plano, Chat e Caderno; superfícies rosadas
  recorrentes foram reduzidas em favor de neutros quentes.
- Previews/mocks temporários do Simulado foram removidos; o layout aprovado é
  agora o fluxo real.

## Trabalho atual

Não há implementação ativa. A working tree estava limpa antes da organização
destes documentos; a única alteração autorizada nesta etapa é documentação.

## Próximo passo

Auditar e refinar incrementalmente o **Caderno de Erros**, preservando a
arquitetura existente de lista + painel de leitura.

## Pendências importantes

- Validar manualmente Simulado real, Plano e Caderno em desktop/mobile.
- Atualizar `debito-tecnico.md`, que ainda descreve a race condition do Plano
  como aberta apesar da fila já implementada.
- Avaliar lint/testes na CI e estratégia de idempotência/versionamento para
  múltiplas abas e retries seguros.
- Melhorar parsing de erros 422 e revisar dados legados/importação.

## Cuidados

Preserve contratos, persistência, estados reais e dados existentes. Não invente
endpoints ou métricas. Para UI, leia o Design System e o workflow de design;
faça mudanças pequenas, mantenha a responsividade/acessibilidade e não remova
feedback semântico. Não faça operações destrutivas no Git sem autorização.

## Referências

- Contexto completo: `docs/continuity/CONTEXTO_FACILITA_OAB_2026-10-26.md`
- Decisões: `docs/DECISIONS.md`
- Regras: `AGENTS.md`, `CLAUDE.md`
- Visual/processo: `.claude/docs/design-system.md`,
  `.claude/docs/design-workflow.md`, `.claude/docs/workflow.md`
- Contratos: `.claude/docs/data-models.md`
