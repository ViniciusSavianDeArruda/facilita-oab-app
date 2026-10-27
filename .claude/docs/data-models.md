# Modelos de dados relevantes para o frontend

## Autenticação

### POST /auth/login

Payload: `{ "password": string }`
Resposta 200: `{ "token": string }` — JWT HS256 com `sub` e `exp` obrigatórios.
Resposta 401: senha inválida.

O token é armazenado em `localStorage` por `authClient.js`. Ao receber 401 em
qualquer rota privada, `handleAuthExpired()` remove o token **antes** de disparar
o evento `auth:expired` — essa ordem previne loop de requisições.

Tokens sem `exp` ou com `sub` incorreto são rejeitados com 401. Tokens emitidos
antes da V2 do backend podem não ter esses campos e serão inválidos após o
deploy da V2.

## Plano de estudos

### Estrutura de um dia do plano

```json
{
  "data": "2026-10-27",
  "itens": [
    {
      "id": "uuid",
      "tipo": "revisar" | "simulado" | "caderno",
      "materia": "Civil",
      "minutos": 60,
      "concluido": false
    }
  ],
  "concluido": false
}
```

`materia` só está presente quando `tipo === "revisar"`. Não inventar campos
de subtema ou subtítulo.

## Simulados

### POST /simulado

Gera 10 questões estruturadas. Modo rápido ou focado por matéria (validada
contra lista canônica em `materias.py`). Matéria é opcional e só enviada no
modo focado.

Cada questão retornada: `materia`, `enunciado`, `alternativas` (A–D),
`correta` (`^[A-D]$`), `explicacao`, `fundamentoLegal`.

A chamada **não cria histórico**. A geração é separada da persistência.

### POST /me/simulados

Salva um simulado concluído. O servidor **recalcula** `acertos`, `total` e
`porMateria` a partir de `questoes` e `answers` — os valores enviados pelo
cliente são ignorados para pontuação. O campo `elapsedSec` deve ser `>= 0`.

Payload relevante:
```json
{
  "modo": "materia" | "rapido",
  "materiaFiltro": "Civil" | null,
  "questoes": [...],
  "answers": { "0": "A", "1": "C", ... },
  "elapsedSec": 120,
  "acertos": 0,
  "total": 10,
  "porMateria": {}
}
```

O cabeçalho `X-Tz-Offset-Minutes` (offset UTC em minutos) determina a data
civil usada no registro de atividade.

**Atenção:** o endpoint **não é idempotente**. Reenvios criam registros
duplicados. A UI deve verificar o histórico antes de tentar novamente (ver
`simuladoResultSave.js`).

### GET /me/simulados

Retorna lista de resultados. Cada item: `id`, `criado_em` (ISO UTC),
`acertos`, `total`, `porMateria`, `modo`.

## Caderno de Erros

### GET /me/caderno

Retorna registros de estudo. Campos comuns: `id`, `createdAt`, `origin`
(`"chat"` | `"simulado"`), `status`, `materia`, `anotacao`.

- `origin === "chat"`: inclui `pergunta` e `resposta` (Markdown GFM, pode
  conter tabelas).
- `origin === "simulado"`: inclui `questao` (objeto com `enunciado`,
  `alternativas`, `correta`, `explicacao`, `fundamentoLegal`) e
  `respostaDada`. Registros legados podem omitir alguns desses campos —
  a interface deve usar fallbacks seguros.

Status oficiais: `"aberto"`, `"revisando"`, `"dominado"`.

### PATCH /me/caderno/{id}

Atualiza `anotacao` e/ou `status`. Status inválido retorna 422.

### DELETE /me/caderno/{id}

Remove o registro. O frontend usa remoção otimista: remove da lista
imediatamente e faz rollback se o servidor falhar. O aviso de falha é exibido
no componente pai (`Caderno`), não no painel de leitura que já foi desmontado.

## Conversas e Mentor Jurídico

### POST /chat (SSE)

Responde por `text/event-stream`. Eventos: chunks de texto, `[DONE]`, `error`.
A mensagem do usuário é salva antes do stream; a resposta do Mentor é salva
ao final. O frontend usa `fetch` + `ReadableStream` (não `EventSource`) para
suportar `Authorization` e `POST` com body.

O campo `materia` (opcional) aceita somente valores da lista canônica — enviá-la
fora da lista retorna 422.

Limite: 60 req/min.

### GET/POST/PATCH/DELETE /chat/conversas e /chat/conversas/{id}

CRUD de conversas persistidas. O título de uma conversa pode ser atualizado.

## GET /me/stats

Campos da resposta:
```json
{
  "totalSimulados": 12,
  "trend": [
    { "createdAt": "2026-10-27T...", "acertos": 7, "total": 10 }
  ],
  "porMateria": [
    { "materia": "Civil", "acertos": 28, "total": 48 }
  ],
  "streak": 3,
  "cadernoStatus": { "aberto": 46, "revisando": 2, "dominado": 5 }
}
```

`porMateria` vem ordenado do menor para o maior percentual de acertos (ordenação
do servidor). As métricas derivadas — média geral, melhor nota, evolução — são
calculadas no frontend por `lib/estatisticas.js`. Quando dados forem ausentes,
exibir estados vazios sem inventar métricas.

O `streak` considera o offset de timezone enviado pelo cabeçalho
`X-Tz-Offset-Minutes`.

## Perfil

### GET/PATCH /me

`nome` (máx. 100 caracteres), `dataProva` (ISO `YYYY-MM-DD` ou null).
Nome com mais de 100 caracteres retorna 422.
