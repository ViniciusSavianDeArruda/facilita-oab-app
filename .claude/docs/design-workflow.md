# Fluxo de trabalho de design

Este documento orquestra as skills de design do projeto: diz qual usar, em que
ordem, quem decide em caso de conflito e o que nunca é automático.

Ele não contém tokens, paleta, valores ou regra visual. A fonte de verdade
visual é `.claude/docs/design-system.md`, e os tokens implementados estão em
`frontend/tailwind.config.js`. Este documento aponta; não duplica.

## 1. O Facilita OAB é um produto em modo Operate

A impeccable classifica superfícies em quatro modos. O Facilita OAB é
predominantemente **Operate**: a pessoa usuária está cumprindo uma tarefa
(estudar, praticar, revisar), não sendo convencida nem contemplando um
portfólio.

O que isso impõe, nas palavras da própria skill
(`.claude/skills/impeccable/reference/operate.md`):

- "Product UI's failure mode isn't flatness, it's strangeness without purpose."
- "The bar is earned familiarity. The tool should disappear into the task."
- "Responsive behavior is structural, not fluid typography."
- "Empty states that teach the interface, not 'nothing here.'"

Essa declaração vem primeiro porque é o que impede uma skill externa de
empurrar o produto para a expressividade de uma landing page. Consistência,
escanabilidade e expectativas estabelecidas valem mais que expressão. A marca
vive no detalhe preciso.

Ponto de atenção registrado, não resolvido: `operate.md` recomenda evitar
sequências orquestradas de entrada ("product loads into a task; users don't
want to watch it load"), e o Dashboard tem animações de entrada em
`frontend/src/index.css`. Item para auditoria futura, não para alteração
imediata.

## 2. As cinco camadas

| Camada | Papel | Entra quando | Autoridade |
| --- | --- | --- | --- |
| `facilita-oab-design` | Contexto e identidade do produto | Sempre, antes de tudo | Decide o que é o Facilita OAB |
| `impeccable` | Direção UX/UI principal | Depois do contexto | Direção, estrutura e piso de qualidade |
| `emil-design-eng` | Motion, microinteração, design engineering | Quando há movimento ou feedback de estado | Easing, duração, interrompibilidade |
| `design-taste-frontend` | Filtro anti-genérico | Depois da direção definida | Veto, nunca proposta |
| `design-review` | Checklist final do projeto | Antes de entregar | Gate de validação |

### Fronteira da design-taste-frontend

A skill declara o próprio escopo na primeira linha: "Landing pages, portfolios,
and redesigns. Not dashboards, not data tables, not multi-step product UI." O
Facilita OAB é exatamente o que ela exclui.

Por isso ela entra com fronteira dura: responde apenas "isso ficou genérico ou
templatado?" depois que a direção já está fechada. Nunca decide estrutura,
hierarquia, composição ou copy em superfície Operate.

### Nota operacional sobre a emil-design-eng

Invocada sem pergunta específica, ela responde apenas uma linha de
apresentação. Isso é comportamento projetado na própria skill, não falha de
carregamento. Faça a pergunta concreta.

## 3. Ordem de uso

```
contexto -> direção -> motion -> filtro -> gate
```

1. `facilita-oab-design`, com leitura de `design-system.md` e
   `frontend/tailwind.config.js`.
2. `impeccable`, no comando correspondente ao fluxo (seção 6).
3. `emil-design-eng`, somente se houver movimento ou feedback de estado.
4. `design-taste-frontend`, como passada de veto.
5. `design-review`, como gate.
6. `npm --prefix frontend run build` e `git diff --check`.

Regra transversal: a impeccable exige a leitura de
`.claude/skills/impeccable/reference/craft-floor.md` imediatamente antes de
qualquer edição de UI, inclusive em refinamento pequeno. Em trabalho apenas de
planejamento, não carregar.

## 4. Precedência

Duas escadas distintas, que não competem entre si.

### 4.1 Regras operacionais e de produto

Estão acima de qualquer decisão de design e não são negociáveis por nenhuma
skill. Fonte: `CLAUDE.md` e `AGENTS.md`.

- Preservar dados reais e funcionalidades existentes.
- Não inventar endpoints, campos, dados ou métricas.
- Não alterar escopo além do solicitado.
- Não alterar banco, autenticação ou infraestrutura sem escopo autorizado.
- Não commitar, pushar, trocar de branch ou descartar trabalho local sem
  autorização explícita.

Nenhuma skill externa autoriza violar qualquer um desses itens. Uma referência
visual externa serve para composição e acabamento, nunca para introduzir
funcionalidade ou dado inexistente.

### 4.2 Autoridade visual

1. `.claude/docs/design-system.md`
2. `facilita-oab-design`
3. Direção UX/UI explicitamente aprovada
4. `impeccable`
5. `emil-design-eng`
6. `design-taste-frontend`, como filtro anti-genérico
7. `design-review`, como gate final

A posição da `design-review` nesta lista indica que ela não é fonte de direção
visual, e não que tenha o menor peso. Ela é o gate de validação final: não
propõe direção, mas reprova entrega que não passe nos seus checklists. Um "não"
dela interrompe a entrega.

### 4.3 Regras de conflito

1. Token vence prescrição externa. Se uma skill pede valor que não existe nos
   tokens, o token vence, e a divergência vira pendência registrada em
   `design-system.md`. Nunca hex novo silencioso.
2. Padrão aprovado do Dashboard ou do Chat vence regra genérica. As skills
   externas não conhecem este produto. Onde há padrão estabelecido e aprovado,
   ele prevalece; a regra externa passa a valer para telas novas, sem padrão.
3. Conflito não resolvido para antes da edição. Vira pergunta, não escolha
   unilateral.
4. Copy de interface permanece em português do Brasil. As três skills externas
   são escritas em inglês e instruem em inglês; isso não se transfere para a
   interface.

## 5. Pré-requisitos de integração da impeccable

### 5.1 Resolução de caminho

O `SKILL.md` da impeccable instrui executar
`<skill-base-dir>/scripts/impeccable context` uma vez por sessão, mantendo o
cwd no projeto. Neste repositório o caminho real é:

```
.claude/skills/impeccable/scripts/impeccable
```

As referências internas da skill escritas como
`.agents/skills/impeccable/scripts/impeccable <verbo>` são resolvidas por esse
base dir; `.agents/` é o fallback documentado para quando o runtime não reporta
base dir, e não existe neste projeto. Em shell Windows sem `sh`, usar
`impeccable.cmd`. O funcionamento pelo base dir real ainda não foi testado em
execução.

### 5.2 PRODUCT.md e DESIGN.md

Não executar `impeccable init` ou `impeccable document` sem autorização
explícita.

Nenhum dos dois arquivos existe neste projeto, e esses comandos os criariam. A
fonte visual atual continua sendo `.claude/docs/design-system.md`.

Se `PRODUCT.md` ou `DESIGN.md` forem criados futuramente, a relação de
autoridade entre eles e o `design-system.md` deve ser definida explicitamente
antes de qualquer edição de UI. Nenhum arquivo novo pode virar segunda fonte de
verdade silenciosamente.

### 5.3 Hooks

`impeccable hooks on` instala um hook que roda o detector de design após
edições em arquivos de UI. Isso altera configuração do projeto, portanto é
opt-in explícito.

Regra da própria skill, que vale aqui: drift de artefatos nunca é reparado como
efeito colateral de uma tarefa de design. Um achado de contexto obsoleto é
reportado, não corrigido sem pedido.

### 5.4 Iteração no navegador

`live` e `generate` exigem dev server rodando, e são web-only. Pré-condição, não
capacidade sempre disponível. Playwright não está configurado no projeto.

## 6. Fluxos

### 6.1 Auditoria

1. `design-review` abre o escopo e define o que será auditado.
2. `impeccable critique` para revisão heurística de UX.
3. `impeccable audit` para acessibilidade, performance e responsividade.
4. Consolidar o diagnóstico sem editar.

Auditoria termina em relatório. Separar fato, hipótese e preferência estética, e
sustentar conclusão com evidência do código ou da interface.

### 6.2 Refinamento

1. `facilita-oab-design` para contexto.
2. `craft-floor.md`.
3. `impeccable polish`, ou o comando do eixo específico: `layout`, `typeset`,
   `clarify`, `colorize`, `distill`.
4. `emil-design-eng` se houver motion.
5. `design-taste-frontend` como veto.
6. `design-review`.
7. Build e `git diff --check`.

Refinamento preserva identidade, comportamento e copy fora do escopo.

### 6.3 Redesign

Somente com escopo autorizado.

A impeccable trata redesign como substituição de mundo visual e exige
`reference/new-work.md`, que trata o visual anterior como anti-referência. Isso
colide frontalmente com a diretriz de preservar a identidade do Dashboard.

Portanto: redesign de tela existente não roda por `new-work` sem decisão
explícita. O caminho padrão para tela existente é refinamento (6.2).

### 6.4 Empty state e primeiro uso

Comando dedicado: `impeccable onboard`.

Antes de desenhar, distinguir ausência de dado de falha de API. As duas
produzem tela vazia e exigem respostas opostas: uma ensina a interface, a outra
informa o erro. Essa distinção está aqui porque já foi errada neste projeto.

1. Verificar, no código, se o estado vazio prova ausência real de dado.
2. `impeccable onboard`.
3. `design-review`.

Estado vazio ensina a interface. Não inventar dado, métrica ou atividade para
preencher espaço.

### 6.5 Responsividade

`impeccable adapt` e `impeccable audit`.

O comportamento responsivo é estrutural: colapsar sidebar, reorganizar colunas
por breakpoint, adaptar tabela. Não é tipografia fluida. O mobile preserva
hierarquia e funcionalidade.

### 6.6 Finalização

1. `impeccable polish`.
2. `impeccable harden` se houver erro, edge case ou i18n envolvidos.
3. `design-taste-frontend` como veto.
4. `design-review`, checklists de identidade e de regressões conhecidas.
5. `npm --prefix frontend run build`.
6. `git diff --check`.
7. Relatar o que foi verificado, o que não foi possível verificar e os riscos
   remanescentes.

## 7. Conflitos já adjudicados

Decisões tomadas para este projeto. Valem sobre a regra genérica da skill
externa.

| Conflito | Regra externa | Decisão |
| --- | --- | --- |
| Cards aninhados | craft-floor: "nested cards are always wrong" | Card mestre com subcard é padrão aprovado no Dashboard e no Chat. O produto vence; a regra externa vale para telas novas |
| Hero-metric | craft-floor refuta o template de número grande com rótulo pequeno | Os KPIs do Dashboard permanecem. O produto vence |
| Progress ring | craft-floor refuta quando substitui conteúdo | O arco representa percentual real do plano, não placeholder. Permitido |
| Borda com sombra | craft-floor: declarar elevação uma vez | O subcard tem borda fixa e sombra apenas em hover, com alpha baixo. Mantido como exceção consciente |
| `transition: all` | emil e a regra do projeto convergem contra | Débito real nas telas legadas. Corrigir ao tocar nelas, não fora de escopo |
| Feedback de press | emil prescreve `scale(0.97)` | O projeto usa `active:translate-y-px`. O projeto vence por consistência; não misturar os dois idiomas |
| Raio de card | craft-floor: 12 a 16px | `rounded-xl` e `rounded-2xl` estão na faixa. Os poucos `rounded-3xl` ficam como pendência |
| Kicker / eyebrow | craft-floor trata como ban absoluto | Evitar uso repetitivo, automático ou com aparência genérica de template. É permitido quando tiver função editorial clara, ajudar na hierarquia e estiver coerente com a linguagem visual do Facilita OAB. Não usar em todas as seções por padrão |

A adjudicação do kicker é deliberada: o Facilita OAB tem identidade editorial e
jurídica, e uma regra externa não proíbe esse recurso de forma absoluta aqui.

## 8. O que nunca é automático

- Executar `impeccable init` ou `impeccable document`.
- Criar `PRODUCT.md` ou `DESIGN.md`.
- Ativar hooks.
- Redesenhar tela existente por `new-work`.
- Reparar drift de artefatos como efeito colateral.
- Alterar token, banco, autenticação ou infraestrutura.
- Commitar, pushar ou trocar de branch.
- Resolver conflito entre skills sem perguntar.
