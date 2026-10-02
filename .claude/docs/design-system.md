# Sistema de design — Facilita OAB

Referência visual única do projeto. Descreve os padrões realmente
implementados no frontend; não pressupõe biblioteca de componentes.

**Dashboard (`Inicio.jsx` + `Sidebar.jsx`) e Chat (`Chat.jsx` +
`ChatComposer.jsx`) são a referência visual oficial.** Telas novas devem
reutilizar esses padrões antes de inventar outros.

A fonte final dos valores é `frontend/tailwind.config.js`. Se esta página
divergir dele, o config vence — e esta página deve ser corrigida.

## 1. Identidade

**Editorial jurídico + aplicação moderna.** Quente, refinada, profissional.
A personalidade vem de tipografia, superfície, bordas e espaçamento — nunca
de efeito.

Não deve parecer: SaaS genérico, landing page, interface toda branca/cinza,
interface escura, UI com gradientes, template de IA, painel corporativo azul
ou ornamentação jurídica antiga.

Nunca usar: cinzas frios/azulados, sombras pretas padrão do Tailwind,
`shadow-sm`/`shadow-md`, foco azul do navegador.

### Tipografia

- **Fraunces** (`font-serif`): títulos, números editoriais, destaques.
  Evitar em toda a aplicação.
- **Manrope** (`font-sans`): navegação, labels, botões, corpo, metadados.
- Não importar Newsreader, Plus Jakarta Sans, Playfair ou Cinzel para imitar
  referências externas.

## 2. Paleta final

### Canvas e superfícies

| Papel | Token | Valor |
| --- | --- | --- |
| Página | `sand-50` / `surface-page` / `surface-cream` | `#FAF8F5` |
| Card mestre | `ink-950` / `surface-raised` / `surface-card` | `#FFFFFF` |
| Subcard / superfície interna | `ink-900` / `surface-subtle` | `#FDFCFB` |

A página nunca é branco puro; o branco é superfície de conteúdo.

### Texto

| Papel | Token | Valor |
| --- | --- | --- |
| Principal | `cream-50` / `text-primary` / `surface-dark` | `#1A1816` |
| Secundário | `cream-400` / `text-secondary` / `surface-muted` | `#6E6760` |
| Editorial / metadados | `cream-450` | `#736B63` |
| Muted | `cream-600` / `text-muted` | `#9E978E` |

Não usar preto puro.

### Marca

| Papel | Token | Valor |
| --- | --- | --- |
| Vinho institucional | `brass` / `action-primary` | `#7A1B38` |
| Hover do botão primário | `brass-hover` / `action-hover` | `#64142E` |
| Hover de link editorial | `brass-link-hover` | `#540F24` |
| Rosa de marca (badges/ícones) | `brass-soft` / `action-soft` | `#FDF2F4` |

### Feedback semântico

| Papel | Token | Valor |
| --- | --- | --- |
| Erro | `alert` / `feedback-danger` | `#C23B2E` |
| Sucesso | `feedback-success` | `#10B981` |
| Atenção | `feedback-warning` | `#F59E0B` |

Só aparecem quando representam estado real. Para texto pequeno sobre fundo
claro, o verde usado na prática é `#059669` (contraste suficiente; o
`feedback-success` fica abaixo de 4.5:1).

## 3. Bordas — hierarquia

**Cada papel tem seu token. Nunca reutilizar um por conveniência.**

| Papel | Token | Valor |
| --- | --- | --- |
| Borda de card mestre | `ink-800` / `surface-border` / `border-default` | `#EAE4DC` |
| Borda de subcard | `surface-border-subtle` | `#E8DCCA` |
| Borda de botão outlined | `surface-border-button` | `#E2DBD0` |
| Hover de borda de **subcard** | `surface-border-hover` | `#DFD7CB` |
| Hover de borda de **botão** | `surface-border-button-hover` | `#E6DED3` |
| Divisor | `border-subtle` | `#F0EAE1` |
| Trilha de progresso | `surface-track` | `#EFEAE2` |
| Borda de controle (checkbox) | `ink-700` | `#D8CCBD` |

> `border-subtle` (`#F0EAE1`, divisor) e `surface-border-subtle` (`#E8DCCA`,
> borda de subcard) têm nomes parecidos e papéis diferentes. Conferir qual é
> antes de usar.

As bordas são **deliberadamente quentes**. Neutros muito dessaturados foram
percebidos como cinza azulado várias vezes durante o redesign — é o erro
mais recorrente do projeto. Não voltar a cinzas frios.

### Caixa dentro de caixa

Em listas e estruturas tabulares, **preferir divisor horizontal a borda
completa**. "Matérias que pedem atenção" é a referência: cada linha é
`px-1 py-3` com `border-b border-border-subtle`, sem borda completa, sem
radius próprio e sem fundo no estado normal — o último item não leva
divisor.

Subcards com borda completa só se justificam quando o item é um bloco
autônomo, como os itens de "Foco de hoje".

## 4. Superfícies interativas

### Card mestre

```
bg-ink-950 border border-ink-800 rounded-2xl p-4 sm:p-5
```

16px de radius, **sem sombra**. A hierarquia vem de espaçamento, tamanho,
tipografia, agrupamento e bordas. Cards de métrica/KPI seguem o mesmo
padrão (16px, sem sombra).

### Subcard interativo

```
bg-ink-900 border border-surface-border-subtle rounded-xl p-3
hover:bg-surface-subcard-hover hover:border-surface-border-hover
hover:shadow-subcard-hover
transition-[background-color,border-color,box-shadow] duration-200 ease-editorial
```

Hover vai para branco (`#FFFFFF`) com borda `#DFD7CB` e sombra
`0 4px 14px rgba(122,27,56,0.04)`. Sem `translateY`, sem `scale`, sem
brilho. A transição anima **apenas** as propriedades afetadas — nunca
`transition-all`.

Quando um controle interno reage ao conjunto (ex.: o checkbox de "Foco de
hoje"), usar `group` no container e `group-hover:` no controle.

## 5. Botões primários

```
bg-brass text-ink-950 shadow-btn-primary
hover:bg-brass-hover hover:shadow-btn-primary-hover
rounded-lg
```

`#7A1B38` com texto branco, 8px de radius, sombra
`0 1px 3px rgba(122,27,56,0.15)` que vai a `0 2px 6px rgba(122,27,56,0.25)`
no hover. Reservado a ações realmente principais — não transformar toda
ação em botão vinho.

A seta interna pode mover 3px no hover, usando group nomeado para o botão
não se deslocar junto:

```
group/btn  →  group-hover/btn:translate-x-[3px]
```

## 6. Botões secundários / outlined

**Padrão obrigatório em telas novas.**

| Estado | Fundo | Borda | Texto |
| --- | --- | --- | --- |
| Normal | `ink-950` `#FFFFFF` | `surface-border-button` `#E2DBD0` | `cream-50` `#1A1816` |
| Hover | `surface-button-hover` `#FBF9F6` | `surface-border-button-hover` `#E6DED3` | `brass` `#7A1B38` |

Radius 8px (`rounded-lg`), **sem sombra**, transição de 150ms `ease-out`
limitada a `background-color`, `border-color` e `color`.

Base compartilhada:

```
appearance-none inline-flex items-center gap-1.5 min-h-9 px-3.5 py-2
rounded-lg text-[13px] font-medium
transition-[background-color,border-color,color] duration-150 ease-out
focus:outline-none focus-visible:outline-none active:outline-none
focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass
```

Aplicado em: Nova conversa (desktop e mobile), Salvar no caderno, Tentar
novamente, Revisar, Abrir notas, Começar, chips de sugestão e as ações
rápidas do estado vazio do Chat.

**Não usar rosa (`#FAF0F2`, `brass-soft`) como hover genérico de botão.** O
rosa fica reservado a pills, badges, superfícies de marca discretas e
estados específicos.

**Nunca reutilizar `surface-border-hover` (subcard) em botão.** São dois
tokens distintos justamente para que ajustar um não arraste o outro.

## 7. Links editoriais

Exemplos: "Ver plano completo", "Ver todas", "Ver histórico", "Ajustar
cronograma".

```
text-brass hover:text-brass-link-hover hover:underline
```

Normal `#7A1B38`, hover `#540F24` com underline quando couber. **Sem fundo,
sem borda, sem padding horizontal** que dê aparência de botão. Se for link
textual, não deve virar pill.

## 8. Pills e badges

**Pill de data/turno** (cabeçalho do Dashboard) — detalhe editorial, não
badge chamativo:

```
bg-surface-pill border border-surface-pill-border rounded-full
px-3.5 py-1.5 gap-2 w-fit
```

`#FCF6F7` com borda `#F0D9DE`, **sem sombra**. Dentro: data em
`text-[11px] font-semibold uppercase tracking-[0.14em] text-brass`,
separador `•` em `text-brass/[0.35]`, ícone a 60% e turno em `cream-450`.
Todos com `leading-none`.

**Badges de categoria** podem usar cor secundária suave **desde que a cor
represente informação real**. No Dashboard, derivada de `item.tipo`:

| Tipo real | Badge |
| --- | --- |
| `revisar` → "Revisão" | `bg-blue-50 text-blue-700` |
| `caderno` → "Caderno" | `bg-amber-50 text-amber-700` |
| `simulado` → "Simulado" | `bg-brass-soft text-brass` |

Pills de status não reutilizam o hover de botão outlined.

## 9. Sombras

Regra geral: **evitar `shadow-sm`/`shadow-md` e qualquer rgba preto.** As
sombras do projeto são todas vinho, de opacidade baixa.

| Elemento | Sombra |
| --- | --- |
| Card mestre e métricas | nenhuma |
| Subcard normal | nenhuma |
| Subcard hover | `shadow-subcard-hover` `0 4px 14px rgba(122,27,56,0.04)` |
| Botão primário | `shadow-btn-primary` `0 1px 3px rgba(122,27,56,0.15)` |
| Botão primário hover | `shadow-btn-primary-hover` `0 2px 6px rgba(122,27,56,0.25)` |
| Item ativo da sidebar | `shadow-nav-active` `0 2px 6px rgba(122,27,56,0.20)` |
| Composer do Chat | `shadow-[0_4px_16px_rgba(26,24,22,0.04)]` |
| Botão outlined | nenhuma |

## 10. Radius

| Elemento | Radius |
| --- | --- |
| Card mestre, métricas | 16px (`rounded-2xl`) |
| Subcard | 12px (`rounded-xl`) |
| Botões | 8px (`rounded-lg`) |
| Composer | 16px (`rounded-2xl`) |
| Pill | `rounded-full` |
| Tag pequena | ~6px (`rounded`) |

## 11. Transições

```
transitionTimingFunction.editorial = cubic-bezier(0.16, 1, 0.3, 1)
```

- Subcards: 200ms `ease-editorial`
- Botões outlined: 150ms `ease-out`
- Hover de navegação: 200ms `ease-in-out`

Sempre listar as propriedades animadas (`transition-[background-color,…]`)
em vez de `transition-all`. Evitar bounce, `scale`, translações grandes,
glow e efeito de vidro.

## 12. Sidebar

`w-72` (288px), `bg-sand-50`, `border-r border-ink-800`, `p-5`.

O item de navegação leva `border border-transparent` na base, para a borda
do hover não deslocar o layout:

| Estado | Fundo | Borda | Texto |
| --- | --- | --- | --- |
| Inativo | transparente | transparente | `cream-400` `#6E6760` |
| Hover | `surface-nav-hover` `#F2ECE2` | `surface-nav-hover-border` `#EAE4DC` | `cream-50` `#1A1816` |
| Ativo | `brass` `#7A1B38` + `shadow-nav-active` | — | branco |

O ativo é o maior contraste da navegação. Ícones acompanham `currentColor`.
Evitar hover branco, hover azul, vinho em todos os itens, `scale` e
animação chamativa.

Mobile usa `BottomNav.jsx`. Breakpoint estrutural é `md`.

## 13. Chat — referência oficial

### Eixo de leitura

Conversa, resposta do mentor e composer compartilham `max-w-[860px]`. A
mensagem do usuário usa `max-w-[68%]`.

### Histórico lateral

Coluna de `270px`, `bg-ink-900`, altura total, à esquerda da área principal.

- Títulos **inativos escuros** (`cream-50`), 13px — a hierarquia vem do
  fundo e do peso da ativa, nunca de apagar o título.
- Datas em `cream-600`, 10px.
- Ativa: `bg-brass-soft` + `border-brass/25` + título vinho medium. **Nunca
  vinho sólido.**
- Grupos "HOJE"/"ANTERIORES": 10px uppercase em `cream-400`.
- Scrollbar discreta: `#DFD7CB`, 4px (`.chat-scrollbar`, `.conversas-scrollbar`).

### Sugestões rápidas

Chips compactos no padrão de botão outlined, centralizados na largura de
leitura. **Sem faixa de fundo nem borda horizontal** — não devem parecer uma
segunda navbar abaixo do header.

Só aparecem enquanto `messages.length === 0` (via `isEmpty`). Assim que a
conversa começa, somem junto com o estado vazio.

### Estado vazio

Coluna única `mx-auto w-full max-w-[640px]`, centralizada verticalmente na
área útil com `min-h-full flex flex-col justify-center` **apenas quando
vazio**. Ícone, eyebrow, título e descrição centralizados; ações rápidas e
bloco de ajuda em `w-full`, alinhados à mesma coluna.

Ações rápidas: 3 cards outlined em `sm:grid-cols-3`, título + subtítulo,
que apenas preenchem o composer via `fillInput` — sem endpoint novo.

"Como o mentor pode ajudar": seção editorial com `border-t border-border-subtle`
e `pt-4`, fundo transparente, sem radius e sem sombra. Capacidades
numeradas (`01`–`04`) em Fraunces vinho a 50%, grid 2×2 no desktop.
**Não é feature card.**

### Composer

Mesma largura da conversa, `bg-ink-950`, borda de botão outlined,
`rounded-2xl`, sombra `0 4px 16px rgba(26,24,22,0.04)`. Foco leva a borda a
vinho, sem glow e sem azul. **Sem `border-top` atravessando a tela** — deve
flutuar sobre o canvas, não ancorar como barra.

Botão enviar circular: `bg-brass` quando habilitado,
`disabled:bg-ink-800 disabled:text-cream-600` (bege quente) quando vazio.
Texto auxiliar abaixo em 10px centralizado.

### Mensagens

**Usuário:** bubble `bg-brass` com texto branco, `rounded-2xl rounded-br-md`,
largura contida.

**Mentor:** card editorial branco com borda quente e `rounded-2xl`.
Cabeçalho próprio ("MENTOR JURÍDICO • IA ESPECIALIZADA") separado por
divisor, markdown no corpo, e rodapé separado por divisor com "Salvar no
caderno" no padrão outlined. **Não é bolha cinza.**

### Markdown

Estilizado em `index.css` (`.markdown`). Regra central: **estilizar apenas
os elementos que o markdown já produz** — nunca interpretar o conteúdo da
IA em JS para inventar seções como "Ponto de atenção" ou "Top temas".

- Parágrafo: `margin-bottom: 1.1em`, `line-height: 1.75`
- Listas: `margin-left: 1.5em`, item `0.5em` / 1.7
- Títulos: Fraunces, `mt-7 mb-2.5`, weight 600
- `strong`: `text-cream-50 font-semibold` — **destaque por peso, não por
  cor**; o vinho fica para links e títulos
- `blockquote`: faixa editorial com `border-l-2 border-brass` + `bg-ink-900`
- `code`: `bg-ink-900` + `border-border-subtle`
- Tabelas: divisores `border-subtle`

## 14. Questão para revisão

Quando a pessoa chega do caderno/simulado para revisar uma questão, a
mensagem **não** é renderizada como bubble vinho gigante: vira bloco
editorial de contexto.

Reconhecimento em `lib/revisaoQuestao.js`. O Chat recebe só a string do
prompt — não há tipo estruturado na mensagem persistida. O parser reconhece
o template determinístico gerado por `App.discussWithMentor` e **devolve
`null` diante de qualquer divergência**, caindo no bubble normal. Nenhuma
mensagem comum quebra.

> O parser espelha um template que mora em `App.jsx`. Se a frase mudar lá e
> não aqui, o bloco degrada para bubble. A blindagem seria extrair o
> template para o módulo e fazer o `App` importar o builder.

Estrutura: cabeçalho "QUESTÃO PARA REVISÃO" → Enunciado → Sua resposta +
Gabarito lado a lado → anotação (se houver) → pedido final separado por
divisor.

Card branco, borda `#EAE4DC`, **borda esquerda 3px vinho**, `rounded-2xl`.

Os dois cards comparativos são **irmãos de mesma base neutra**
(`bg-ink-900` + `border-ink-800`). O status aparece só em três detalhes:

- badge 10px uppercase ("Incorreta" / "Correta")
- ícone semântico (`XCircleIcon` / `CheckCircleIcon`)
- acento de 2px na borda esquerda

Erro em `alert` `#C23B2E`, acerto em `#059669`. **Nunca pintar o card
inteiro** — o objetivo é mostrar o que foi marcado e o que era o gabarito
sem virar tela de erro.

## 15. Checklist para telas novas

Antes de criar qualquer tela:

1. Usar tokens existentes; não criar hex solto sem justificativa.
2. Classificar cada elemento: card mestre, subcard, linha editorial, botão
   primário, botão outlined, link textual ou pill/status.
3. Evitar caixa dentro de caixa — em listas, divisor em vez de borda
   completa.
4. Não usar rosa como hover genérico de botão.
5. Não usar `shadow-sm`/`shadow-md` nem rgba preto.
6. Não usar cinza ou azul frio em borda, fundo ou foco.
7. Manter Fraunces + Manrope nos papéis corretos.
8. Preservar foco de teclado acessível, sempre em vinho.
9. Reutilizar os padrões de `Inicio.jsx` e `Chat.jsx`.
10. Não inventar dado ou funcionalidade para imitar referência externa.

## 16. Dados reais e referências externas

Referências visuais externas (Stitch e similares) servem para composição,
tipografia, espaçamento, cor, bordas e microinteração — **nunca para
introduzir funcionalidade ou dado inexistente**.

Não copiar: Pomodoro, streak, horas estudadas não calculadas, ranking,
tópicos de edital, previsão de conclusão, contagens fictícias de questões,
paginação sem endpoint, badges de exame ou qualquer ação sem backend.

O objetivo nunca é reproduzir uma tela inteira: a referência é adaptada à
arquitetura atual, aos dados reais e às fontes do projeto.

Também não introduzir sem pedido explícito e sem backend: busca global,
notificações, menu dropdown de conta ou subtítulos temáticos inventados.

## 17. Estados e controles

- Campos usam `bg-ink-900 border border-ink-800`.
- Disabled: opacidade ou superfície/texto atenuados, e deve bloquear a
  interação.
- Loading é comunicado pelo rótulo ("Entrando…", "Importando…").
- O padrão de `focus-visible` em vinho vale para Dashboard e Chat;
  componentes antigos ainda não o adotaram — inspecionar antes de presumir.

## 18. Pendências conhecidas

- A escala `brand-*` (50–950) e as sombras `card-subtle`, `card-hover` e
  `pill` existem no config e **não são usadas por nenhum componente**.
  Sobraram do estudo da referência Stitch. Remover em limpeza autorizada.
- `cream-200` (`#3A342F`) ficou com uso residual após o texto do botão
  outlined migrar para `cream-50`.
- Telas fora de Dashboard e Chat (Caderno, Cronograma, Simulado,
  Estatísticas, Login, QuestionCard) ainda usam `brass-dim` e as
  superfícies antigas. Serão alinhadas gradualmente — ao tocar numa delas,
  migrar para os padrões desta página.
