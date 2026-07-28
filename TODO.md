# TODO

## TODO técnico

- [ ] Frontend: melhorar tratamento de erro 422 no api.js — hoje mostra "[object Object]" para erros de validação Pydantic. Precisa parsear a lista de detalhes e mostrar mensagem legível ("Anotação muito longa. Máximo 5.000 caracteres.").

### Auditoria de segurança pré-deploy (achados baixos, pós-deploy)

- [ ] `LoginRequest.password`, `CreateNotebookItemFromChat.pergunta/resposta`, `LastConversationRequest.pergunta/resposta` sem `max_length` — inconsistente com os campos que já ganharam limite (`Message.content`, `AtualizarTituloRequest.titulo`, `UpdateNotebookItem.anotacao`).
- [ ] `POST /chat` aceita `messages: []` (sem `min_length=1`) — cria conversa fantasma com título vazio antes de falhar no Gemini. Adicionar `Field(min_length=1)` em `ChatRequest.messages`.
- [ ] `POST /me/simulados` sem limite de tamanho de payload/itens (aceitou 1000 questões fake, ~248KB, sem rejeição).
- [ ] `ImportRequest.simulados: list[dict]` é aceito no schema mas nunca lido em `import_all` (`backup.py`) — código morto, considerar remover do schema ou implementar a restauração de fato.
- [ ] Sem endpoint `DELETE /me/simulados/{id}` — impossível limpar resultado de teste/erro via API, só via acesso direto ao banco.
- [ ] Registro de teste órfão em produção local: `resultados_simulado id=4` (1000 questões fake da auditoria) — remover via `psql` quando conveniente.
