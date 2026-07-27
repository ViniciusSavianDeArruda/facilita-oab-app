from pathlib import Path
import httpx
from google import genai
from google.genai import types
from google.genai.errors import APIError

from .config import settings


# Timeout configurado para suportar a geração completa dos simulados,
# evitando que a requisição permaneça aguardando indefinidamente.
client = genai.Client(
	api_key=settings.GEMINI_API_KEY,
	http_options=types.HttpOptions(timeout=120_000)
)
model = settings.GEMINI_MODEL


_PROMPTS_DIR = Path(__file__).parent / "prompts"


# Carrega o conteúdo de um prompt armazenado em arquivo.
def load_prompt(filename: str) -> str:
	return (_PROMPTS_DIR / filename).read_text(encoding="utf-8")


# Retorna uma mensagem simplificada para o frontend,
# evitando expor detalhes internos da API do Gemini.
def resumo_erro_ia(erro: Exception) -> str:
	if isinstance(erro, APIError):
		mensagem = erro.message or "erro desconhecido"
		return f"{erro.code} {erro.status or ''}: {mensagem}".strip()

	# Identifica falhas causadas por tempo excedido na resposta.
	if isinstance(erro, httpx.TimeoutException):
		return "timeout: o Gemini demorou demais pra responder."

	# Resposta genérica para erros não tratados especificamente.
	return "Erro inesperado. Tenta de novo."


__all__ = ["client", "model", "load_prompt", "resumo_erro_ia"]
