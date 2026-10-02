---
name: facilita-oab-design
description: Use esta skill ao criar ou refinar telas e componentes do Facilita OAB. Preserve a identidade visual, os tokens do Design System e os padrões de interface aprovados no projeto.
---

# Design do Facilita OAB

Use esta skill para implementação visual neste repositório. Ela complementa a
design-review: use design-review para auditar ou planejar; use esta skill para
preservar a identidade estabelecida ao aplicar um refinamento aprovado.

## Fonte de verdade

Leia `.claude/docs/design-system.md` antes de alterar uma interface e consulte
`frontend/tailwind.config.js` para os tokens implementados. Não copie valores
de tokens para esta skill. Se documentação e implementação divergirem,
identifique a diferença antes de modificar qualquer uma delas.

**Dashboard (`Inicio.jsx` + `Sidebar.jsx`) e Chat (`Chat.jsx` +
`ChatComposer.jsx`) são a referência visual oficial.** Compare qualquer tela
nova com eles antes de inventar um padrão.

Alterações em `tailwind.config.js` não recarregam de forma confiável no Vite:
ao mudar um token, avise que o dev server precisa ser reiniciado.

## Identidade

Preserve o vinho institucional, o fundo creme quente, as superfícies claras, os
títulos editoriais em Fraunces e o texto de interface em Manrope. A hierarquia
vem de tipografia, espaçamento, agrupamento e bordas quentes — não de sombra.

Use a marca reutilizável onde o wordmark for necessário. Não crie uma
identidade nova com azul primário genérico, gradientes chamativos, efeito de
vidro, sombras pesadas, emojis decorativos ou cards e badges sem propósito.

## Classifique o elemento antes de estilizar

Cada papel tem tokens próprios. Antes de escrever classe, decida o que o
elemento é:

| Papel | Superfície | Borda | Hover |
| --- | --- | --- | --- |
| Card mestre | `ink-950` | `ink-800` | nenhum |
| Subcard interativo | `ink-900` | `surface-border-subtle` | `surface-subcard-hover` + `surface-border-hover` |
| Linha editorial (lista) | transparente | `border-b border-border-subtle` | fundo sutil |
| Botão primário | `brass` | — | `brass-hover` |
| Botão outlined | `ink-950` | `surface-border-button` | `surface-button-hover` + `surface-border-button-hover` |
| Link textual | — | — | `brass-link-hover` + underline |
| Pill / status | `surface-pill` ou `brass-soft` | `surface-pill-border` | nenhum |

**Pares que nunca se misturam:** `surface-border-hover` é de subcard;
`surface-border-button-hover` é de botão. Reutilizar um no lugar do outro
faz um ajuste futuro arrastar o componente errado — já aconteceu.

## Ordem de trabalho com tokens

1. **Consulte primeiro os tokens existentes.** Se já houver um que compile
   exatamente para o valor desejado, use-o.
2. **Reutilize padrões existentes** (card, subcard, botão primário/secundário,
   pill) antes de criar variações.
3. **Evite hex hardcoded** quando já existir token equivalente.
4. **Crie token semântico** quando realmente não houver equivalente — com nome
   que descreva o papel, não a cor.
5. **Não altere tokens globais para resolver um detalhe local.** Antes de mudar
   o valor de um token, verifique quantos componentes o usam; se o uso for
   amplo, crie um token específico em vez de retunar o compartilhado.

## Verificar antes de "corrigir"

Não altere um valor apenas porque parece diferente de uma referência ou porque
"parece errado". Primeiro inspecione o CSS computado e os tokens reais.

O redesign do Dashboard mostrou que percepção de cor depende de fundo,
contraste e renderização: bordas matematicamente quentes foram percebidas como
azuladas várias vezes, e em um dos casos a causa real era o foco nativo do
navegador, não a cor. Confirme a camada antes de mexer na cor.

## Escolhas de layout

Escolha o layout a partir do propósito da tela, em vez de impor uma composição
universal:

- Dashboard usa coluna principal + coluna lateral de contexto.
- Chat é um workspace integrado e não exige card externo.
- Caderno usa uma lista de registros com painel de leitura.
- A resolução do Simulado permanece concentrada nas questões.
- Estatísticas é analítica, com seções próprias.

Consistência é visual e comportamental; não exige telas estruturalmente
idênticas nem card flutuante em todas as páginas.

## Diretrizes de implementação

- Inspecione o componente existente e telas aprovadas comparáveis antes de editar.
- Implemente incrementalmente e valide visualmente a cada passo, em vez de
  entregar um redesign inteiro de uma vez.
- Preserve lógica de negócio, contratos de API, navegação, persistência,
  responsividade e acessibilidade.
- Preserve o foco de teclado. Ao remover o outline nativo, substitua-o por um
  anel na identidade vinho.
- Não invente endpoints, dados, métricas ou funcionalidades, nem adicione
  dependências sem necessidade e autorização.
- Referências externas servem para composição, espaçamento, cor e
  microinteração — nunca para introduzir funcionalidade inexistente.

Para uma direção visual substancial, considere uma prévia isolada somente em
DEV antes de alterar um componente real. Preserve a tela real, obtenha
aprovação visual, transfira somente o design aprovado e então remova o
componente temporário. Refinamentos pequenos de espaçamento, tipografia ou
alinhamento não exigem prévia.

## Validação

Para alterações de frontend, execute `npm --prefix frontend run build` e revise
`git diff --check`. Quando uma cor ou estado for crítico, confirme o valor no
CSS compilado em vez de presumir. Verifique visualmente as resoluções
relevantes quando houver navegador disponível e informe as verificações
manuais não realizadas. Siga `.claude/docs/workflow.md` para as regras de Git;
não faça commit ou push sem aprovação explícita.
