# Facilita OAB

Companion de estudo para a **1ª fase do Exame da OAB**.

Chat com mentor jurídico afinado no estilo FGV, simulados de questões inéditas, caderno de erros, e um Início que orquestra tudo com contagem regressiva pra prova.

## Stack

- **Front**: React + Vite + JavaScript + Tailwind
- **Back**: FastAPI (Python) + Google Gemini (free tier)
- **Modelo**: `gemini-2.5-flash`
- **Design**: mobile-first, bottom nav consistente em desktop e mobile

## Features

### Início 🏠
Tela principal. Mostra saudação personalizada, contagem regressiva pra prova, cards de "revisar hoje" com itens do caderno, botão de simulado com último desempenho, e retomada da última conversa.

### Chat mentor 💬
Streaming em tempo real. System prompt adaptativo (pergunta curta → resposta curta). Botão "salvar no caderno" nas respostas que importam.

### Simulados ✅
Dez questões inéditas via structured output do Gemini. Modo rápido ou focado em matéria. Alerta especial de Ética < 50%. Deep-link "discutir com o mentor" nas erradas. Erros salvos automaticamente no caderno.

### Caderno de erros 📖
Toda questão errada vem parar aqui. Cada item tem status (aberto → revisando → dominado), anotação livre, filtro por matéria/status, e botão pra abrir chat contextualizado. Contador de itens abertos aparece na aba.

### Ajustes ⚙️
Nome (usado na saudação) + data da prova (usada na contagem regressiva).

## Setup em 5 minutos

### 1. Chave grátis do Gemini
https://aistudio.google.com/apikey → **Create API key** → copie (começa com `AIza...`)

### 2. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # cole a chave em GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Estrutura

```
facilita-oab/
├── backend/
│   ├── app/
│   │   ├── main.py                FastAPI + rotas /chat e /simulado
│   │   ├── chat.py                Streaming Gemini
│   │   ├── simulado.py            Structured output Gemini
│   │   └── prompts/
│   │       ├── mentor.md          ← ajusta o comportamento do chat aqui
│   │       └── simulado.md        ← ajusta o estilo das questões aqui
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── App.jsx                Router entre as views + bottom nav
        ├── components/
        │   ├── Inicio.jsx         Home com countdown, revisar, simulado, conversa
        │   ├── Chat.jsx           Chat streaming + salvar no caderno
        │   ├── SimuladoLanding.jsx
        │   ├── SimuladoRun.jsx
        │   ├── SimuladoResults.jsx    Auto-save erros + última atividade
        │   ├── Caderno.jsx            Lista + filtros + detalhes
        │   ├── Settings.jsx           Nome + data da prova
        │   ├── BottomNav.jsx          Nav do rodapé (4 abas + badge)
        │   └── QuestionCard.jsx
        └── lib/
            ├── api.js
            ├── caderno.js             CRUD localStorage do caderno
            ├── settings.js            Nome + data + saudação
            └── lastActivity.js        Última conversa + último simulado
```

## Persistência

Tudo em `localStorage` no navegador:
- `facilita-oab-settings` — nome, data da prova
- `facilita-oab-last-chat` — última conversa
- `facilita-oab-last-sim` — último simulado
- `oab-caderno-items` — itens do caderno
- `oab-simulado-current` — simulado em progresso (se ela fechou a aba)

## Prompts vivos

Todo comportamento das IAs vem dos `.md` em `backend/app/prompts/`. Iterar qualidade = editar em português mesmo. Sem tocar em código.

## Próximas evoluções

- Persistência real (SQLite/Postgres) — permite acesso do celular E notebook com sincronia
- Estatísticas: gráficos de progresso, streaks, matérias mais fracas
- Peça processual (2ª fase da OAB) com feedback estruturado
- Notificações web push pra lembrar de revisar
