import logging
from pathlib import Path
import httpx
from google import genai
from google.genai import types
from google.genai.errors import APIError, ServerError

from .config import settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
	# Sem handler próprio, mensagens INFO some no lastResort (só mostra
	# WARNING+) — precisamos que "qual modelo respondeu" sempre apareça.
	_handler = logging.StreamHandler()
	_handler.setFormatter(logging.Formatter("%(asctime)s %(name)s %(levelname)s %(message)s"))
	logger.addHandler(_handler)


# Timeout configurado para suportar a geração completa dos simulados,
# evitando que a requisição permaneça aguardando indefinidamente.
client = genai.Client(
	api_key=settings.GEMINI_API_KEY,
	http_options=types.HttpOptions(timeout=120_000)
)
model = settings.GEMINI_MODEL
model_fallback = settings.GEMINI_MODEL_FALLBACK


# Chamada não-streaming (simulado): se o modelo principal responder com
# erro de servidor (5xx — indisponibilidade/sobrecarga), tenta de novo
# com o modelo de fallback antes de desistir.
async def generate_with_fallback(**kwargs):
	try:
		response = await client.aio.models.generate_content(model=model, **kwargs)
		logger.info("Gemini: resposta gerada com modelo principal (%s)", model)
		return response
	except ServerError as error:
		logger.warning(
			"Gemini: modelo principal (%s) indisponível (%s %s), tentando fallback (%s)",
			model, error.code, error.status, model_fallback,
		)
		response = await client.aio.models.generate_content(model=model_fallback, **kwargs)
		logger.info("Gemini: resposta gerada com modelo fallback (%s)", model_fallback)
		return response


# Chamada em streaming (chat): só tenta o fallback se o erro acontecer
# ANTES de qualquer chunk ter sido enviado — depois disso, reiniciar
# duplicaria conteúdo já entregue ao cliente, então nesse caso propaga
# o erro (chat.py já trata isso hoje, emitindo evento {error} no SSE).
async def stream_with_fallback(**kwargs):
	first_chunk_sent = False
	try:
		stream = await client.aio.models.generate_content_stream(model=model, **kwargs)
		async for chunk in stream:
			first_chunk_sent = True
			yield chunk
		logger.info("Gemini: stream concluído com modelo principal (%s)", model)
		return
	except ServerError as error:
		if first_chunk_sent:
			raise
		logger.warning(
			"Gemini: modelo principal (%s) indisponível antes do 1º chunk (%s %s), tentando fallback (%s)",
			model, error.code, error.status, model_fallback,
		)

	stream = await client.aio.models.generate_content_stream(model=model_fallback, **kwargs)
	async for chunk in stream:
		yield chunk
	logger.info("Gemini: stream concluído com modelo fallback (%s)", model_fallback)


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


__all__ = ["client", "model", "generate_with_fallback", "stream_with_fallback", "load_prompt", "resumo_erro_ia"]
