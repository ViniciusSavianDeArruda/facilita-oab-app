---
name: facilita-oab-design
description: Use esta skill ao criar ou refinar telas e componentes do Facilita OAB. Preserve a identidade visual, os tokens do Design System e os padrões de interface aprovados no projeto.
---

# Design do Facilita OAB

Use esta skill para implementação visual neste repositório. Ela complementa a
design-review: use design-review para auditar ou planejar; use esta skill para
preservar a identidade estabelecida ao aplicar um refinamento aprovado.

## Fonte de verdade

Leia .claude/docs/design-system.md antes de alterar uma interface de frontend e
consulte frontend/tailwind.config.js para os tokens implementados. Não copie
valores de tokens para esta skill. Se a documentação e a implementação
divergirem, identifique a diferença antes de modificar qualquer uma delas.

## Identidade

Preserve a identidade vinho e bordô, o fundo creme quente da página, as
superfícies claras, os títulos editoriais em Fraunces e o texto de interface em
Manrope. Priorize hierarquia por tipografia e espaçamento, bordas discretas e
sombras suaves somente quando elas apoiarem o agrupamento.

Use a marca reutilizável do aplicativo onde o wordmark for necessário. Não
crie uma nova identidade visual com azul primário genérico, gradientes
chamativos, efeitos de vidro sem justificativa, sombras pesadas, emojis
decorativos ou cards e badges sem propósito claro.

## Escolhas de layout

Escolha o layout a partir do propósito da tela, em vez de impor uma composição
universal:

- Dashboard e telas de plano de estudos podem usar uma superfície principal.
- Chat é um workspace integrado e não exige card externo.
- Caderno usa uma lista de registros com painel de leitura.
- A resolução do Simulado permanece concentrada nas questões.
- Estatísticas é analítica, com seções próprias em vez de um card externo
  obrigatório e excessivamente grande.

Consistência é visual e comportamental; ela não exige telas estruturalmente
idênticas nem um card flutuante em todas as páginas.

## Diretrizes de implementação

- Inspecione o componente existente e telas aprovadas comparáveis antes de editar.
- Reutilize tokens e componentes aprovados quando apropriado.
- Preserve lógica de negócio, contratos de API, navegação, persistência,
  comportamento em desktop e mobile e acessibilidade.
- Não invente endpoints, dados, métricas ou funcionalidades, nem adicione
  dependências sem necessidade e autorização.

Para uma direção visual substancial, considere uma prévia isolada somente em
DEV antes de alterar um componente real. Preserve a tela real, obtenha
aprovação visual, transfira somente o design aprovado e então remova o
componente temporário, o acesso e as referências. Refinamentos pequenos de
espaçamento, tipografia ou alinhamento não exigem prévia.

## Validação

Para alterações de frontend, execute npm --prefix frontend run build e revise
git diff --check. Verifique visualmente as resoluções relevantes quando houver
um navegador disponível e informe as verificações manuais não realizadas. Siga
.claude/docs/workflow.md para as regras de Git; não faça commit ou push sem
aprovação explícita.
