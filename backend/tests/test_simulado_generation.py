import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from google.genai.errors import ClientError, ServerError

from app import ai
from app.routers import simulado
from app.schemas import Alternatives, Question, QuestionList


def response_with_questions(amount: int):
	question = Question(
		materia="Civil",
		enunciado="Enunciado de teste.",
		alternativas=Alternatives(A="A", B="B", C="C", D="D"),
		correta="A",
		explicacao="Explicação de teste.",
		fundamento_legal="Art. 1º.",
	)
	return SimpleNamespace(parsed=QuestionList(questions=[question] * amount))


def provider_error(error_type, code: int):
	return error_type(
		code,
		{"error": {"status": "UNAVAILABLE", "message": "detalhe interno do provedor"}},
	)


class SimuladoGenerationTests(unittest.IsolatedAsyncioTestCase):
	async def test_primary_response_succeeds_without_fallback(self):
		response = response_with_questions(10)
		with patch.object(
			ai.client.aio.models,
			"generate_content",
			new=AsyncMock(return_value=response),
		) as generate_content:
			result = await ai.generate_with_fallback(
				request_id="test-success",
				attempt_timeout_seconds=1,
				total_timeout_seconds=2,
				contents="teste",
			)

		self.assertIs(result, response)
		self.assertEqual(generate_content.await_count, 1)

	async def test_503_from_primary_uses_fallback(self):
		response = response_with_questions(10)
		with patch.object(
			ai.client.aio.models,
			"generate_content",
			new=AsyncMock(side_effect=[provider_error(ServerError, 503), response]),
		) as generate_content:
			result = await ai.generate_with_fallback(
				request_id="test-fallback",
				attempt_timeout_seconds=1,
				total_timeout_seconds=2,
				contents="teste",
			)

		self.assertIs(result, response)
		self.assertEqual(generate_content.await_count, 2)
		self.assertEqual(generate_content.await_args_list[0].kwargs["model"], ai.model)
		self.assertEqual(generate_content.await_args_list[1].kwargs["model"], ai.model_fallback)

	async def test_503_from_both_models_propagates_last_failure(self):
		with patch.object(
			ai.client.aio.models,
			"generate_content",
			new=AsyncMock(side_effect=[provider_error(ServerError, 503), provider_error(ServerError, 503)]),
		) as generate_content:
			with self.assertRaises(ServerError):
				await ai.generate_with_fallback(
					request_id="test-double-503",
					attempt_timeout_seconds=1,
					total_timeout_seconds=2,
					contents="teste",
				)

		self.assertEqual(generate_content.await_count, 2)

	async def test_timeout_from_primary_uses_only_the_remaining_budget_for_fallback(self):
		async def slow_response(**kwargs):
			await asyncio.sleep(0.05)

		with patch.object(
			ai.client.aio.models,
			"generate_content",
			new=AsyncMock(side_effect=slow_response),
		) as generate_content:
			with self.assertRaises(ai.GenerationTimeoutError):
				await ai.generate_with_fallback(
					request_id="test-primary-timeout",
					attempt_timeout_seconds=0.01,
					total_timeout_seconds=0.03,
					fallback_on_timeout=True,
					contents="teste",
				)

		self.assertEqual(generate_content.await_count, 2)

	async def test_fallback_cannot_exceed_remaining_total_budget(self):
		async def primary_then_slow(**kwargs):
			if kwargs["model"] == ai.model:
				raise provider_error(ServerError, 503)
			await asyncio.sleep(0.05)

		with patch.object(
			ai.client.aio.models,
			"generate_content",
			new=AsyncMock(side_effect=primary_then_slow),
		) as generate_content:
			with self.assertRaises(ai.GenerationTimeoutError):
				await ai.generate_with_fallback(
					request_id="test-fallback-timeout",
					attempt_timeout_seconds=1,
					total_timeout_seconds=0.03,
					contents="teste",
				)

		self.assertEqual(generate_content.await_count, 2)

	async def test_429_does_not_trigger_fallback(self):
		with patch.object(
			ai.client.aio.models,
			"generate_content",
			new=AsyncMock(side_effect=provider_error(ClientError, 429)),
		) as generate_content:
			with self.assertRaises(ClientError):
				await ai.generate_with_fallback(contents="teste")

		self.assertEqual(generate_content.await_count, 1)

	async def test_invalid_json_shape_is_rejected(self):
		with patch.object(
			simulado,
			"generate_with_fallback",
			new=AsyncMock(return_value=SimpleNamespace(parsed=None)),
		):
			with self.assertRaises(ai.InvalidGenerationResponseError):
				await simulado.generate_questions(10, request_id="test-invalid-json")

	async def test_invalid_question_count_is_rejected(self):
		with patch.object(
			simulado,
			"generate_with_fallback",
			new=AsyncMock(return_value=response_with_questions(9)),
		):
			with self.assertRaises(ai.InvalidGenerationResponseError):
				await simulado.generate_questions(10, request_id="test-invalid-count")

	def test_safe_error_messages_and_statuses_do_not_expose_provider_detail(self):
		provider_unavailable = provider_error(ServerError, 503)
		provider_rate_limited = provider_error(ClientError, 429)

		self.assertEqual(ai.status_erro_simulado(provider_unavailable), 503)
		self.assertEqual(ai.status_erro_simulado(provider_rate_limited), 429)
		self.assertEqual(ai.status_erro_simulado(ai.GenerationTimeoutError()), 504)
		self.assertNotIn("detalhe interno", ai.resumo_erro_simulado(provider_unavailable))
		self.assertNotIn("detalhe interno", ai.resumo_erro_simulado(provider_rate_limited))


if __name__ == "__main__":
	unittest.main()
