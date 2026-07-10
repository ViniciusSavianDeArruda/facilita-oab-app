"""
Geração de questões OAB via Gemini com structured output (JSON schema).

O Gemini recebe o prompt e devolve JSON validado por Pydantic — sem regex,
sem parse manual, sem risco de resposta malformada.
"""

import os
import uuid
from pathlib import Path

from google import genai
from google.genai import types
from pydantic import BaseModel, Field


# System prompt para gerar questões
_PROMPT_PATH = Path(__file__).parent / "prompts" / "simulado.md"
SYSTEM_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8")

_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")


# --- Schemas ---

class Alternativas(BaseModel):
    A: str
    B: str
    C: str
    D: str
    E: str


class Questao(BaseModel):
    materia: str = Field(description="Nome curto da matéria: Constitucional, Civil, etc.")
    enunciado: str = Field(description="Enunciado narrativo estilo FGV, 3-8 linhas.")
    alternativas: Alternativas
    correta: str = Field(pattern="^[A-E]$", description="Letra da alternativa correta.")
    explicacao: str = Field(description="Por que a correta acerta e por que as outras erram.")
    fundamento_legal: str = Field(description="Artigo(s) e lei(s) específicos.")


class QuestaoList(BaseModel):
    """Wrapper porque schemas top-level do Gemini funcionam melhor como objeto."""
    questoes: list[Questao]


# --- Distribuição da 1ª fase (aproximação da real FGV) ---

DISTRIBUICAO_FGV = {
    "Ética": 8, "Filosofia": 2, "Constitucional": 8, "Direitos Humanos": 2,
    "Internacional": 2, "Tributário": 5, "Administrativo": 5, "Ambiental": 1,
    "Civil": 10, "Processo Civil": 10, "Penal": 8, "Processo Penal": 5,
    "Empresarial": 4, "Trabalho": 6, "Processo do Trabalho": 3,
    "Financeiro": 1, "ECA": 1,  # total: 81, ajustaremos
}


# --- Geração ---

def _build_user_prompt(quantidade: int, materia: str | None) -> str:
    if materia:
        return (
            f"Gere {quantidade} questões inéditas de **{materia}**, "
            "todas no estilo FGV. Varie a dificuldade e os subtemas dentro dessa matéria."
        )
    return (
        f"Gere {quantidade} questões inéditas variadas cobrindo diferentes matérias "
        "da 1ª fase da OAB. Distribua entre pelo menos 4 matérias diferentes."
    )


async def gerar_questoes(quantidade: int, materia: str | None = None) -> list[Questao]:
    """
    Chama o Gemini pedindo N questões estruturadas.
    Retorna lista já validada pelo Pydantic.
    """
    user_prompt = _build_user_prompt(quantidade, materia)

    response = await _client.aio.models.generate_content(
        model=_model,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=QuestaoList,
            temperature=0.75,  # variedade sem loucura
            max_output_tokens=8192,
        ),
    )

    parsed: QuestaoList = response.parsed
    return parsed.questoes


# --- Simulado completo ---

class Simulado(BaseModel):
    id: str
    modo: str  # "rapido" | "materia"
    materia_filtro: str | None
    questoes: list[Questao]


async def criar_simulado(modo: str, materia: str | None = None) -> Simulado:
    """
    Cria um simulado com base no modo escolhido.
    - "rapido": 10 questões variadas
    - "materia": 10 questões de uma matéria específica
    """
    quantidade = 10
    questoes = await gerar_questoes(quantidade, materia)

    return Simulado(
        id=str(uuid.uuid4()),
        modo=modo,
        materia_filtro=materia,
        questoes=questoes,
    )
