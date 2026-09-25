# Fluxo de trabalho esperado

## Branches

- main: produção. A cada push, GitHub Actions roda CI (valida build de backend e frontend); Render e Vercel disparam deploy automático a partir do mesmo push. Só recebe merge de branch já testada e aprovada.
- wip/*: trabalho em progresso — o CI também roda (branches wip/** estão no gatilho do workflow), mas sem deploy (Render/Vercel só observam main). Usar pra qualquer mudança visual ou arriscada antes de decidir levar pra produção.

## Processo para mudanças não triviais

1. Preserve a branch atual e as alterações não commitadas; não use comandos de restauração ou troca de branch para limpar trabalho de outra pessoa.
2. Investigue arquivos, contratos e riscos antes de implementar. Reporte o plano quando a alteração não for trivial.
3. Faça mudanças incrementais, dentro do escopo solicitado.
4. Valide em proporção ao risco. Para frontend, execute npm --prefix frontend run build; para documentação, valide referências e caminhos.
5. Revise git diff e execute git diff --check nos arquivos alterados.
6. Reporte testes executados e limitações. Não declare teste manual sem tê-lo executado.

## Regras gerais

- Nunca commitar automaticamente sem confirmação do usuário.
- Nunca executar push sem confirmação explícita.
- Se um pedido depender de dado/endpoint que não existe, avisar em vez de inventar.
- Mudanças de design ficam na branch wip/refinamento-design até aprovação final pra merge.
- Playwright não está configurado no projeto; pode ser avaliado futuramente, mas não é requisito atual.
