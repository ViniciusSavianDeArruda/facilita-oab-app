# Sistema de design — Facilita OAB

Referência visual única do projeto. Descreve os padrões realmente
implementados no frontend; não pressupõe biblioteca de componentes.

**O Dashboard (`frontend/src/components/Inicio.jsx`) e a Sidebar
(`frontend/src/components/Sidebar.jsx`) são a referência visual principal do
produto.** Telas novas e refinamentos devem ser comparados a eles.

## Direção visual

A personalidade é **editorial jurídica**: vem de tipografia, do vinho
institucional, dos fundos creme, do espaçamento e de linhas e bordas quentes.
Não se compensa falta de personalidade com gradientes, sombras grandes, cards
coloridos, excesso de ícones ou animação chamativa.

Ao mesmo tempo, a interface é **uma aplicação, não um site**: sidebar
persistente no desktop, navegação funcional, conteúdo em áreas, cards para
agrupamento real, ações próximas do conteúdo relacionado e estados reais do
produto. Telas não são redesenhadas como páginas institucionais ou landing
pages.

O resultado deve parecer uma plataforma de estudos jurídica premium,
contemporânea e funcional — e não: dashboard SaaS genérico, interface toda
branca/cinza, interface escura, UI com gradientes, excesso de sombras,
template de IA, painel corporativo azul ou ornamentação jurídica antiga.

## Paleta e tokens

Valores reais de `frontend/tailwind.config.js`. Os nomes legados (`sand`,
`ink`, `cream`, `brass`) seguem válidos e são usados em todo o app; os aliases
semânticos (`surface`, `text`, `border`, `action`) apontam para os mesmos
valores.

### Superfícies

| Papel | Token | Valor |
| --- | --- | --- |
| Fundo da página | `sand-50` / `surface-page` / `surface-cream` | `#FAF8F5` |
| Card principal | `ink-950` / `surface-raised` / `surface-card` | `#FFFFFF` |
| Subcard / linha interna | `ink-900` / `surface-subtle` | `#FDFCFB` |

A página **não** é branco puro, e o branco é superfície de conteúdo — não deve
dominar a tela.

### Vinho institucional

| Papel | Token | Valor |
| --- | --- | --- |
| Vinho principal | `brass` / `action-primary` | `#7A1B38` |
| Vinho hover | `brass-hover` / `action-hover` | `#64142E` |
| Rosa suave (fundos de ícone/badge) | `brass-soft` / `action-soft` | `#FDF2F4` |
| Vinho claro legado | `brass-dim` / `action-muted` | `#A8536A` |

### Texto

| Papel | Token | Valor |
| --- | --- | --- |
| Principal | `cream-50` / `text-primary` / `surface-dark` | `#1A1816` |
| Botão secundário | `cream-200` | `#3A342F` |
| Secundário | `cream-400` / `text-secondary` / `surface-muted` | `#6E6760` |
| Editorial auxiliar (metadados) | `cream-450` | `#736B63` |
| Muted | `cream-600` / `text-muted` | `#9E978E` |

Não usar preto puro.

### Bordas

As bordas foram **deliberadamente aquecidas**. Neutros muito dessaturados
estavam sendo percebidos como cinza azulado, e esse foi um problema recorrente
durante o redesign. Não voltar a usar cinzas frios.

| Papel | Token | Valor |
| --- | --- | --- |
| Borda geral de cards | `ink-800` / `surface-border` / `border-default` | `#EAE4DC` |
| Borda de subcard | `surface-border-subtle` | `#E8DCCA` |
| Borda de botão secundário | `surface-border-button` | `#E8DDCD` |
| Borda em hover (subcard/controle) | `surface-border-hover` | `#DFD7CB` |
| Borda de controle (checkbox) | `ink-700` / `border-subtle` | `#D8CCBD` |
| Borda interna legada | `border-subtle` (alias `border`) | `#F0EAE1` |

### Hovers por papel

Cada superfície tem seu próprio tom de hover; eles **não** compartilham valor.

| Papel | Token | Valor |
| --- | --- | --- |
| Subcard | `surface-subcard-hover` | `#F7F3EC` |
| Item inativo da sidebar | `surface-nav-hover` | `#F1EFEC` |
| Borda do item inativo da sidebar | `surface-nav-hover-border` | `#E6E1DB` |
| Botão secundário | `surface-button-hover` | `#FAF5F6` |

### Pill editorial e feedback

| Papel | Token | Valor |
| --- | --- | --- |
| Fundo da pill de data/turno | `surface-pill` | `#F8EDEF` |
| Borda da pill | `surface-pill-border` | `#F2D7DD` |
| Erro / destrutivo | `alert` / `feedback-danger` | `#C23B2E` |
| Sucesso | `feedback-success` | `#10B981` |
| Atenção | `feedback-warning` | `#F59E0B` |

Verde, âmbar e vermelho só aparecem quando representam estado real
(desempenho, conclusão, erro) — nunca como decoração.

## Tipografia

- **Fraunces** (`font-serif`): saudação, títulos relevantes, números de
  destaque e alguns elementos editoriais. Evitar Fraunces em toda a aplicação.
- **Manrope** (`font-sans`): navegação, labels, botões, textos, metadados,
  badges e interface em geral.
- Não importar Playfair Display, Newsreader, Plus Jakarta Sans ou outra fonte
  apenas para reproduzir uma referência externa.
- Títulos de página usam Fraunces `text-3xl` (`md:text-4xl` quando houver
  ênfase), com `leading-tight tracking-tight`. Títulos internos usam `text-xl`
  ou `text-2xl`; corpo usa `text-sm`; metadados usam `text-xs`.
- Rótulos em caixa alta usam `text-[11px]` com tracking amplo; `text-[10px]` e
  `text-[9px]` ficam reservados a contextos densos.
- Títulos de destaque podem usar variação óptica da Fraunces (`opsz`).

## Marca

- `frontend/src/components/Brand.jsx` reúne o símbolo de balança, a Fraunces e
  o wordmark. "Facilita" usa a cor de texto principal; "OAB" usa o vinho.
- As variantes de tamanho atendem Sidebar, Início em mobile e Login.
- `frontend/public/favicon.svg` usa somente a balança em vinho.

## Cabeçalho do Dashboard (referência de identidade)

### Pill de data + turno

Uma única pill contém data, separador e turno — um detalhe editorial, não um
badge chamativo:

```
bg-surface-pill border border-surface-pill-border rounded-full
px-3.5 py-1.5 gap-2 w-fit shadow-[0_1px_2px_rgba(122,27,56,0.04)]
```

- Data: `text-[11px] font-semibold uppercase tracking-[0.14em] text-brass`.
- Separador `•`: `text-brass/[0.35] text-xs select-none`.
- Ícone do turno: `h-3.5 w-3.5 shrink-0 text-brass`, muda conforme o horário.
- Turno: `text-xs font-normal text-cream-450`.
- Todos os três blocos usam `leading-none`.

### Saudação

Fraunces, com `font-medium` e texto principal quente; o nome em
`font-semibold italic text-brass`, seguido de um traço SVG artesanal:

```
absolute -bottom-1.5 left-0 h-[7px] w-full overflow-visible
text-brass/75 · viewBox="0 0 120 8" · preserveAspectRatio="none"
strokeWidth 2.5 · pointer-events-none · aria-hidden
```

`preserveAspectRatio="none"` faz o traço acompanhar nomes de qualquer
tamanho. O nome vem de dados reais e tem fallback. O traço é sutil — não deve
virar decoração.

## Sidebar (navegação desktop)

`w-72` (288px), `bg-sand-50`, `border-r border-ink-800`, `p-5`.

O item de navegação usa `border border-transparent` na base, para a borda do
hover não deslocar o layout:

| Estado | Fundo | Borda | Texto |
| --- | --- | --- | --- |
| Inativo | transparente | transparente | `cream-400` |
| Hover | `surface-nav-hover` | `surface-nav-hover-border` | `cream-50` |
| Ativo | `brass` | — | branco |

O item ativo é o ponto de maior contraste da navegação. Os ícones acompanham
`currentColor`. Evitar hover branco, hover azul, vinho em todos os itens,
sombras, `scale` e animação chamativa.

Mobile usa bottom navigation (`BottomNav.jsx`). O breakpoint estrutural é
`md`; `sm` ajusta densidade e grids compactos.

## Cards

```
bg-ink-950 border border-ink-800 rounded-2xl p-4 sm:p-5
```

Blocos compactos do cabeçalho (ex.: "Próxima prova") usam `rounded-xl p-3`.

Cards não devem parecer flutuando. A hierarquia vem de espaçamento, tamanho,
tipografia, agrupamento e bordas — **não** de sombra pesada. O Dashboard atual
não usa sombra nos cards.

Nem toda tela precisa de card flutuante único: Plano e telas de configuração
usam esse padrão, enquanto Caderno, Estatísticas e Simulado privilegiam
densidade ou leitura. Chat e Início são exceções full-bleed (`w-full
max-w-[1600px] mx-auto`, sem card externo), com blocos internos usando as
superfícies padrão. No Chat, mensagens e composer preservam `max-w-[800px]`.

## Subcards e linhas interativas

Padrão aprovado em "Foco de Hoje" e "Matérias que pedem atenção":

```
bg-ink-900 border border-surface-border-subtle rounded-xl p-3
hover:bg-surface-subcard-hover hover:border-surface-border-hover
transition-colors duration-200 ease-in-out
```

A interação deve ser percebida sem o elemento "pular": nada de `translateY`,
`scale`, sombra forte, brilho ou hover escuro.

Quando a linha contém um controle que reage ao conjunto (ex.: o checkbox de
"Foco de Hoje"), use `group` no container e `group-hover:` no controle — o
checkbox usa `w-5 h-5 border-2 border-ink-700` e vira `group-hover:border-brass`.

## Botões

### Primário

```
bg-brass text-ink-950 hover:bg-brass-hover
focus-visible:ring-2 focus-visible:ring-brass/40
```

Reservado a ações realmente principais. Não transformar toda ação em botão
vinho.

### Secundário outlined

```
bg-ink-950 border border-surface-border-button text-cream-200
hover:bg-surface-button-hover hover:border-brass hover:text-brass
focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass
```

Base comum aos dois níveis:

```
appearance-none inline-flex items-center gap-1.5 min-h-9 px-3.5 py-2
rounded-lg text-[13px] font-medium transition-all duration-200 ease-in-out
focus:outline-none focus-visible:outline-none active:outline-none
```

`appearance-none` e os três `outline-none` existem para remover o estilo
nativo e o foco azul do navegador. **O foco de teclado permanece acessível e
usa a identidade vinho** — nunca o azul padrão. Não remover o anel de foco sem
substituí-lo.

Setas em botões usam group nomeado para mover só a seta:
`group/btn` no botão e `group-hover/btn:translate-x-[3px]` na seta
(`transition-transform duration-200 ease-in-out`, `aria-hidden`).

## Vinho como acento

`#7A1B38` é o acento principal: navegação ativa, CTA principal, links
importantes, labels selecionadas, detalhes editoriais, ícones de destaque,
progresso, nome na saudação e pequenos marcadores.

Não usar vinho em grandes blocos sem necessidade. O Dashboard funciona porque
o vinho aparece em pontos estratégicos sobre base clara e quente.

## Badges

Badges podem introduzir cores secundárias muito suaves para comunicar
categorias, desde que **a cor represente informação real**. No Dashboard, a
categoria vem de `item.tipo`:

| Tipo real | Badge |
| --- | --- |
| `revisar` → "Revisão" | `bg-blue-50 text-blue-700` |
| `caderno` → "Caderno" | `bg-amber-50 text-amber-700` |
| `simulado` → "Simulado" | `bg-brass-soft text-brass` |

Não criar badge fictício para decorar nem transformar a interface em coleção
de cores.

## Ícones

SVGs simples, traço fino, `currentColor`, cerca de 16–20px em navegação e
ações. O ícone apoia a leitura; não preencher espaço com ícones.

## Microinterações

Movimento sutil, funcional e previsível. Preferir `transition-colors`,
`duration-200`, `ease-in-out`. Quando houver movimento: deslocamento de poucos
pixels, alteração leve de borda, mudança sutil de fundo.

Evitar bounce, `scale` excessivo, grandes translações, glow, efeito de vidro e
animação decorativa constante.

## Grid e composição

O Dashboard é a referência de composição desktop: sidebar à esquerda, área
central ampla, header horizontal e conteúdo em coluna principal + coluna
lateral, com a principal maior:

```
grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(280px,0.8fr)]
esquerda → Foco de Hoje + Matérias
direita  → Progresso Geral + Atividade Recente
```

É referência de hierarquia, não regra universal: outras telas podem ter
composições diferentes quando o conteúdo exigir.

A página padrão usa `px-4 py-6` no mobile e `px-8`/`px-10` com `py-8`/`py-10`
no desktop. Conteúdo focado usa `max-w-xl`; questões e resultados usam
`max-w-2xl`. Controles compactos usam `rounded-lg`; campos e ações principais,
`rounded-xl`.

## Densidade

A interface deve respirar. Evitar dezenas de cards pequenos, informação
duplicada, KPIs sem utilidade, números fictícios e excesso de divisórias.

O Dashboard mostra **somente métricas reais existentes** — os indicadores são
montados condicionalmente e só aparecem quando há dado. Manter essa regra.

## Dados reais e referências externas

Referências visuais externas (Stitch e similares) podem ser usadas para
composição, tipografia, espaçamento, cores, bordas e microinterações — **mas
nunca para introduzir funcionalidades ou dados inexistentes** no Facilita OAB.

Não copiar de referências: Pomodoro, streak, horas estudadas não calculadas,
ranking, tópicos de edital, previsão de conclusão, contagens fictícias de
questões, paginação sem endpoint ou qualquer ação sem backend.

O objetivo não é reproduzir uma tela inteira literalmente. A referência é
adaptada à arquitetura atual, à identidade Facilita OAB, aos dados reais, às
fontes Fraunces + Manrope e aos componentes existentes.

Também não introduzir sem pedido explícito e sem backend correspondente: busca
global, notificações, menu dropdown de conta ou subtítulos temáticos
inventados para tarefas.

## Estados e controles

- Campos usam `bg-ink-900 border border-ink-800`.
- Disabled é representado por opacidade ou superfície/texto atenuados, e deve
  bloquear a interação.
- Loading é comunicado pelo rótulo da ação ("Entrando…", "Importando…").
- O padrão de `focus-visible` documentado acima vale para os botões do
  Dashboard; componentes antigos ainda não o adotaram — inspecionar o código
  antes de presumir.

## Pendências conhecidas

- Os tokens `boxShadow` (`card-subtle`, `card-hover`, `pill`) e a escala
  `brand-*` (50–950) existem no config mas **não são usados** por nenhum
  componente. Foram criados durante o estudo da referência Stitch e a direção
  final dispensou sombras e manteve `brass`. Remover quando houver uma rodada
  de limpeza autorizada.
- `border-subtle` (`#F0EAE1`, usado por Caderno) e `surface-border-subtle`
  (`#E8DCCA`, usado pelos subcards do Dashboard) têm nomes parecidos e valores
  diferentes. Preferir o segundo em telas novas.
- `frontend/src/index.css` ainda tem `#8B1E3F` e `#6F1731` hardcoded na
  scrollbar do Chat — são o vinho **antigo**, anterior a `#7A1B38`.
- Telas fora do Dashboard ainda usam `brass-dim` e as superfícies antigas;
  elas serão alinhadas gradualmente.
