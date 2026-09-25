---
name: design-review
description: Use esta skill para auditar interfaces web, avaliar hierarquia visual, usabilidade, acessibilidade, responsividade e consistência. Aplique antes de propor ou implementar refinamentos de UI/UX.
---

# Auditoria de design

Use esta skill para auditar uma interface web existente ou planejar um
refinamento de UI/UX antes da implementação. Investigue o produto real e
apresente evidências; não presuma dados, componentes, comportamentos ou
restrições técnicas.

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

## 4. Diagnostique e proponha

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
- Informe as limitações da auditoria, incluindo verificações que não puderam ser realizadas.
- Se a solicitação for somente de auditoria, não modifique arquivos do produto.
