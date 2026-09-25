# Débito técnico conhecido

Este documento registra limitações persistentes, riscos e decisões adiadas.
Pendências acionáveis e priorizáveis ficam em TODO.md.

## Race condition no cronograma (issue aberta no GitHub)

Cliques rápidos (<200ms de intervalo) ao marcar tarefas causam estado inconsistente — respostas de requests antigos podem sobrescrever estado mais recente. Causa: múltiplos PUTs concorrentes + latência Render↔Neon (~2.4s). Solução já especificada: versionamento de requests em savePlano (cronograma.js) — descartar resposta se não for a versão mais recente. Não implementado ainda.

## Dados de teste

Os itens acionáveis de limpeza de dados de teste estão em TODO.md. Este risco permanece relevante enquanto ambientes de desenvolvimento forem reutilizados como demonstração.
