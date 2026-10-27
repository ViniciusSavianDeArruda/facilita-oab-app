# Decisões arquiteturais — Facilita OAB

Atualizado em **27/10/2026**. Registra decisões com contexto e consequência;
não documenta cada correção pontual. O contexto completo da V2 está em
`docs/continuity/CONTEXTO_FACILITA_OAB_2026-10-27.md`.

## Arquitetura e contratos

**Single-user com JWT por senha única.**
Caches simples no frontend; sem Redux/Zustand. Adequado ao escopo; não
introduzir camadas extras sem necessidade comprovada.

**Frontend e backend comunicam-se exclusivamente pelos endpoints existentes.**
Refinamentos de UI não alteram schemas, payloads, autenticação, banco ou
contratos.

**PostgreSQL/Neon em produção; SQLite configurável para desenvolvimento.**
O Render usa containers efêmeros — disco local não persiste entre restarts.
Alembic roda no startup; nunca alterar tabelas manualmente.

**Router por domínio, sem camada de service adicional.**
Adequado ao contexto single-user; uma camada extra faria sentido em app
multi-consumidor (HTTP + CLI + jobs), o que não é o caso.

## Segurança

**JWT HS256 com expiração e `sub` obrigatórios (introduzido na V2).**
Tokens gerados antes da V2, sem `exp` ou sem o `sub` correto, são rejeitados
com 401. Tokens em `localStorage` ficam expostos a XSS; uma CSP no Vercel
seria a mitigação adequada (pendente — ver débito técnico).

**Validação de segredos fracos no startup (introduzido na V2).**
`config.py` rejeita `JWT_SECRET` com menos de 32 caracteres e `APP_PASSWORD`
com menos de 8. Segredos com valores óbvios (`"secret"`, `"your-secret-key"`)
também são rejeitados em produção (`ENV=production`).

**Placar recalculado no servidor (introduzido na V2).**
`POST /me/simulados` ignora `acertos`/`total` enviados pelo cliente e os
recalcula em `calcular_placar()`. O cliente envia as questões e as respostas;
o servidor é a fonte de verdade para a pontuação.

**Headers de segurança via middleware (introduzido na V2).**
`SecurityHeadersMiddleware` emite `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `CSP` e `HSTS` em produção. Em `ENV=dev`, CSP e HSTS são
omitidos para não bloquear o Swagger UI.

## Persistência e estado

**`mutacao.js` centraliza o padrão de tentativa + rollback + callback (V2).**
Toda mutação otimista usa `executarMutacao({ enviar, aoSucesso, aoFalhar })`.
Isso garante rollback consistente e desacopla a lógica de erro do componente.

**Remoção do Caderno é otimista; aviso de falha exibido no componente pai (V2).**
O `ReadingPanel` desmonta ao remover o item. Por isso, a mensagem de falha
sobe para o componente `Caderno` via `onRemocaoFalhou()` e é exibida acima da
lista, que ainda está montada. O estado é reduzido por `reduzirAviso()` em
`avisoCaderno.js` — qualquer outra ação do usuário limpa o aviso.

**Falhas de hidratação rastreadas por `cargaFalhas.js` (V2).**
`App.jsx` exibe uma faixa global "Não foi possível carregar alguns dados" e
botão "Tentar de novo" quando qualquer módulo de hidratação registra uma falha.
Os módulos de cronograma, conversas e última atividade ainda não reportam falhas
individuais por essa via — risco documentado no débito técnico.

**Recuperação de sessão do Simulado via `localStorage` (V2).**
A chave `oab-simulado-current` persiste questões, respostas, questão atual e
`startedAt`. O timer é reconstituído a partir de `startedAt` após F5. A
tentativa é removida ao finalizar. Sem pausar/retomar da metade de forma
permanente — a recuperação cobre só a sessão atual.

**Fila de escritas do Plano via `planoPersistence.js`.**
No máximo uma escrita em voo por vez; edições pendentes são consolidadas.
Cobre conflitos dentro de uma aba; múltiplas abas simultâneas ainda podem
causar conflito.

**`POST /me/simulados` não é idempotente no servidor (risco aceito).**
Reenvios idênticos criam registros duplicados. A UI evita duplicação
conferindo o histórico antes de tentar de novo. Para um app single-user isso
é aceitável; a correção definitiva seria uma chave de idempotência enviada pelo
cliente. Risco documentado; não foi implementada a correção.

## Streaming e chat

**SSE com `SessionLocal()` explícito no generator.**
`Depends(get_session)` não tem vida garantida após `StreamingResponse`
retornar. O generator de chat abre sua própria sessão para persistência
pós-streaming.

**Mensagem do usuário salva antes do stream; resposta do Mentor salva ao final.**
Fallback de streaming só ocorre antes do primeiro chunk para não duplicar
conteúdo parcial.

## Testes e CI

**Testes do frontend migrados para `src/lib/__tests__/` (V2).**
Arquivos `.test.js` executados com `node --test`, sem dependências externas de
framework. Cobrem utilitários (`dataCivil`, `format`, `mutacao`, `caderno`,
`simuladoResultSave`, `estatisticas`, etc.) e comportamentos de borda
(`chatLimites`, `loginErrors`, `cargaFalhas`, `avisoCaderno`, `simuladoSessao`).

**CI executa lint, testes e build (ampliado na V2).**
`.github/workflows/ci.yml` roda em Ubuntu: `py_compile` + `unittest` do
backend; `npm ci` + `npm run lint` + `npm test` + `npm run build` do frontend.

**npm como gerenciador de pacotes do CI.**
`package.json` declara pnpm, mas o CI usa npm com `package-lock.json`. O
lockfile foi corrigido na V2 para incluir entradas completas (`resolved` +
`integrity`) dos binários nativos do Rollup para todas as plataformas (Linux,
macOS, Windows), resolvendo o erro `Cannot find module @rollup/rollup-linux-x64-gnu`
no GitHub Actions.

## Identidade visual

**Design System editorial, quente e profissional.**
Página creme (`surface-page`), superfícies claras, bordas quentes e vinho
(`brass`) como marca e CTA. Fraunces para títulos e números editoriais;
Manrope para interface, corpo e metadados. Gradientes, glassmorphism, sombras
pesadas e rosa recorrente foram evitados.

**Dashboard (`Inicio.jsx` + `Sidebar.jsx`) é a referência visual.**
Telas novas devem preservar essa identidade. Tokens de `tailwind.config.js`
prevalecem sobre referências externas.

**O produto é classificado como Operate.**
Escaneabilidade, previsibilidade e consistência vencem expressividade de landing
page. Sombras são substituídas por espaçamento, tipografia e bordas.

## Referências

- Contexto completo da V2: `docs/continuity/CONTEXTO_FACILITA_OAB_2026-10-27.md`
- Tokens: `.claude/docs/design-system.md`, `frontend/tailwind.config.js`
- Processo: `.claude/docs/design-workflow.md`, `.claude/docs/workflow.md`
- Contratos: `.claude/docs/data-models.md`, `backend/app/schemas.py`
