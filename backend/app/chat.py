"""
Lógica do chat mentor: streaming de tokens do Gemini.

Fluxo:
1. Carrega o system prompt de prompts/mentor.md
2. Recebe o histórico da conversa (front envia)
3. Abre stream com Gemini e vai yieldando tokens
"""

import os
from pathlib import Path
from typing import AsyncGenerator

from google import genai
from google.genai import types


# Carregado uma vez na inicialização
_PROMPT_PATH = Path(__file__).parent / "prompts" / "mentor.md"
SYSTEM_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8")

# Cliente Gemini — pega a chave da env automaticamente se GEMINI_API_KEY estiver setada
_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")


def _to_gemini_contents(messages: list[dict]) -> list[types.Content]:
    """
    Converte histórico do front [{role: 'user'|'assistant', content: str}, ...]
    para o formato Content do Gemini (que usa 'model' em vez de 'assistant').
    """
    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg["content"])],
            )
        )
    return contents


async def stream_chat(messages: list[dict], materia: str | None = None) -> AsyncGenerator[str, None]:
    """
    Yield tokens (strings) do Gemini como eles chegam.

    messages: lista completa do histórico da conversa
    materia:  matéria atual (opcional) — se vier, adiciona ao system prompt como contexto
    """
    system = SYSTEM_PROMPT
    if materia:
        system += f"\n\n# Contexto da sessão atual\n\nA estudante está estudando **{materia}** agora. Priorize exemplos e alertas dessa matéria quando fizer sentido."

    contents = _to_gemini_contents(messages)

    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=0.4,  # menos criatividade, mais precisão jurídica
        max_output_tokens=2048,
    )

    stream = await _client.aio.models.generate_content_stream(
        model=_model,
        contents=contents,
        config=config,
    )

    async for chunk in stream:
        if chunk.text:
            yield chunk.text
