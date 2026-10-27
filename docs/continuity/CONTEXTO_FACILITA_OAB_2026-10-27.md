# Contexto — Facilita OAB — 27/10/2026

Registro histórico da evolução da branch `wip/redesign-v2`. Cobre o trabalho
realizado a partir de 26/10/2026 e posterior ao registro em
`CONTEXTO_FACILITA_OAB_2026-10-26.md`. **Não altere nem exclua este arquivo.**

---

## 1. Contexto inicial

### Estado da branch em 26/10

A branch `wip/redesign-v2` estava alinhada ao remoto (`origin/wip/redesign-v2`,
0 commits à frente/atrás). A working tree estava limpa. O redesign visual já
estava consolidado (Dashboard, Chat, Simulado, Plano, Home), mas o Caderno de
Erros e as Estatísticas ainda não tinham passado por auditoria completa.

Problemas identificados antes da auditoria:
- Race condition no Plano (múltiplos PUTs concorrentes por cliques rápidos)
- JWT sem validação de expiração obrigatória no backend
- Vários comportamentos de falha silenciosa no frontend
- CI executando apenas `py_compile` e `pnpm build` (sem lint nem testes)
- Débito técnico desatualizado

### Objetivos

Realizar uma auditoria técnica completa da V2, corrigir problemas críticos de
segurança e confiabilidade, adicionar cobertura de testes automatizados e
validar os fluxos funcionais em navegador antes de preparar o merge para `main`.

### Escopo do redesign V2

O redesign abrangeu identidade visual editorial (Fraunces + Manrope, vinho
institucional, fundo creme, bordas quentes), componentes revisados em todos os
fluxos principais e o novo painel de Estatísticas (reescrito de ~382 para ~987
linhas). Todos os mocks e previews temporários do Simulado foram removidos.

---

## 2. Auditoria técnica

### Banca de cinco revisores

A auditoria foi conduzida como uma "banca" com cinco perspectivas complementares:
segurança/backend, experiência do usuário, qualidade de código, acessibilidade e
confiabilidade. Cada revisor aplicou um checklist próprio ao código atual.

### Problemas encontrados (confirmados no código)

25 itens identificados, classificados por gravidade:

**Segurança e autenticação (críticos):**
- JWT sem validação de `exp` e `sub` — tokens arbitrários passavam na autenticação
- Segredos fracos aceitos em produção sem rejeição no startup
- `APP_PASSWORD` e `JWT_SECRET` configuráveis como strings vazias
- Ausência de CSP no frontend da Vercel
- Headers de segurança incompletos (HSTS, X-Frame-Options, etc.)

**Confiabilidade do Simulado:**
- Placar calculado pelo cliente e aceito pelo servidor sem recalcular
- Falha ao salvar sem distinção entre "servidor não recebeu" e "resposta perdida"
- Sessão não recuperada após F5 (perda de respostas e posição)
- `POST /me/simulados` sem guard contra POST duplicado na mesma sessão

**Caderno de Erros:**
- Alterações otimistas sem rollback visível ao usuário em caso de falha
- Remoção de item silenciosa quando a API falha (aviso no painel desmontado)
- Anotação sem retry após falha de salvamento

**Falhas de carregamento:**
- Erros de hidratação sem feedback ao usuário (`hydrateCaderno`, `hydrateSimulados`)
- Ausência de botão "Tentar de novo" após falha de carga

**Backend e schemas:**
- Matéria do prompt sem validação contra lista canônica (risco de injeção de prompt)
- `elapsedSec` podia ser negativo
- Status do Caderno sem `Literal` Pydantic (qualquer string era aceita)
- Configuração de CORS excessivamente permissiva em alguns ambientes

**Qualidade e CI:**
- CI sem lint nem testes (apenas `py_compile` + build)
- Testes de frontend inexistentes ou incompletos
- Testes de backend limitados a `test_simulado_generation.py`

**Outros:**
- Rate limit atrás do proxy do Render (comportamento não confirmado)
- Race condition no cronograma (cliques rápidos < 200ms)

### Critérios de aprovação

Cada item foi tratado como: corrigido, mitigado, pendente de validação, ou
risco aceito/documentado. O item "rate limit no Render" foi classificado como
"pendente de validação em produção" (não reproduzível localmente).

---

## 3. Correções implementadas

### Simulado

- Sessão persistida em `localStorage` com chave `oab-simulado-current`:
  questões, respostas, questão atual e `startedAt`
- Timer reconstituído a partir de `startedAt` após F5
- Tentativa removida do `localStorage` ao finalizar
- `simuladoResultSave.js` implementa guard de POST único por sessão
- Estados explícitos: `salvando`, `salvo`, `nao-confirmado`
- Retry confere o histórico antes de enviar para não duplicar
- Falha de rede distinguida de "servidor gravou, resposta perdida"

### Datas e Cronograma

- `dataCivil.js` padroniza datas no fuso de Brasília (UTC−3) sem depender
  do fuso do navegador
- Cálculos de "dias até a prova" e dias de estudo corrigidos para data civil
- `CronogramaConfig.jsx` e `Cronograma.jsx` unificam imports para `dataCivil`

### Segurança e JWT

- `security.py`: validação de `exp` e `sub` em `require_authentication()`
  usando `options={"require": ["exp", "sub"]}`
- `config.py`: `field_validator` para normalizar `ENV`; função
  `problemas_de_segredos()` rejeita segredos fracos em produção
- `main.py`: `SecurityHeadersMiddleware` emite CSP, HSTS, `X-Content-Type-Options`,
  `X-Frame-Options` e `Referrer-Policy` em produção; CORS restrito a
  `CORS_ORIGINS`
- `Dockerfile`: aplicação roda como usuário não-root (`USER app`)

### Schemas e limites de entrada

- `schemas.py`: `MateriaDoPrompt` com `AfterValidator` contra lista canônica;
  `elapsedSec: ge=0`; `Literal["aberto","revisando","dominado"]` para status
- `activity.py`: limite de timezone offset e outras validações de entrada

### Chat e streaming

- Limite de comprimento de mensagem enforçado no frontend (`chatLimites.js`)
- Streaming: tratamento de erro do provedor retornado como evento SSE de erro
  (não como falha HTTP)
- Botão "Parar" encerra o stream; botão "Tentar novamente" reaparece após erro

### Caderno de Erros

- `mutacao.js`: helper centralizado para tentativa + rollback + callback de falha
- `caderno.js`: todas as mutações usam `executarMutacao`; rollback ao estado
  anterior em caso de falha
- `Caderno.jsx` + `avisoCaderno.js`: aviso de falha de remoção exibido no
  componente pai (não no painel desmontado); `useReducer` com `reduzirAviso()`
  garante que qualquer outra ação limpe o aviso anterior
- Anotação: falha exibe aviso no painel; retry ocorre ao sair do campo novamente

### Ajustes

- `settings.js`: falha de salvamento exibe mensagem de erro
- Retry manual disponível após falha

### Estatísticas

- Componente `Estatisticas.jsx` reescrito (~987 linhas): painel de indicadores
  (totais, nota média, melhor nota, questões feitas), gráfico SVG de evolução
  com recortes "10/30/tudo", seção de evolução (+N p.p.), prioridades de
  matérias, acerto por matéria com barras e legenda, funil do Caderno
- `lib/estatisticas.js`: funções puras para todos os cálculos derivados
  (`calcularMediaGeral`, `calcularEvolucao`, `priorizarMaterias`, etc.)
- Estado vazio: exibe "0"/"—" sem `NaN` ou `undefined`; convite "Faça seu
  primeiro simulado"
- Sem overflow horizontal no mobile (390px)

### Erros de carregamento

- `cargaFalhas.js`: Set de falhas de hidratação com `registrarFalha` e
  `limparFalha`
- `App.jsx`: faixa global "Não foi possível carregar alguns dados" com botão
  "Tentar de novo" quando algum módulo registra falha

### Backend e infraestrutura

- `routers/simulado.py`: `calcular_placar()` recalcula acertos no servidor;
  retry único em `IntegrityError`; guard de except duplicado removido
- `backend/tests/test_api_auth_and_results.py`: testes de autenticação e
  persistência de resultados
- `backend/tests/test_config_secrets.py`: testes de validação de segredos fracos
- `backend/.env.example` atualizado com instruções de geração de segredos
- `docker-compose.yml`: porta do Postgres alterada para evitar conflito

---

## 4. Validação

### Testes automatizados

| Verificação | Resultado |
|---|---|
| Backend (unittest) | 52/52 aprovados |
| Frontend (node --test) | 43/43 aprovados |
| ESLint | aprovado |
| Build (Vite) | aprovado |

Os testes do frontend cobrem: `dataCivil`, `format`, `mutacao`, `caderno`,
`simuladoResultSave`, `simuladoSessao`, `estatisticas`, `chatLimites`,
`loginErrors`, `cargaFalhas`, `avisoCaderno` e `dataProva`.

### Testes funcionais no navegador

Realizados com Chrome headless controlado via CDP (WebSocket), scripts Node.js
em `C:\tmp\`, backend FastAPI local na porta 8100 com SQLite temporário e
Gemini monkeypatched (resposta simulada fixa).

Fluxos verificados:
- Login: senha correta, senha errada, falha de rede, expiração de sessão (401)
- Simulado: iniciar, responder, F5 (recuperação de respostas, questão e timer),
  falha ao salvar, retry sem duplicar, "servidor gravou mas resposta perdida"
- Caderno: status (com rollback e aviso), anotação (persistência, falha, retry),
  remoção (falha mostra aviso no pai, item permanece; sucesso remove da lista)
- Ajustes: falha e sucesso com mensagens adequadas
- Mentor: envio, erro do provedor com botão "Tentar novamente", interrupção
- Estatísticas: 12 simulados semeados com acertos controlados; todos os cálculos
  na tela (média 62%, melhor nota 90%, evolução +20 p.p., por matéria) batem
  com cálculo independente; estado vazio sem `NaN`; sem overflow mobile
- Falhas de carregamento: faixa de aviso aparece e "Tentar de novo" recupera

### Ambiente de validação

- Backend: SQLite em `C:\tmp\facilita_validacao.db` (banco descartável)
- Gemini: monkeypatched com resposta fixa; sem consumo real da API
- Fetch interception via CDP: simula falhas de rede, 401 e "servidor gravou,
  resposta perdida"
- Nenhum dado de produção foi acessado

### Problemas detectados durante a validação

**Remoção de item do Caderno — confirmado e corrigido:**
Ao falhar, o painel de leitura fechava sem mostrar aviso. Causa: `setErro()` era
chamado no `ReadingPanel` após a desmontagem. Correção: aviso movido para o
componente pai via `onRemocaoFalhou()` + `useReducer` com `reduzirAviso()`.
Cinco cenários testados: falha mostra aviso, selecionar outro item limpa, filtrar
limpa, segunda falha não acumula, sucesso remove e não mostra aviso.

---

## 5. Git e CI

### Organização dos commits da V2

```
d512225 fix(ci): corrige dependencias nativas do Rollup no Linux
3e7c169 feat(estatisticas): reformula painel de desempenho e indicadores
592b91f chore(ci): amplia testes e reforca configuracao de deploy
696970e fix(caderno): corrige salvamento, remocao e feedback de erros
4820801 fix(chat): melhora streaming, limites e tratamento de erros
9d148a5 fix(security): reforca autenticacao e validacoes do backend
4bb9cb1 fix(simulado): recupera sessao e melhora persistencia de resultados
23d981e fix(datas): padroniza datas e corrige cronograma
fac8e0a docs: organiza contexto e continuidade do projeto
```

Os commits anteriores (`f05bacb` e anteriores) são o redesign visual.

### Correção do Rollup no GitHub Actions

O `package-lock.json` foi gerado no Windows e continha entradas `packages`
apenas para as variantes Win32 do Rollup. O GitHub Actions roda em Ubuntu e
precisava de `@rollup/rollup-linux-x64-gnu` — ausente do lockfile, o binário
nativo não era instalado e o build falhava com
`Cannot find module '@rollup/rollup-linux-x64-gnu'`.

Correção: metadados de todas as 23 variantes faltantes buscados no registry
do npm (versão `4.62.2`, igual à já declarada) e entradas completas
(`resolved`, `integrity`, `os`, `cpu`, `optional: true`) adicionadas ao
lockfile. Nenhuma versão de pacote foi alterada.

### Estado atual da branch

- `wip/redesign-v2` está à frente de `main` em ~30 commits
- A branch **não foi mergeada nem publicada**
- Produção continua na `main` (estado anterior ao redesign V2)
- Próxima etapa: revisão do PR e merge

---

## 6. Infraestrutura

### Topologia

```
Usuário → Vercel (frontend React/Vite)
       → Render (backend FastAPI, porta 8000)
       → Neon (PostgreSQL, via DATABASE_URL com sslmode=require)
```

O Render hospeda exclusivamente o backend. O banco de dados está no Neon, não
no Render (containers do Render são efêmeros — disco local não persiste).

### Configurações necessárias antes do deploy da V2

**Render (backend):**
- `ENV=production` (não `dev` nem vazio)
- `JWT_SECRET` com pelo menos 32 caracteres (novo requisito da V2)
- `APP_PASSWORD` com pelo menos 8 caracteres
- `CORS_ORIGINS` igual à URL exata do frontend no Vercel, sem barra final
- `DATABASE_URL` apontando para o Neon com `?sslmode=require`
- `GEMINI_API_KEY` válida

**Vercel (frontend):**
- `VITE_API_URL` apontando para o backend no Render

**Pós-deploy:**
- Verificar comportamento do rate limit de login: confirmar se o IP visto
  pelo backend é o do cliente real ou o do proxy do Render (ver débito técnico)

---

## 7. Riscos residuais

### Falta de idempotência no POST /me/simulados

Reenvios criam registros duplicados. A UI evita duplicação conferindo o
histórico antes de tentar de novo, mas via outros clientes ou em cenários
não cobertos pela UI o risco persiste. Aceito como está para single-user;
a correção definitiva seria uma chave de idempotência.

### Rate limit atrás do proxy do Render

Não confirmado em produção. Não configurar `FORWARDED_ALLOW_IPS=*`. Verificar
na primeira semana após o deploy da V2.

### CSP pendente na Vercel

O backend emite CSP em produção; o frontend não tem `vercel.json` com
`Content-Security-Policy`. O token JWT em `localStorage` ficaria mais
protegido com CSP. Fica para a próxima iteração de segurança.

### Falhas silenciosas de carga em cronograma e conversas

Os módulos de hidratação de cronograma, última atividade e conversas não
reportam falhas para `cargaFalhas.js`. O usuário não recebe aviso se esses
dados não carregarem.

### Múltiplas abas simultâneas no Plano

A serialização de escritas cobre apenas uma aba. Duas abas concorrendo podem
gerar sobrescrita. Não há solução no escopo atual.

---

## 8. Próximos passos

1. **Revisão do PR** (`wip/redesign-v2` → `main`): conferir diff completo,
   especialmente `Estatisticas.jsx` (reescrita de ~600 linhas) e os novos
   arquivos de teste
2. **Verificar variáveis de ambiente no Render** antes do merge (lista acima)
3. **Merge e deploy**: push para `main` dispara CI + deploy automático no
   Render e na Vercel
4. **Validação pós-deploy**: confirmar comportamento do rate limit de login
   no Render, testar os fluxos principais em produção com Gemini real
5. **Próxima iteração**: CSP no Vercel, falhas de carga em cronograma/conversas,
   idempotência do POST de resultados

---

## 9. Referências

- Contexto anterior: `docs/continuity/CONTEXTO_FACILITA_OAB_2026-10-26.md`
- Estado atual resumido: `docs/CURRENT_STATE.md`
- Decisões: `docs/DECISIONS.md`
- Riscos: `.claude/docs/debito-tecnico.md`
- Contratos: `.claude/docs/data-models.md`
- Commits da V2: `git log --oneline main..HEAD`
