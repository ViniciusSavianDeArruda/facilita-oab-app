# Fluxo de trabalho esperado

## Branches

- main: produção. A cada push, GitHub Actions roda CI (valida build de backend e frontend); Render e Vercel disparam deploy automático a partir do mesmo push. Só recebe merge de branch já testada e aprovada.
- wip/*: trabalho em progresso — o CI também roda (branches wip/** estão no gatilho do workflow), mas sem deploy (Render/Vercel só observam main). Usar pra qualquer mudança visual ou arriscada antes de decidir levar pra produção.

## Processo pra mudanças não-triviais

1. Fase 0 — análise: ler os arquivos relevantes, confirmar estrutura atual, identificar riscos ou dependências antes de tocar em código. Reportar o plano antes de aplicar.
2. Fase 1 — aplicar: implementar a mudança.
3. Fase 2 — testar: preferencialmente com Playwright, incluindo cenários de erro/edge case, não só o caminho feliz. Restaurar qualquer dado de teste usado.
4. Fase 3 — reportar: diff completo + resultado dos testes. NÃO commitar sem aprovação explícita.

## Regras gerais

- Nunca commitar automaticamente sem confirmação do usuário.
- Se um pedido depender de dado/endpoint que não existe, avisar em vez de inventar.
- Mudanças de design ficam na branch wip/refinamento-design até aprovação final pra merge.
