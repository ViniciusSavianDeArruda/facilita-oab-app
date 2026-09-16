import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from google.genai import types
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..activity import get_client_today, register_activity
from ..ai import generate_with_fallback, load_prompt, resumo_erro_ia
from ..db import get_session, ItemCaderno, ResultadoSimulado
from ..materias import canonicalizar_materia
from ..rate_limit import limiter
from ..schemas import CreateSimulationResult, Question, QuestionList, Simulation, SimuladoRequest
from ..security import require_authentication
from ..serializers import serialize_result

# Fluxo de simulados: prompt, geracao, serializacao e persistencia.
SYSTEM_PROMPT_SIM = load_prompt("simulado.md")


# Monta a solicitacao em linguagem natural enviada ao modelo.
def _build_user_prompt(amount: int, subject: str | None) -> str:
	if subject:
		return (
			f"Gere {amount} questões inéditas de **{subject}**, "
			"todas no estilo FGV. Varie a dificuldade e os subtemas."
		)

	return (
		f"Gere {amount} questões inéditas variadas cobrindo diferentes matérias "
		"da 1ª fase da OAB."
	)


# Pede ao modelo as questoes e valida o retorno com o schema esperado.
async def generate_questions(amount: int, subject: str | None = None) -> list[Question]:
	user_prompt = _build_user_prompt(amount, subject)

	response = await generate_with_fallback(
		contents=user_prompt,
		config=types.GenerateContentConfig(
			system_instruction=SYSTEM_PROMPT_SIM,
			response_mime_type="application/json",
			response_schema=QuestionList,
			temperature=0.75,
			max_output_tokens=16384,
		),
	)

	validated_response: QuestionList = response.parsed

	return validated_response.questions


# Cria o objeto de simulacao que o frontend consome antes da resolucao.
async def create_simulation(mode: str, subject: str | None = None) -> Simulation:
	questions = await generate_questions(amount=10, subject=subject)

	# Simulado focado: usa o nome curto pedido em vez do que o Gemini
	# escreveu por conta própria em cada questao (ele nao e consistente —
	# ja gerou "Direito Civil", "Processo Civil" e ate materias fora da
	# nossa lista canonica pra pedidos equivalentes).
	if subject:
		for question in questions:
			question.materia = subject
	else:
		# Modo rapido: sem subject pedido, entao normaliza o que o Gemini
		# escreveu por questao. Materia desconhecida vira "Geral" em vez
		# de arriscar uma categorizacao errada.
		for question in questions:
			question.materia = canonicalizar_materia(question.materia)

	return Simulation(
		id=str(uuid.uuid4()),
		modo=mode,
		materia_filtro=subject,
		questoes=questions,
	)


# Salva o resultado e adiciona no caderno os itens errados que ainda nao existem.
def save_simulation_result(db: Session, body: CreateSimulationResult, today: date) -> tuple[ResultadoSimulado, int]:
	result = insert_result_repo(db, body)

	existing_questions = get_existing_notebook_enunciados_repo(db)

	saved_count = 0

	for index, question in enumerate(body.questoes):
		given_answer = body.answers.get(str(index))

		if given_answer == question.correta:
			continue

		if question.enunciado in existing_questions:
			continue

		existing_questions.add(question.enunciado)

		insert_notebook_item_repo(db, question, given_answer)
		saved_count += 1

	register_activity(db, today)

	db.commit()
	db.refresh(result)

	return result, saved_count


# Helpers de persistencia mantidos aqui para evitar espalhar a logica do resultado.
# Insere o resultado bruto no banco.
def insert_result_repo(db: Session, body: CreateSimulationResult) -> ResultadoSimulado:
	result = ResultadoSimulado(
		modo=body.modo,
		materia_filtro=body.materiaFiltro,
		acertos=body.acertos,
		total=body.total,
		duracao_segundos=body.elapsedSec,
		questoes_json=[question.model_dump() for question in body.questoes],
		respostas_json=body.answers,
		por_materia_json=body.porMateria,
	)

	db.add(result)

	return result


# Evita duplicar itens do caderno vindos de simulados anteriores.
def get_existing_notebook_enunciados_repo(db: Session) -> set[str]:
	return set(
		db.scalars(
			select(ItemCaderno.enunciado).where(ItemCaderno.origem == "simulado")
		)
	)


# Cria um item do caderno com base em uma questao errada do simulado.
def insert_notebook_item_repo(db: Session, question: Question, given_answer: str | None) -> ItemCaderno:
	item = ItemCaderno(
		origem="simulado",
		status="aberto",
		materia=question.materia,
		anotacao="",
		questao_json=question.model_dump(),
		enunciado=question.enunciado,
		resposta_dada=given_answer,
	)

	db.add(item)

	return item


# Rotas de simulados.
simulados_router = APIRouter(prefix="/me/simulados", tags=["Simulados"], dependencies=[Depends(require_authentication)])


@simulados_router.get(
	"",
	summary="Listar resultados",
	description="Retorna o histórico completo de simulados já realizados.",
)
def simulados_list_results(db: Session = Depends(get_session)):
	results = db.scalars(
		select(ResultadoSimulado).order_by(ResultadoSimulado.criado_em.desc())
	).all()

	return [serialize_result(item) for item in results]


@simulados_router.post(
	"",
	status_code=201,
	summary="Salvar resultado",
	description="Salva o resultado de um simulado concluído e adiciona as questões erradas ao caderno.",
)
def simulados_save_result(body: CreateSimulationResult, request: Request, db: Session = Depends(get_session)):
	result, saved = save_simulation_result(db, body, get_client_today(request))
	return {**serialize_result(result), "savedCount": saved}


# Rota de geracao de um novo simulado via Gemini.
simulado_router = APIRouter(tags=["Simulados"], dependencies=[Depends(require_authentication)])


@simulado_router.post(
	"/simulado",
	response_model=Simulation,
	summary="Gerar simulado",
	description="Gera um novo simulado de 10 questões inéditas via IA, no modo rápido ou focado em uma matéria.",
)
@limiter.limit("30/hour")
async def route_create_simulation(body: SimuladoRequest, request: Request):
	try:
		return await create_simulation(body.modo, body.materia)
	except Exception as error:
		raise HTTPException(502, detail=resumo_erro_ia(error))


__all__ = ["simulados_router", "simulado_router"]
