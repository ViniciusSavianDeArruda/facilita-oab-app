# Contexto atual — Facilita OAB

> Auditoria de continuidade realizada em 26/10/2026. Este documento descreve
> o código, os documentos e o Git observados nessa data. **Confirmado** significa
> verificado diretamente no estado atual; **histórico** significa sustentado por
> commits ou documentação; **não confirmado** significa proposta sem evidência de
> implementação; **pendente** significa trabalho incompleto ou que requer
> validação.

## 1. Resumo executivo

O Facilita OAB é um companion privado de estudos para a primeira fase do Exame
da OAB. É uma aplicação single-user com autenticação por senha, plano de
estudos, Mentor Jurídico com streaming, simulados gerados por Gemini, Caderno
de Erros e Estatísticas. O frontend é React/Vite/Tailwind e o backend é
FastAPI/SQLAlchemy/Alembic, com PostgreSQL em produção e SQLite configurável
para desenvolvimento.

O estado funcional observado está relativamente estável. O trabalho recente
consolidou refinamentos visuais do Simulado, Plano, Home e Chat, além de duas
correções de confiabilidade importantes: serialização das escritas do Plano e
feedback explícito de salvamento do resultado do Simulado. As estruturas
temporárias de preview/mock do Simulado foram removidas do código atual; o
design aprovado está no fluxo oficial.

O próximo trabalho recomendado é o Caderno de Erros. A tela já possui lista,
painel de leitura, filtros, edição e integração com Mentor, portanto o próximo
passo deve ser auditoria/refinamento incremental, não reconstrução.

## 2. Estado real do Git

### Snapshot observado

- Repositório: `C:\Users\Adminstrador\Downloads\facilita-oab`.
- Branch atual: `wip/redesign-v2`.
- Tracking: `origin/wip/redesign-v2`.
- Relação com o remoto: 0 commits à frente e 0 atrás no momento da auditoria.
- Remoto: `https://github.com/ViniciusSavianDeArruda/facilita-oab-app.git`.
- Working tree: limpa; não havia arquivos modificados, staged ou não rastreados.
- Stashes: nenhum.
- Merges: nenhum merge commit encontrado no histórico consultado.
- Nenhuma operação de checkout, merge, rebase, reset, restore, stash, fetch,
  pull, push ou commit foi executada durante esta auditoria.

### Branches locais

- `wip/redesign-v2` — branch atual, alinhada ao remoto.
- `main` — rastreia `origin/main`.
- `wip/refinamento-design` — branch histórica de refinamento.
- `backup/redesign-v2-before-rebase` — backup histórico da consolidação visual.

### Commits recentes relevantes

1. `1022bdf style(frontend): formata renderizacao do simulado no App`
2. `2f19e6c style(inicio): neutraliza superficies e refina interface`
3. `33a72d2 feat(plano): refina agenda e calendario de estudos`
4. `2bb1648 feat(simulado): consolida refinamento visual do fluxo`
5. `210454a fix(simulado): informa estado do salvamento do resultado`
6. `9f3bd67 fix(plano): serializa persistencia e informa falhas`
7. `5d569ad fix(frontend): trata fallbacks e remove prop nao utilizada`
8. `1544729 fix(chat): fecha drawer quando o historico fica vazio`
9. `050c1a0 fix(caderno): estabiliza selecao filtros e anotacao`
10. `f881500 feat(simulado): refina tela inicial do simulado`
11. `145153f feat(plano): refina composicao visual do cronograma`
12. `6b99654 refactor(plano): move helpers reutilizaveis para utils`
13. `4a8c4bb refactor(navegacao): centraliza icones da Sidebar e BottomNav`
14. `9025163 chore(frontend): configura ESLint, Prettier e EditorConfig`

O histórico anterior inclui a consolidação do redesign do Dashboard e da
identidade visual (`932b179` e commits relacionados). Os nomes dos commits são
evidência histórica; o código atual é a fonte de verdade quando houver
divergência.

## 3. Visão geral do produto

O estudante entra com uma senha única, hidrata os caches do frontend e navega
entre cinco áreas principais:

1. **Início/Home:** visão diária, progresso, último simulado, atividade recente
   e atalhos.
2. **Plano:** configuração, geração, agenda de hoje, esta semana, próxima
   semana e calendário completo.
3. **Mentor Jurídico:** conversas com streaming SSE, histórico, Markdown e
   contexto opcional de questão/matéria.
4. **Simulado:** geração de dez questões inéditas, resolução, resultado e
   inclusão automática dos erros no Caderno.
5. **Caderno de Erros:** registros vindos de Simulado e Chat, status de estudo,
   filtros, anotações e discussão com o Mentor.
6. **Estatísticas:** evolução das notas, acerto por matéria, sequência de estudo
   e distribuição de status do Caderno.

O diferencial funcional é a integração: erros de simulados e dúvidas do Chat
alimentam a mesma fonte de revisão; o Plano distribui estudo por peso FGV; e a
Home sintetiza atividade recente sem inventar dados quando os contratos ainda
não têm informação suficiente.

## 4. Arquitetura

### 4.1 Frontend

Stack confirmada no `frontend/package.json`:

- React `18.3.1` e React DOM `18.3.1`.
- Vite `^6.0.7`.
- Tailwind CSS `3.4.17`.
- Heroicons React `^2.2.0`.
- `react-markdown` `9.0.1` e `remark-gfm` `4.0.1`.
- ESLint `10.12.0`, hooks/refresh plugins e Prettier `3.9.9`.
- Package manager declarado: pnpm `10.30.0`; há também `package-lock.json`.

`frontend/src/App.jsx` é o shell autenticado e roteador por estado. As views
atuais são `inicio`, `chat`, `simulado-landing`, `simulado-run`,
`simulado-results`, `caderno`, `settings`, `cronograma`,
`cronograma-config`, `cronograma-completo` e `estatisticas`. A Sidebar é
ocultada em execução do Simulado, Settings e configuração do Cronograma; a
BottomNav aparece no mobile.

Arquivos principais:

- `src/App.jsx`: autenticação, hidratação, navegação e composição do shell.
- `src/lib/api.js`: `authFetch`, JSON, `streamChat`, geração do Simulado e
  cabeçalho de timezone.
- `src/lib/authClient.js`: JWT em `localStorage`, login/logout e expiração.
- `src/lib/caderno.js`, `conversas.js`, `cronograma.js`, `simulados.js`,
  `settings.js`, `lastActivity.js`: caches em memória, hidratação, eventos e
  contratos do frontend.
- `src/lib/planoPersistence.js`: fila/barreira de escritas do Plano.
- `src/lib/simuladoResultSave.js`: controle de tentativa única e estados do
  salvamento de resultados.
- `src/components/Inicio.jsx`: Dashboard/Home.
- `src/components/Chat.jsx` e `ChatComposer.jsx`: Mentor e composição de
  mensagens.
- `src/components/SimuladoLanding.jsx`, `SimuladoRun.jsx`,
  `SimuladoResults.jsx`, `QuestionCard.jsx`: fluxo completo do Simulado.
- `src/components/Caderno.jsx`: lista e leitura de registros.
- `src/components/Cronograma.jsx`, `CronogramaConfig.jsx` e
  `CronogramaCalendario.jsx`: Plano.
- `src/components/Estatisticas.jsx`: indicadores e gráficos.
- `src/components/Sidebar.jsx`, `BottomNav.jsx`, `Brand.jsx` e
  `icons/NavigationIcons.jsx`: navegação e identidade.

Não há Redux/Zustand; o caso single-user é atendido por caches simples e
subscribers. A persistência local é usada para JWT e para a tentativa corrente
do Simulado (`oab-simulado-current`).

### 4.2 Autenticação e comunicação

`authClient.js` guarda o JWT no `localStorage`. `authFetch` injeta
`Authorization: Bearer`, envia o offset de timezone e remove o token antes de
disparar o evento de expiração em 401. O Chat usa `fetch` + `ReadableStream`
porque `EventSource` não aceita POST com body e cabeçalho de autorização.

O Vite faz proxy de `/api` para o backend em desenvolvimento. Em produção,
`VITE_API_URL` aponta para o backend.

### 4.3 Backend

O backend está organizado em:

- `backend/app/main.py`: FastAPI, middleware, CORS, lifespan, Alembic e
  inclusão dos routers.
- `config.py`: pydantic-settings e variáveis de ambiente.
- `db.py`: engine, sessão e modelos ORM (`Perfil`, `RegistroAtividade`,
  `ItemCaderno`, `ConfiguracaoCronograma`, `PlanoCronograma`,
  `ResultadoSimulado`, `Conversa`, `MensagemChat`).
- `security.py`: senha única, JWT HS256 e dependência de autenticação.
- `schemas.py`: contratos Pydantic.
- `serializers.py`, `parsers.py`, `activity.py`, `backup.py`, `materias.py`,
  `rate_limit.py`: responsabilidades compartilhadas.
- `routers/auth.py`, `perfil.py`, `caderno.py`, `cronograma.py`,
  `simulado.py`, `chat.py`, `stats.py`: rotas por domínio.
- `migrations/`: Alembic; migrations rodam no startup.

Banco confirmado: PostgreSQL/Neon em produção e SQLite como valor padrão
configurável (`DATABASE_URL`) para desenvolvimento. Docker Compose sobe
backend e Postgres local.

Contratos principais:

- Público: `GET/HEAD /health`, `POST /auth/login`.
- Perfil: `GET/PATCH /me`, `PUT /me/last-chat`, `GET /me/export`,
  `POST /me/import`, `GET /me/stats`.
- Caderno: `GET/POST/PATCH/DELETE /me/caderno` e `DELETE/PATCH
  /me/caderno/{id}`.
- Plano: `GET/PUT /me/cronograma/config`, `GET/PUT/DELETE
  /me/cronograma/plano`.
- Simulado: `POST /simulado`, `GET/POST /me/simulados`.
- Chat: `POST /chat` (SSE), `GET/POST /chat/conversas`, `GET/PATCH/DELETE
  /chat/conversas/{id}`.

Todas as rotas privadas exigem JWT. Não alterar schemas, nomes de campos,
semântica de respostas ou persistência sem uma decisão explícita de contrato.

## 5. IA e Gemini

### Configuração confirmada

`backend/app/ai.py` usa o SDK oficial `google-genai`, com:

- principal: `GEMINI_MODEL`, default `gemini-3.5-flash`;
- fallback: `GEMINI_MODEL_FALLBACK`, default `gemini-3.6-flash`;
- timeout HTTP do cliente: 120 segundos;
- timeouts específicos do Simulado: 60 segundos na tentativa principal e 90
  segundos no orçamento total, conforme `config.py`.

As chaves ficam em ambiente e não estão documentadas neste arquivo.

### Mentor Jurídico

`routers/chat.py` carrega `prompts/mentor.md`, converte o histórico para o
formato Gemini, envia matéria opcional e transmite chunks por SSE. A mensagem
do usuário é salva antes do stream; a resposta do Mentor só é persistida ao
final do stream. O frontend trata id da conversa, chunks, `[DONE]`, erro,
abort/cancelamento, histórico, drawer mobile, Markdown GFM e salvar no Caderno.

O fallback de streaming só ocorre antes do primeiro chunk; reiniciar depois de
conteúdo parcial duplicaria resposta. Erros são resumidos antes de chegar à
interface.

### Simulados

`routers/simulado.py` carrega `prompts/simulado.md`, pede JSON estruturado para
10 questões usando `QuestionList`, `response_mime_type="application/json"` e
schema Pydantic. O código rejeita quantidade diferente de dez, canonicaliza
matérias no modo rápido e força a matéria escolhida no modo focado. O schema
atual tem alternativas A–D, gabarito com padrão `^[A-D]$`, explicação e
fundamento legal.

Falhas conhecidas são mapeadas para 504 (timeout), 429/503 do provedor ou 502
genérico. O fallback pode ser usado em erro de servidor e, no Simulado, em
timeout. Logs registram request id, modelo, duração e tentativa, sem expor
segredos.

Não há evidência no código de RAG, banco vetorial, consulta jurídica externa,
atualização automática de legislação/jurisprudência ou terceiro fallback
`gemini-3.5-flash-lite`. RPM/TPM/RPD do provedor não são configurados no
repositório; há limites internos de endpoint (login 5/min, Chat 60/min,
Simulado 30/hora). O orçamento de R$ 30/mês é meta, não enforcement de custo.

## 6. Funcionalidades auditadas

### 6.1 Home / Dashboard — confirmado

`Inicio.jsx` agrega settings, último Chat, último Simulado, Caderno, Plano,
streak e `/me/stats`. Renderiza estados vazios seguros, contagem de atividade,
resumo da nota, matérias, frase diária e atalhos. O código valida o formato de
resultado antes de montar a síntese para não inventar dados.

O redesign consolidado usa composição editorial, tokens vinho/creme, métricas
reais e superfícies neutras. O commit visual atual é `2f19e6c`. A largura real
da Sidebar no código deve prevalecer sobre descrições antigas do README.

### 6.2 Plano de Estudos — confirmado

`CronogramaConfig.jsx` salva horas/dia, data de prova e matérias fracas. O
backend gera os dias e o frontend os agrupa por data/tipo usando
`utils/cronogramaHelpers.js` (`agruparItens`, `destinoPorTipo`).

`Cronograma.jsx` contém:

- faixa editorial dos próximos sete dias;
- segmentos de progresso reais;
- seção Hoje com data, progresso, tempo restante e atividades na ordem original;
- Esta semana em linhas agrupadas;
- Próxima semana em duas colunas no desktop e uma no mobile;
- checkbox compartilhado `ItemCheckbox` e grupos `ItemRowGroup`;
- ações para estudar, abrir Caderno e iniciar Simulado.

Concluídos permanecem na posição. A estrutura visual do checkbox e da linha foi
refinada para evitar remontagem, salto de layout e animação exagerada; a
transição usa propriedades específicas e o CSS global respeita reduced motion
onde aplicável.

`cronograma.js` hidrata o cache, gera/recompacta, marca item e expõe
subscriptions. `planoPersistence.js` garante no máximo uma escrita em voo,
consolida edições pendentes, separa DELETE de regeneração e evita rollback de
snapshot obsoleto. `PlanoPersistenceNotice.jsx` comunica pendência, erro e
retry explícito.

O commit funcional principal é `9f3bd67`; o refinamento visual mais recente é
`33a72d2`. O risco de múltiplas abas/versionamento no servidor permanece
separado da solução dentro da aba atual.

### 6.3 Mentor Jurídico — confirmado

`Chat.jsx` gerencia conversas, nova conversa, histórico, drawer mobile, estado
vazio, streaming, cancelamento, retry, revisão de questão e salvar no Caderno.
`ChatComposer.jsx` concentra a entrada. Markdown GFM é renderizado com
wrappers para tabelas e estilos globais em `index.css`.

O histórico fecha o drawer quando fica vazio (`1544729`). O item de conversa
mantém seleção, renomeação e exclusão; o botão de três pontos possui menu de
contexto sem alterar callbacks ou persistência. A integração com Caderno envia
contexto separado da apresentação da mensagem.

### 6.4 Simulado — confirmado no fluxo oficial

`SimuladoLanding.jsx` oferece modo Rápido e Focar em matéria, seleção
condicional de matéria, resumo e CTA. A geração real chama `POST /simulado`.

`SimuladoRun.jsx` mantém:

- 10 questões;
- alternativas A–D;
- timer baseado em `startedAt`;
- restauração de tentativa em `localStorage` pela chave
  `oab-simulado-current`;
- navegação por questão, contador e status respondida/pendente;
- modal de finalização com Revisar respostas, Finalizar, foco e Escape;
- remoção da tentativa local ao finalizar.

`QuestionCard.jsx` compartilha apresentação de execução e revisão. A revisão
mostra resposta do usuário, gabarito, fundamento e explicação.

`SimuladoResults.jsx` calcula acertos, percentual e `porMateria` a partir das
questões e respostas recebidas. O design oficial contém placar grande,
aproveitamento, tempo, corretas/incorretas, desempenho por matéria, revisão
neutra com expansão inline, resposta/gabarito, explicação, Mentor e ações de
rodapé.

`simuladoResultSave.js` e `simulados.js` impedem POST duplicado na mesma sessão
e expõem estados salvando, salvo e não confirmado. Falha de conexão ou resposta
perdida não é tratada como certeza de ausência do registro. O backend salva o
resultado e inclui no Caderno os erros ainda inexistentes.

#### Preview/mock removido — confirmado

Não existem mais no código atual:

- `frontend/src/components/SimuladoVisualPreview.jsx`;
- `frontend/src/lib/mockSimuladoPreview.js`;
- `?simuladoVisual=1`;
- `?mockSimulado=1`;
- referências `previewMode`, `simulado.preview` ou `createPreviewSimulado`.

O layout aprovado está nos componentes oficiais e não depende de flag de
desenvolvimento. A validação pendente é manual com geração real, especialmente
modal, timer, salvamento confirmado/falha e revisão em diferentes larguras.

### 6.5 Caderno de Erros — confirmado; próximo foco

`Caderno.jsx` usa `caderno.js` como cache/subscription e apresenta:

- estado vazio educativo;
- cabeçalho com contagens de aberto, revisando, dominado e com anotação;
- filtro por status e matéria;
- lista de registros e painel de leitura em desktop;
- fluxo em etapas no mobile;
- seleção estável, Escape, foco restaurado e scroll independente da lista e do
  painel;
- edição de anotação/status e exclusão com confirmação;
- origem Chat ou Simulado;
- Markdown GFM para respostas do Mentor;
- botão para discutir com o Mentor.

Registros legados podem estar incompletos. O componente usa fallbacks de
conteúdo e não deve presumir alternativas, gabarito ou fundamento ausentes.

Problemas/possíveis inconsistências a investigar, sem tratá-los como bugs
confirmados:

- coexistem `bg-brass/10` e superfícies neutras em alguns filtros/seleções;
- a documentação antiga descreve padrões mais simples que o componente atual;
- não há teste visual automatizado nem Playwright configurado.

O próximo trabalho deve começar por auditoria visual e de estados do Caderno,
preservando a arquitetura lista + painel.

### 6.6 Estatísticas — confirmado

`Estatisticas.jsx` consome `GET /me/stats`. Mostra streak, total de simulados,
nota por simulado em gráfico de barras ou linha, acerto por matéria e seção do
Caderno. A nota do gráfico é `round(acertos / total * 10)`, conforme o contrato.
Há estados de carregamento, erro e ausência de simulados. Os dados são somente
leitura; não há métricas inventadas.

## 7. Design System e skills

### Tokens e decisões visuais

Fonte de verdade: `.claude/docs/design-system.md` e
`frontend/tailwind.config.js`.

- Página: creme quente (`sand-50`/`surface-page`).
- Superfície elevada: clara (`surface-raised`/`ink-950`).
- Subsuperfície: `surface-subtle`/`ink-900`.
- Marca: vinho/bordô `brass`/`action-primary`.
- Títulos e números editoriais: Fraunces (`font-serif`).
- Interface, corpo e metadados: Manrope (`font-sans`).
- Bordas quentes, divisores sutis e foco visível vinho.
- Verde/vermelho somente para sucesso/erro semântico real.
- Seleções preferencialmente neutras com borda/indicador vinho.
- Gradientes, glow, glassmorphism, sombras pesadas e rosa recorrente foram
  evitados. Tokens rosados legados ainda existem, mas vários usos foram
  migrados para neutros; não remover tokens globais sem nova auditoria.
- Responsividade é estrutural: Sidebar colapsa para BottomNav, grids viram
  coluna e áreas de toque permanecem adequadas.

### Precedência

1. Regras operacionais de `AGENTS.md`/`CLAUDE.md`.
2. Código e contratos reais aprovados.
3. `.claude/docs/design-system.md`.
4. `facilita-oab-design`.
5. Direção explícita aprovada para a tarefa.
6. `impeccable`.
7. `emil-design-eng` para motion.
8. `design-taste-frontend` como filtro anti-genérico, nunca como autoridade
   estrutural.
9. `design-review` como gate final.

`design-workflow.md` define o produto como **Operate**: escaneabilidade,
previsibilidade e familiaridade vencem expressividade de landing page. Também
proíbe criar `PRODUCT.md`/`DESIGN.md`, ativar hooks ou reparar drift de skills
sem autorização.

Skills locais disponíveis e papel:

- `facilita-oab-design`: identidade e implementação no produto.
- `design-review`: auditoria/gate final.
- `impeccable`: direção UX/UI e referências de craft/audit/polish; não deve
  substituir o Design System.
- `emil-design-eng`: motion, easing, transições e reduced motion.
- `design-taste-frontend`: veto contra aparência genérica; não decide estrutura.

Não há evidência de `PRODUCT.md` ou `DESIGN.md` gerados pela Impeccable.

## 8. Contratos e comportamentos a preservar

- O Simulado sempre gera exatamente 10 questões e possui somente A–D no schema.
- Resultado só é persistido após finalização; geração não cria histórico.
- Questões não respondidas permanecem distintas de incorretas.
- Erros do Simulado alimentam o Caderno sem duplicar pelo enunciado.
- Chat persiste usuário antes do stream e resposta após conclusão.
- Plano usa `GET/PUT/DELETE` existentes; a fila atual é frontend, não solução
  de concorrência entre abas.
- JWT, endpoints, payloads e schemas não devem ser alterados em refinamentos de
  UI.
- Dados incompletos/legados devem renderizar estado seguro, sem dados inventados.

## 9. Qualidade e infraestrutura

### Scripts e testes

Frontend (`frontend/package.json`):

- `npm run dev` / `pnpm dev`;
- `npm run build` / `pnpm build`;
- `npm run lint`;
- `npm run format` e `format:check`.

Testes determinísticos atuais:

- `frontend/tests/planoPersistence.test.mjs`;
- `frontend/tests/simuladoResultSave.test.mjs`;
- total observado: 21 testes passando.

Backend possui `backend/tests/test_simulado_generation.py`; a CI atual não
executa a suíte frontend nem testes Python, apenas `py_compile` backend e
`pnpm build` frontend.

### CI/deploy

`.github/workflows/ci.yml` roda em push de `main` e `wip/**` e em pull request
para `main`. Instala Python 3.12, compila módulos Python, instala pnpm e faz
build frontend. Render, Vercel e Neon são documentados como deploy/serviços;
UptimeRobot é citado para evitar cold start. Não inferir que a CI cobre lint,
testes ou validação visual.

### Divergências documentais

- `frontend/README.md` menciona Sidebar `w-60`, enquanto o código atual usa
  valores mais largos em partes do shell; o código é a referência.
- Documentação alterna npm e pnpm; `package.json` declara pnpm, mas
  `package-lock.json` existe e comandos npm foram usados localmente.
- `debito-tecnico.md` ainda descreve a race condition do Plano como aberta,
  embora `9f3bd67` tenha implementado fila/versionamento dentro da aba. Deve
  ser tratado como documento desatualizado até revisão explícita.
- README fala em CI ampla, mas o workflow atual não executa lint/testes.

## 10. Débitos e pendências priorizadas

### P0 — bloqueadores

Nenhum P0 confirmado. Não foram encontrados segredos rastreados; os arquivos
`.env` locais não são versionados e somente `.env.example` aparece no índice.

### P1 — importantes

1. Validar manualmente o fluxo real do Simulado com Gemini: geração, respostas,
   modal, timer, resultado, salvamento e falha de confirmação.
2. Auditar/refinar o Caderno sem reconstruir a lista + painel já existente.
3. Atualizar `debito-tecnico.md` para refletir a fila do Plano e suas
   limitações entre abas.
4. Confirmar visualmente o Plano Hoje, Calendário e Landing do Simulado em
   desktop/mobile.

### P2 — melhorias técnicas

1. Avaliar adicionar lint e testes determinísticos à CI.
2. Definir idempotência/versionamento no backend para múltiplas abas e retry
   seguro de resultados.
3. Melhorar parsing de erro 422 em `api.js` (pendência documentada no TODO).
4. Auditar limites de payload, backup/import e registros legados do Caderno.
5. Padronizar decisão de package manager (pnpm versus package-lock/npm).

### P3 — ideias não implementadas

- Terceiro fallback Gemini (`gemini-3.5-flash-lite`).
- RAG, fontes jurídicas externas, banco vetorial ou atualização automática de
  legislação/jurisprudência.
- Testes visuais automatizados/Playwright.
- Estratégia PWA/manifest e novas métricas de produto.

## 11. Próximo trabalho: Caderno de Erros

Antes de editar, ler `AGENTS.md`, `CLAUDE.md`, `design-workflow.md`,
`design-system.md`, `data-models.md`, `Caderno.jsx` e `lib/caderno.js`.

O foco recomendado é uma auditoria de estados e consistência visual:

- lista vazia versus erro de API;
- filtros sem seleção perdida;
- seleção/fechamento e restauração de foco;
- edição de anotação/status e confirmação de exclusão;
- mobile em etapas e scroll independente;
- registros incompletos/legados;
- integração de revisão com Mentor e Simulado.

Critério de segurança: manter o contrato de Caderno, a identidade do registro,
os status `aberto`, `revisando`, `dominado`, a origem Chat/Simulado e a
arquitetura lista + painel. Não criar novo modelo de dados nem uma segunda
fonte de verdade visual.

## 12. Como continuar sem perder contexto

1. Conferir `git status --short --branch` e preservar qualquer diff local.
2. Ler `AGENTS.md` e `CLAUDE.md`.
3. Ler `.claude/docs/design-workflow.md`, depois `design-system.md`,
   `data-models.md`, `workflow.md` e `debito-tecnico.md`.
4. Consultar o componente real e seus consumidores antes de usar histórico como
   prova.
5. Separar mudanças visuais, persistência, qualidade e documentação em diffs
   distintos.
6. Não alterar backend/API/contratos em tarefa de UI sem decisão explícita.
7. Rodar `npm --prefix frontend run build` e `git diff --check`; para lógica de
   persistência, rodar também `Set-Location frontend; node --test tests/*.test.mjs`.
8. Relatar validação visual como pendente quando nenhum navegador foi usado.
9. Não criar previews/mock temporários sem necessidade; se criados, removê-los
   após aprovação, como ocorreu no Simulado.

## 13. Referências de evidência

- Produto/setup: `README.md`, `frontend/README.md`, `backend/README.md`.
- Processo: `AGENTS.md`, `CLAUDE.md`, `.claude/docs/workflow.md`.
- Contratos: `.claude/docs/data-models.md`, `backend/app/schemas.py`.
- Design: `.claude/docs/design-system.md`, `.claude/docs/design-workflow.md`,
  `frontend/tailwind.config.js`, `frontend/src/index.css`.
- Navegação: `frontend/src/App.jsx`, `Sidebar.jsx`, `BottomNav.jsx`.
- IA: `backend/app/ai.py`, `backend/app/routers/chat.py`,
  `backend/app/routers/simulado.py`, `backend/app/prompts/`.
- Simulado: `SimuladoLanding.jsx`, `SimuladoRun.jsx`, `SimuladoResults.jsx`,
  `QuestionCard.jsx`, `lib/simulados.js`, `lib/simuladoResultSave.js`.
- Plano: `Cronograma.jsx`, `CronogramaConfig.jsx`,
  `CronogramaCalendario.jsx`, `lib/cronograma.js`, `lib/planoPersistence.js`,
  `PlanoPersistenceNotice.jsx`.
- Caderno: `Caderno.jsx`, `lib/caderno.js`.
- Estatísticas: `Estatisticas.jsx`, backend `routers/stats.py`.
- Testes: `frontend/tests/`, `backend/tests/test_simulado_generation.py`.
- Histórico: commits `9025163`, `4a8c4bb`, `6b99654`, `145153f`, `f881500`,
  `050c1a0`, `1544729`, `5d569ad`, `9f3bd67`, `210454a`, `2bb1648`,
  `33a72d2`, `2f19e6c` e `1022bdf`.

Este documento é uma fotografia auditada. Alterações futuras devem atualizar as
conclusões somente após confronto com o código e os testes atuais.
