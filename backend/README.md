# Backend — OAB Companion

FastAPI + Google Gemini (free tier).

## Setup

```bash
# 1. Cria venv e instala deps
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Configura variáveis
cp .env.example .env
# edita .env e cola a chave do Gemini (https://aistudio.google.com/apikey)

# 3. Roda
uvicorn app.main:app --reload --port 8000
```

Verifica:

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

## Endpoints

- `GET /health` — check
- `POST /chat` — stream SSE. Body:
  ```json
  {
    "messages": [{"role": "user", "content": "O que é habeas corpus?"}],
    "materia": "Constitucional"
  }
  ```

## Estrutura

```
app/
├── main.py           FastAPI + rotas
├── chat.py           Lógica do stream Gemini
└── prompts/
    └── mentor.md     System prompt do OAB mentor
```

Ajustar o comportamento do mentor = editar `prompts/mentor.md` (não precisa mexer no código).
