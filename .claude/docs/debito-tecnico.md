# Débito técnico conhecido

## Race condition no cronograma (issue aberta no GitHub)

Cliques rápidos (<200ms de intervalo) ao marcar tarefas causam estado inconsistente — respostas de requests antigos podem sobrescrever estado mais recente. Causa: múltiplos PUTs concorrentes + latência Render↔Neon (~2.4s). Solução já especificada: versionamento de requests em savePlano (cronograma.js) — descartar resposta se não for a versão mais recente. Não implementado ainda.

## dataProva de teste incorreta em produção

Usuária real tem dataProva configurada pra 2111 (resíduo de teste antigo, causa "30.827 dias" na contagem regressiva). Não corrigido — precisa reset manual do valor real via app ou banco.

## Resíduos de dados de teste

Conversas de chat e itens de caderno com títulos tipo "teste enter envia", "smoke test final" — resíduos de desenvolvimento, sem limpeza automática. Requer remoção manual quando conveniente.
