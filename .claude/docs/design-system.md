# Sistema de design — Facilita OAB

Esta é a referência visual única do projeto. Ela descreve os padrões
implementados no frontend e não pressupõe uma biblioteca de componentes.

## Paleta e tokens

Os tokens originais em `frontend/tailwind.config.js` continuam compatíveis com
as classes existentes e são a fonte da identidade visual.

| Grupo | Tokens | Uso atual |
| --- | --- | --- |
| `sand` | `50 #FBF9F5`, `100 #EFECE6` | fundo quente da aplicação |
| `ink` | `950 #FFFFFF`, `900 #FFFBF7`, `800 #EBE3DA`, `700 #D8CCBD` | superfícies claras e bordas |
| `cream` | `50 #2A2422`, `400 #5C524D`, `600 #8A7E78` | texto primário, secundário e discreto |
| `brass` | `#8B1E3F`, `hover #6F1731`, `dim #A8536A` | ação e destaque vinho/bordô |
| `alert` | `#C23B2E` | erro e ação destrutiva |

### Aliases semânticos

Os aliases abaixo foram adicionados para migração gradual. Não substituem nem
renomeiam os tokens anteriores.

| Função | Alias Tailwind | Token/valor existente equivalente |
| --- | --- | --- |
| Fundo da página | `bg-surface-page` | `sand-50` / `#FBF9F5` |
| Superfície elevada | `bg-surface-raised` | `ink-950` / `#FFFFFF` |
| Superfície sutil | `bg-surface-subtle` | `ink-900` / `#FFFBF7` |
| Texto | `text-text-primary`, `text-text-secondary`, `text-text-muted` | `cream-50`, `cream-400`, `cream-600` |
| Borda | `border-border-default`, `border-border-subtle` | `ink-800`, `ink-700` |
| Ação | `bg-action-primary`, `hover:bg-action-hover`, `text-action-muted` | `brass`, `brass-hover`, `brass-dim` |
| Feedback | `text-feedback-danger`, `text-feedback-success`, `text-feedback-warning` | `alert`, `#10B981`, `#F59E0B` |

Os aliases de feedback aceitam o prefixo apropriado à propriedade, como
`bg-feedback-success` ou `border-feedback-danger`. Verde e âmbar correspondem
às cores de desempenho já usadas no frontend; não constituem uma paleta nova.

Também existem aplicações locais de apoio: o item ativo da navegação usa fundo
`#F7E4EA` com texto `brass`, e gráficos podem usar cores próprias. Antes de
transformar esses valores em tokens, confirmar repetição e necessidade real.

## Tipografia

- **Fraunces** (`font-serif`) é a fonte do wordmark, títulos e números de
  destaque; preserva o tom literário/acadêmico da interface.
- **Manrope** (`font-sans`) é a fonte de corpo, rótulos, navegação, campos e
  botões.
- Títulos de página usam normalmente Fraunces `text-3xl`, com
  `leading-tight tracking-tight`. Contextos de maior ênfase usam `text-4xl` e
  indicadores podem chegar a `text-6xl`.
- Títulos internos usam em geral `text-xl` ou `text-2xl`; corpo usa
  principalmente `text-sm`; metadados usam `text-xs`.
- Rótulos em caixa alta usam `text-[11px] tracking-widest`; usos mais compactos
  de `text-[10px]` e `text-[9px]` ficam reservados a contextos densos.
- Títulos de destaque podem usar variação óptica da Fraunces (`opsz`).

## Layout, superfícies e containers

- Desktop usa sidebar à esquerda (`w-60`, aproximadamente 240px), com wordmark
  “Facilita OAB”: “Facilita” em texto primário e “OAB” em vinho.
- Mobile usa bottom navigation. O breakpoint estrutural principal é `md`; `sm`
  é usado para ajustes de densidade e grids compactos.
- A página padrão usa `px-4 py-6` no mobile e `px-8 py-8` ou `py-10` no
  desktop.
- Conteúdo focado usa `max-w-xl`; questões e resultados usam `max-w-2xl`;
  listas densas podem ser mais amplas.
- Cards internos usam `bg-ink-900 border border-ink-800 rounded-2xl`.
  Superfícies principais destacadas usam `bg-ink-950`, geralmente com
  `rounded-3xl` e sombra sutil.
- Controles compactos usam `rounded-lg`; campos e ações principais usam
  `rounded-xl`.

Nem toda tela deve ser forçada a um card flutuante único: Início, Plano e
algumas telas de configuração usam esse padrão, enquanto Caderno,
Estatísticas e Simulado privilegiam densidade ou leitura. O Chat é uma exceção
intencional full-bleed: a estrutura ocupa a área disponível, mas mensagens e
composer preservam largura de leitura de `max-w-[800px]`.

## Ações e estados interativos

- Botões primários usam fundo `brass`, texto claro (`ink-950`) e hover
  `brass-hover`.
- Ações secundárias usam borda `ink-800`, texto secundário e hover de borda em
  `brass-dim`.
- Links secundários usam vinho, sem fundo, frequentemente acompanhados de `→`.
- Campos usam `bg-ink-900 border border-ink-800`; os campos já existentes
  alteram a borda para `brass-dim` no foco.
- Disabled é representado conforme o contexto por opacidade ou por
  superfície/texto atenuados; controles devem também bloquear interação.
- Loading é comunicado pelo rótulo da ação, como “Entrando…” ou
  “Importando…”.
- Ainda não há padrão global de `focus-visible`; não presumir que ele exista
  em componentes sem inspecionar o código.

## Escopo visual e do produto

Não introduzir sem pedido explícito e sem o backend correspondente: busca
global, notificações, menu dropdown de conta, subtítulos temáticos de tarefas
(por exemplo, “Recursos Ordinários”) ou selo “Ritmo regular de aprovação”.

Ao refinar uma tela, preservar os fluxos e dados existentes. Não usar o design
para simular informações ou funcionalidades que não existam no backend.
