# Frontend — Toga

React + Vite + Tailwind.

## Setup

```bash
npm install
npm run dev
```

Roda em `http://localhost:5173` e faz proxy de `/api/*` para o backend em `:8000` (config em `vite.config.js`).

## Estrutura

```
src/
├── App.jsx                   Shell: header + matéria selector
├── main.jsx                  Entry
├── index.css                 Tailwind + estilos globais + markdown
├── lib/
│   └── api.js                Cliente SSE (streamChat generator)
└── components/
    └── Chat.jsx              Chat completo (mensagens + input + streaming)
```

## Design

- **Fontes**: Fraunces (display serif) + Manrope (body)
- **Paleta**: fundo tinta quase-preta (`#0F0E0C`), texto creme quente (`#F0E9D8`), acento brass/latão (`#E4A853`)
- **Signature**: mensagens do mentor com borda esquerda em latão (marginalia de livro jurídico), sem avatar, sem balão pesado

## Adicionar novos temas / features

- Nova cor: `tailwind.config.js` → `theme.extend.colors`
- Novo componente: `src/components/`
- Nova rota da API: `src/lib/api.js`
