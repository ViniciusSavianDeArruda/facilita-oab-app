# Modelos de dados relevantes pro frontend

## Plano de cronograma (cronograma.js, Cronograma.jsx)

Cada dia do plano: { data (ISO), itens: [...], concluido }

Cada item dentro de um dia:
```
{
  id: string (uuid, gerado via crypto.randomUUID()),
  tipo: "revisar" | "simulado" | "caderno",
  materia: string (só presente quando tipo === "revisar"),
  minutos: number,
  concluido: boolean
}
```

Não existe campo de subtítulo/subtema — só matéria + tipo + duração. Não inventar esse dado ao gerar UI.

## Autenticação

JWT armazenado em localStorage (authClient.js). Ao receber 401, handleAuthExpired() remove o token ANTES de disparar o evento auth:expired — importante manter essa ordem pra evitar loop de requisições (bug já corrigido, ver commit f5b584c).

## Simulados

Gerados via structured output do Gemini, 10 questões por simulado. Modo "rápido" (matérias variadas) ou "focar em matéria" (1 matéria escolhida). Sem persistência de progresso pausado (retomar simulado do meio não é suportado hoje).

## Contratos de integração relevantes

### POST /simulado

Gera uma lista estruturada de dez questões para o modo rápido ou para uma matéria selecionada. A matéria é opcional e só é enviada no modo por matéria.

Cada questão retornada contém matéria, enunciado, quatro alternativas, alternativa correta, explicação e fundamento legal. O frontend deve tratar a geração como uma operação potencialmente demorada e manter a resolução separada da persistência do resultado.

Cuidados:

- A quantidade esperada é exatamente dez; uma resposta incompleta não deve ser apresentada como um simulado válido.
- A chamada não cria um resultado no histórico. A persistência ocorre somente após a finalização da resolução.
- Erros do provedor são convertidos em respostas seguras da API; a interface não deve inferir detalhes internos a partir da mensagem.

### Resultados de simulados

POST /me/simulados salva um simulado concluído. O payload inclui o modo, a matéria filtrada quando aplicável, as questões usadas, as respostas da estudante, o tempo decorrido e os totais de acertos. A resposta persistida também é a base para Estatísticas e para os registros de revisão originados do Simulado.

Campos de maior interesse ao frontend:

- questoes e answers preservam o contexto necessário à revisão.
- acertos e total definem a nota exibida nas Estatísticas.
- porMateria alimenta o desempenho por matéria.
- createdAt determina a ordem cronológica do histórico.

Questões não respondidas permanecem distintas de alternativas incorretas no resultado. Integrações de revisão devem preservar essa diferença.

### Caderno de Erros

GET /me/caderno retorna registros de estudo com identificador, data de criação, origem, status, matéria e anotação. A origem pode ser chat ou simulado; os campos de conteúdo variam conforme essa origem.

- Registros do chat possuem pergunta e resposta do Mentor. A resposta pode conter Markdown GFM, incluindo tabelas.
- Registros do simulado possuem a questão completa e a resposta dada. Registros legados podem estar incompletos; a interface deve evitar assumir alternativas, gabarito ou fundamento quando esses dados não existirem.
- Os status persistidos são aberto, revisando e dominado.

PATCH /me/caderno/{id} atualiza anotação e/ou status. DELETE /me/caderno/{id} remove o registro após a confirmação mantida pelo frontend. Essas operações precisam atualizar a lista, os filtros e os contadores locais sem alterar contratos da API.

### Conversas e Mentor Jurídico

POST /chat responde por SSE e pode receber o contexto de uma conversa existente. As mensagens do usuário são texto; respostas do Mentor podem usar Markdown e são renderizadas no Chat e no Caderno com suporte a GFM.

As conversas persistidas são tratadas pelas rotas /chat/conversas. O frontend deve manter o contexto enviado pelo Caderno separado da apresentação visual da mensagem, para não alterar o conteúdo útil ao Mentor.

### GET /me/stats

Fornece os dados somente de leitura usados em Estatísticas:

- totalSimulados: quantidade de resultados persistidos.
- trend: histórico cronológico com data, acertos e total de cada simulado.
- porMateria: matéria, acertos e total agregados.
- streak: sequência de estudo calculada no backend.
- cadernoStatus: totais de aberto, revisando e dominado.

A nota visual do gráfico é derivada no frontend pela fórmula round((acertos / total) * 10). Não há média adicional no contrato. Quando dados forem ausentes ou parciais, a tela deve apresentar estados vazios seguros sem inventar métricas.
