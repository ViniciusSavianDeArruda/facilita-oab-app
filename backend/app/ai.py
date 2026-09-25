import asyncio
import logging
from pathlib import Path
from time import perf_counter
import httpx
from google import genai
from google.genai import types
from google.genai.errors import APIError, ServerError

from .config import settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
# O handler local é intencional: não propagar evita duplicação quando o
# Alembic configura o handler do root durante o startup.
logger.propagate = False
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


class GenerationTimeoutError(TimeoutError):
	"""A geração excedeu o prazo reservado para a operação."""


class InvalidGenerationResponseError(ValueError):
	"""A resposta do modelo não pôde ser convertida ao formato esperado."""


def _error_metadata(error: Exception) -> tuple[str, object | None, object | None]:
	return (
		type(error).__name__,
		getattr(error, "code", None),
		getattr(error, "status", None),
	)


async def _generate_content_attempt(
	model_name: str,
	attempt: str,
	request_id: str | None,
	timeout_seconds: float | None = None,
	**kwargs,
):
	started_at = perf_counter()
	logger.info(
		"ai_generation_attempt_started request_id=%s attempt=%s model=%s timeout_ms=%s",
		request_id,
		attempt,
		model_name,
		round(timeout_seconds * 1000) if timeout_seconds is not None else None,
	)
	try:
		if timeout_seconds is None:
			response = await client.aio.models.generate_content(
				model=model_name,
				**kwargs,
			)
		else:
			try:
				async with asyncio.timeout(timeout_seconds):
					response = await client.aio.models.generate_content(
						model=model_name,
						**kwargs,
					)
			except TimeoutError as error:
				raise GenerationTimeoutError(
					"A tentativa de geração excedeu o prazo disponível."
				) from error
	except Exception as error:
		exception_type, error_code, error_status = _error_metadata(error)
		logger.warning(
			"ai_generation_attempt_failed request_id=%s attempt=%s model=%s duration_ms=%.1f exception_type=%s error_code=%s error_status=%s",
			request_id,
			attempt,
			model_name,
			(perf_counter() - started_at) * 1000,
			exception_type,
			error_code,
			error_status,
		)
		raise

	logger.info(
		"ai_generation_attempt_succeeded request_id=%s attempt=%s model=%s duration_ms=%.1f",
		request_id,
		attempt,
		model_name,
		(perf_counter() - started_at) * 1000,
	)
	return response


# Chamada não-streaming (simulado): se o modelo principal responder com
# erro de servidor (5xx — indisponibilidade/sobrecarga), tenta de novo
# com o modelo de fallback antes de desistir.
async def generate_with_fallback(
	*,
	request_id: str | None = None,
	attempt_timeout_seconds: float | None = None,
	total_timeout_seconds: float | None = None,
	fallback_on_timeout: bool = False,
	**kwargs,
):
	"""Gera conteúdo com fallback opcional e um orçamento total compartilhado.

	Os parâmetros de prazo são opt-in para preservar o comportamento do chat,
	que chama esta função apenas pela variante de streaming.
	"""
	started_at = perf_counter()

	def attempt_timeout() -> float | None:
		if total_timeout_seconds is None:
			return attempt_timeout_seconds

		remaining = total_timeout_seconds - (perf_counter() - started_at)
		if remaining <= 0:
			raise GenerationTimeoutError(
				"O prazo total de geração foi excedido antes de iniciar a tentativa."
			)

		if attempt_timeout_seconds is None:
			return remaining
		return min(attempt_timeout_seconds, remaining)

	async def run_fallback(error: Exception):
		exception_type, error_code, error_status = _error_metadata(error)
		logger.warning(
			"ai_generation_fallback_triggered request_id=%s primary_model=%s fallback_model=%s exception_type=%s error_code=%s error_status=%s",
			request_id,
			model,
			model_fallback,
			exception_type,
			error_code,
			error_status,
		)
		try:
			return await _generate_content_attempt(
				model_fallback,
				"fallback",
				request_id,
				timeout_seconds=attempt_timeout(),
				**kwargs,
			)
		except Exception as fallback_error:
			fallback_type, fallback_code, fallback_status = _error_metadata(
				fallback_error,
			)
			logger.error(
				"ai_generation_fallback_failed request_id=%s model=%s exception_type=%s error_code=%s error_status=%s",
				request_id,
				model_fallback,
				fallback_type,
				fallback_code,
				fallback_status,
			)
			raise

	try:
		return await _generate_content_attempt(
			model,
			"primary",
			request_id,
			timeout_seconds=attempt_timeout(),
			**kwargs,
		)
	except ServerError as error:
		return await run_fallback(error)
	except GenerationTimeoutError as error:
		if not fallback_on_timeout:
			raise
		return await run_fallback(error)


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


def resumo_erro_simulado(erro: Exception) -> str:
	"""Mensagem segura e específica para o endpoint não-streaming de Simulado."""
	if isinstance(erro, GenerationTimeoutError) or isinstance(erro, httpx.TimeoutException):
		return "A geração do simulado excedeu o tempo disponível. Tente novamente."
	if isinstance(erro, InvalidGenerationResponseError):
		return "A resposta do mentor não pôde ser validada. Tente gerar novamente."
	if isinstance(erro, APIError) and erro.code == 503:
		return "O mentor está temporariamente indisponível. Tente novamente em instantes."
	if isinstance(erro, APIError) and erro.code == 429:
		return "O limite de solicitações do mentor foi atingido. Aguarde alguns instantes e tente novamente."
	if isinstance(erro, APIError):
		return "O mentor não conseguiu gerar o simulado agora. Tente novamente."
	return "Erro inesperado. Tenta de novo."


def status_erro_simulado(erro: Exception) -> int:
	"""Mapeia erros conhecidos a status HTTP sem expor detalhes do provedor."""
	if isinstance(erro, GenerationTimeoutError) or isinstance(erro, httpx.TimeoutException):
		return 504
	if isinstance(erro, APIError) and erro.code in {429, 503}:
		return erro.code
	return 502


__all__ = ["client", "model", "generate_with_fallback", "stream_with_fallback", "load_prompt", "resumo_erro_ia", "resumo_erro_simulado", "status_erro_simulado", "GenerationTimeoutError", "InvalidGenerationResponseError"]
