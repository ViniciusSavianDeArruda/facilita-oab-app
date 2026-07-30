# Facilita OAB — Frontend

Interface React que consome a API do Facilita OAB.

Para visão geral do projeto, veja o [README principal](../README.md).

## Stack

- **React 18** com hooks funcionais
- **Vite** como bundler e dev server
- **Tailwind CSS** para estilização
- **Heroicons** para ícones
- **react-markdown** para renderizar respostas do mentor
- **pnpm** como package manager

## Como rodar localmente

### Requisitos

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Backend rodando em `http://localhost:8000` (via Docker, veja [backend](../backend/README.md))

### Setup

```bash
pnpm install
pnpm dev
```

Abre em `http://localhost:5173`.

O Vite proxya `/api/*` pro backend automaticamente (configurado em `vite.config.js`). Não é necessário configurar `VITE_API_URL` em dev.

### Build de produção

```bash
pnpm build
```

Gera versão otimizada em `dist/`. Para testar o build localmente:

```bash
pnpm preview
```

## Estrutura

```
frontend/
├── src/
│   ├── App.jsx                     Auth gate + hidratação + router entre views
│   ├── main.jsx                    Entry point React
│   ├── index.css                   Tailwind + estilos globais
│   ├── components/
│   │   ├── Login.jsx
│   │   ├── Inicio.jsx              Home com contagem regressiva e plano do dia
│   │   ├── Chat.jsx                Chat streaming + histórico de conversas
│   │   ├── ChatComposer.jsx        Input do chat
│   │   ├── SimuladoLanding.jsx     Escolha modo (rápido/focado)
│   │   ├── SimuladoRun.jsx         Execução das 10 questões
│   │   ├── SimuladoResults.jsx     Resultado + erros salvos no caderno
│   │   ├── Caderno.jsx             Grid de cards + filtros
│   │   ├── Cronograma.jsx          Plano de estudos ativo
│   │   ├── CronogramaConfig.jsx    Configuração do cronograma
│   │   ├── CronogramaCalendario.jsx Calendário mensal
│   │   ├── Estatisticas.jsx        Gráficos de progresso
│   │   ├── Settings.jsx            Nome + logout
│   │   ├── Sidebar.jsx             Nav desktop
│   │   ├── BottomNav.jsx           Nav mobile
│   │   └── QuestionCard.jsx        Card reutilizável de questão
│   └── lib/
│       ├── api.js                  authFetch + streamChat (SSE)
│       ├── authClient.js           Login/logout/token no localStorage
│       ├── conversas.js            Histórico de conversas (cache + hydrate)
│       ├── materias.js             Matérias + peso FGV (filtro por prioridade)
│       ├── erros.js                Erro de API → mensagem amigável
│       ├── settings.js             Cache em memória do perfil
│       ├── caderno.js              Cache do caderno
│       ├── cronograma.js           Cache do cronograma
│       ├── simulados.js            Cache de simulados
│       ├── lastActivity.js         Última atividade do usuário
│       └── importLegacy.js         Import de dados de versões antigas
├── public/                         Assets estáticos
├── index.html
├── vite.config.js                  Config Vite + proxy /api → backend
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── pnpm-lock.yaml
```

## Design

- **Mobile-first**: layout otimizado pra celular, adaptado pra desktop
- **Sidebar fixa** em desktop (280px) / **bottom nav** em mobile
- **Tema claro**: paleta pêssego/vinho
- **Interações**: salvamento automático no blur, renomeação inline (Enter salva, Esc cancela)

## Estado

Cache em memória hidratado da API no boot:

- `settings.js`, `caderno.js`, `cronograma.js`, `simulados.js`, `conversas.js`

Getters síncronos após hidratação inicial. Não usa Redux/Zustand — cache simples atende bem ao caso single-user.

## Autenticação

- Login via `POST /auth/login` com senha única
- JWT armazenado em `localStorage`
- Todas as chamadas passam por `authFetch` que injeta `Authorization: Bearer <token>`
- Se receber 401, redireciona pra login

## Chat streaming

Chat usa Server-Sent Events (SSE) via `EventSource`:

- Primeiro evento: `{conversaId}` — para novas conversas
- Chunks intermediários: texto do mentor sendo gerado
- Evento final: `[DONE]` ou `{error}` em caso de falha

Renderização de markdown via `react-markdown` conforme os chunks chegam.

## Variáveis de ambiente

Uma única variável, opcional em dev:

| Variável | Descrição | Quando usar |
|----------|-----------|-------------|
| `VITE_API_URL` | URL do backend | Apenas em produção (Vercel) |

Em desenvolvimento local, o proxy do Vite (`vite.config.js`) redireciona `/api/*` pra `http://localhost:8000`, dispensando a variável.

Em produção, o Vercel injeta `VITE_API_URL` apontando pra URL do backend Render.

## Deploy

Frontend deployado no [Vercel](https://vercel.com) como site estático.

- **Framework detectado**: Vite
- **Build command**: `pnpm build`
- **Output directory**: `dist`
- **Root directory**: `frontend/`

Push em `main` triggera rebuild automático.

## Status

Em produção e manutenção contínua. Sem novas features planejadas — arquitetura e escopo atuais atendem ao caso de uso.
