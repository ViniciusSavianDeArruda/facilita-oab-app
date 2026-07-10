"""
FastAPI app — expõe:
  - Chat mentor (streaming SSE)
  - Simulados (JSON estruturado)

Rodar localmente:
    uvicorn app.main:app --reload --port 8000
"""

import json
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from app.chat import stream_chat  # noqa: E402
from app.simulado import criar_simulado  # noqa: E402


app = FastAPI(title="OAB Companion API", version="0.2.0")

origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Schemas ---

class Message(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    materia: str | None = None


class SimuladoRequest(BaseModel):
    modo: str = Field(pattern="^(rapido|materia)$")
    materia: str | None = None


# --- Rotas ---

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(req: ChatRequest):
    """Stream de tokens em formato SSE."""

    async def event_generator():
        try:
            messages = [m.model_dump() for m in req.messages]
            async for token in stream_chat(messages, materia=req.materia):
                payload = json.dumps({"text": token}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            err = json.dumps({"error": str(e)}, ensure_ascii=False)
            yield f"data: {err}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/simulado")
async def simulado(req: SimuladoRequest):
    """Cria simulado de 10 questões (rápido ou por matéria)."""
    if req.modo == "materia" and not req.materia:
        raise HTTPException(400, "Modo 'materia' exige campo 'materia'.")

    try:
        sim = await criar_simulado(req.modo, req.materia)
    except Exception as e:
        raise HTTPException(500, f"Erro gerando simulado: {e}")

    return sim.model_dump()
