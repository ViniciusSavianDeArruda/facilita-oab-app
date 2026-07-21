from pathlib import Path
import httpx
from google import genai
from google.genai import types
from google.genai.errors import APIError

from .config import settings


# 120s: folga generosa sobre os 30-50s reais que a geração de simulado (10
# questões, chamada não-streaming) leva no Gemini Flash — sem timeout
# explícito o SDK espera indefinidamente (timeout=None vira "sem timeout"
# no httpx, não um default razoável).
client = genai.Client(api_key=settings.GEMINI_API_KEY, http_options=types.HttpOptions(timeout=120_000))
model = settings.GEMINI_MODEL


_PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(filename: str) -> str:
	return (_PROMPTS_DIR / filename).read_text(encoding="utf-8")


# Extrai só código + mensagem curta de um erro do Gemini, sem stack trace,
# path de arquivo, ou o payload interno completo (que inclui links de
# documentação, detalhes de quota etc. — mais do que o front precisa pra
# classificar o erro). APIError.message/.status/.code já vêm parseados
# pela lib; evitamos usar str(erro), que inclui o payload bruto inteiro.
def resumo_erro_ia(erro: Exception) -> str:
	if isinstance(erro, APIError):
		mensagem = erro.message or "erro desconhecido"
		return f"{erro.code} {erro.status or ''}: {mensagem}".strip()
	if isinstance(erro, httpx.TimeoutException):
		return "timeout: o Gemini demorou demais pra responder."
	return "Erro inesperado. Tenta de novo."


__all__ = ["client", "model", "load_prompt", "resumo_erro_ia"]
