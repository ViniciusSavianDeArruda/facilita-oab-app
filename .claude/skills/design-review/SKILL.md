---
name: design-review
description: Use esta skill para auditar interfaces web, avaliar hierarquia visual, usabilidade, acessibilidade, responsividade e consistência. Aplique antes de propor ou implementar refinamentos de UI/UX.
---

# Auditoria de design

Use esta skill para auditar uma interface web existente ou planejar um
refinamento de UI/UX antes da implementação. Investigue o produto real e
apresente evidências; não presuma dados, componentes, comportamentos ou
restrições técnicas.

A referência visual do produto é o Dashboard (`Inicio.jsx`) com a Sidebar, e a
fonte de verdade é `.claude/docs/design-system.md`. Leia os dois antes de
auditar.

## 1. Investigue

- Identifique os componentes, as fontes de dados, os estados, as interações e as dependências envolvidas.
- Leia a documentação relevante do projeto e inspecione padrões semelhantes já estabelecidos.
- Registre limitações técnicas que restrinjam o refinamento possível.

## 2. Audite a interface

Avalie hierarquia visual, tipografia, espaçamento, alinhamento, contraste,
densidade, superfícies e consistência. Depois, avalie a usabilidade: clareza
das ações, navegação, feedback, loading, erros, estados vazios e prevenção de
ações acidentais.

## 3. Verifique acessibilidade e responsividade

- Revise HTML semântico, navegação por teclado, foco visível, labels, contraste,
  áreas de toque, estados selecionados e informações transmitidas apenas por cor.
- Use ARIA somente quando a semântica nativa não comunicar o estado necessário.
- Avalie layouts pequenos e grandes, quebra de texto, truncamento, overflow,
  alinhamento e alturas fixas excessivas.

## 4. Checklist de identidade

Toda revisão deve responder a estas perguntas:

1. A tela parece parte do mesmo Facilita OAB do Dashboard e do Chat?
2. O fundo geral continua quente (`#FAF8F5`), em vez de branco puro?
3. Há uso excessivo de branco, a ponto de o branco dominar a tela?
4. Algum cinza está visualmente frio/azulado? (problema recorrente no projeto)
5. O vinho está sendo usado como acento ou tomou conta da tela?
6. A hierarquia funciona sem sombras pesadas — por espaçamento, tamanho,
   tipografia, agrupamento e bordas?
7. Fraunces e Manrope estão nos papéis corretos (editorial x interface)?
8. As bordas são discretas e quentes?
9. O hover é perceptível sem ser chamativo, e sem `translateY`/`scale`?
10. Os estados de foco são acessíveis e usam a identidade vinho, nunca o azul
    padrão do navegador?
11. Existem dados ou funcionalidades fictícias, sem backend correspondente?
12. O layout continua parecendo aplicação, e não landing page?
13. A densidade está adequada — a interface respira?
14. O mobile preserva hierarquia e funcionalidade?

## 5. Checklist de regressões conhecidas

Estas são falhas que já aconteceram no projeto. Verificar explicitamente:

1. Algum botão outlined ainda usa hover rosa (`#FAF0F2`, `brass-soft`) em vez
   de `surface-button-hover`?
2. Algum botão usa `surface-border-hover` (borda de **subcard**) em vez de
   `surface-border-button-hover`?
3. Alguma lista virou caixa dentro de caixa, quando um divisor horizontal
   resolveria?
4. Algum card mestre ou card de métrica ganhou sombra desnecessária?
5. Algum link textual ganhou background, borda ou padding de pílula no hover?
6. Alguma borda caiu no `#e5e7eb` do Preflight por faltar classe de cor?
7. Algum foco ficou azul — `:focus` ou `:active` sem `outline-none`, ou `ring`
   sem cor explícita?
8. Algum elemento criou hex novo em vez de usar (ou propor) um token?
9. Alguma tela adotou visual SaaS genérico — gradiente, glass, card colorido,
   excesso de ícones?
10. Alguma funcionalidade ou dado fictício foi criado para imitar uma
    referência externa?

## 6. Diagnostique e proponha

Separe problemas funcionais, visuais e de acessibilidade de oportunidades
opcionais de refinamento. Diferencie fatos, hipóteses e preferências estéticas,
e sustente as conclusões com evidências do código ou da interface.

Apresente:

1. Estado atual e restrições relevantes.
2. Problemas identificados e seu impacto para a pessoa usuária.
3. Mudanças propostas e arquivos envolvidos.
4. Riscos funcionais e dependências.
5. Ordem incremental de implementação e necessidades de validação.

## Princípios de trabalho

- Investigue antes de propor ou editar.
- Reutilize padrões estabelecidos quando forem apropriados.
- Preserve comportamentos existentes e contratos de API durante trabalhos visuais.
- Não invente dados ou funcionalidades para sustentar um design.
- Ao apontar uma cor como "errada", verifique o valor computado antes de
  concluir. Percepção de cor depende de fundo, contraste e renderização; um
  token correto pode parecer errado por contraste simultâneo.
- Informe as limitações da auditoria, incluindo verificações que não puderam ser realizadas.
- Se a solicitação for somente de auditoria, não modifique arquivos do produto.
