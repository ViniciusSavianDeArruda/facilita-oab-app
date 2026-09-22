# Sistema de design

## Paleta de cores (tailwind.config.js)

- Fundo geral da página: sand-50 (#FBF9F5, ajustável — testado também #FAF2F0 mais rosado)
- Card flutuante principal: branco, border-ink-800, rounded-[22px] a 24px, sombra customizada box-shadow: 0 10px 35px rgba(42,36,34,0.04)
- Cards internos secundários: ink-900 (#FFFBF7)
- Cor primária/destaque: brass (#8B1E3F, vinho/bordô)
- Item ativo na navegação: fundo #F7E4EA, texto brass
- Texto principal: #2A2422
- Texto secundário: #8A7E78 / #5C524D

## Tipografia

- Títulos, números de destaque: serifa (Fraunces) — tom literário/acadêmico
- Corpo, labels, botões: sans-serif (Manrope)

## Padrão de layout

- Desktop: sidebar fixa (~260px) à esquerda, com wordmark "Facilita OAB" ("Facilita" preto, "OAB" vinho) + itens de navegação com ícone
- Mobile: bottom nav
- Todo conteúdo principal de cada tela vive dentro de UM card flutuante único — nunca elementos soltos direto no fundo
- Botões primários: fundo vinho sólido, texto branco
- Links secundários: texto vinho, sem fundo, geralmente com "→"

## Telas já com o design aplicado (branch wip/refinamento-design)

- Início (Inicio.jsx)
- Plano (Cronograma.jsx)
- Ajustar plano (CronogramaConfig.jsx)

## Telas ainda pendentes de aplicar

- Chat, Simulado (landing + execução), Caderno, Estatísticas — já refinadas visualmente em mockup (Google Stitch/Claude Design), aguardando aplicação no código real.

## Fora de escopo por enquanto (exigem backend novo)

Busca global, notificações, menu dropdown de conta, subtítulos temáticos nas tarefas (ex: "Recursos Ordinários"), selo "Ritmo regular de aprovação". Não implementar sem pedido explícito e sem antes desenhar o backend necessário.
