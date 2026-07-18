# Bootstrap da aplicacao FastAPI: config, banco, schemas e montagem dos routers.
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Limita tentativas de login por IP, pra dificultar força bruta na senha.
limiter = Limiter(key_func=get_remote_address)

# Configuracoes globais e acesso ao banco de dados.
from .config import settings
from .db import (
	SessionLocal,
	get_session,
	RegistroAtividade,
	ItemCaderno,
	ResultadoSimulado,
	get_or_create,
	ConfiguracaoCronograma,
	PlanoCronograma,
	Perfil,
	Conversa,
	MensagemChat,
)
from datetime import date, timedelta, datetime

# Schemas usados para validar entrada e formatar saida das rotas.
from .schemas import (
	LoginRequest,
	TokenResponse,
	ImportRequest,
	CreateNotebookItemFromChat,
	UpdateNotebookItem,
	ChatRequest,
	Question,
	QuestionList,
	Simulation,
	SimuladoRequest,
	ConfigScheduleRequest,
	ConfigScheduleResponse,
	SchedulePlanRequest,
	SchedulePlanResponse,
	LastConversation,
	LastConversationRequest,
	ProfileResponse,
	UpdateProfileRequest,
	CreateSimulationResult,
	NotebookStatus,
	StatisticsResponse,
	SubjectStatistic,
	TrendPoint,
	ConversaResumo,
	ConversaCriada,
	ConversaDetalhe,
	MensagemChatResponse,
	AtualizarTituloRequest,
)

# Cliente Gemini e prompts usados nas rotas de chat e simulados.
from .ai import client, model, load_prompt, resumo_erro_ia
from google.genai import types
import uuid

from .security import require_authentication
from .auth import login as authenticate
from . import backup as backup_service
from .materias import canonicalizar_materia

# Converte datetimes para ISO em UTC para respostas da API.
def to_iso_utc(moment: datetime | None) -> str | None:
	if moment is None:
		return None
	from datetime import timezone

	return moment.replace(tzinfo=timezone.utc).isoformat()


# Remove timezone para salvar datas no formato esperado pelo banco.
def to_naive_utc(moment: datetime) -> datetime:
	from datetime import timezone

	if moment.tzinfo is not None:
		return moment.astimezone(timezone.utc).replace(tzinfo=None)

	return moment


# Usa o offset enviado pelo frontend para calcular o dia local do cliente.
def get_client_today(request: Request) -> date:
	from datetime import timezone, timedelta

	try:
		timezone_offset = int(request.headers.get("X-Tz-Offset-Minutes", "0"))
	except ValueError:
		timezone_offset = 0

	return (
		datetime.now(timezone.utc) - timedelta(minutes=timezone_offset)
	).date()
# Pequenos servicos mantidos aqui para centralizar a montagem da API.


# Garante que cada dia seja contabilizado uma vez na tabela de atividades.
def register_activity(db: Session, day: date | None = None) -> None:
	day = day or date.today()

	exists = db.scalar(
		select(RegistroAtividade.id).where(
			RegistroAtividade.data == day
		)
	)

	if exists is not None:
		return

	db.add(RegistroAtividade(data=day))


# Regras do caderno: serializacao, criacao, edicao e exclusao de itens.
def caderno_serialize_item(item: ItemCaderno) -> dict:
	return {
		"id": str(item.id),
		"createdAt": to_iso_utc(item.criado_em),
		"origin": item.origem,
		"status": item.status,
		"materia": item.materia,
		"anotacao": item.anotacao,
		"questao": item.questao_json,
		"respostaDada": item.resposta_dada,
		"pergunta": item.pergunta,
		"resposta": item.resposta,
	}


def caderno_list_items(db: Session) -> list[ItemCaderno]:
	return db.scalars(
		select(ItemCaderno).order_by(ItemCaderno.criado_em.desc())
	).all()


# Cria um item do caderno a partir de uma mensagem do chat.
def caderno_create_from_chat(db: Session, body: CreateNotebookItemFromChat, today: date) -> ItemCaderno:
	item = ItemCaderno(
		origem="chat",
		status="aberto",
		materia=body.materia or "Geral",
		anotacao="",
		pergunta=body.pergunta,
		resposta=body.resposta,
	)

	db.add(item)
	register_activity(db, today)

	db.commit()
	db.refresh(item)

	return item


# Atualiza apenas os campos editaveis do item do caderno.
def caderno_update_item(db: Session, item_id: int, body: UpdateNotebookItem, today: date) -> ItemCaderno:
	item = db.get(ItemCaderno, item_id)

	if item is None:
		raise HTTPException(404, "Item não encontrado.")

	if body.status is not None:
		item.status = body.status

	if body.anotacao is not None:
		item.anotacao = body.anotacao

	register_activity(db, today)

	db.commit()
	db.refresh(item)

	return item


def caderno_delete_item(db: Session, item_id: int) -> None:
	item = db.get(ItemCaderno, item_id)

	if item is None:
		raise HTTPException(404, "Item não encontrado.")

	db.delete(item)
	db.commit()


# Regras do perfil: carregar, criar e persistir os dados do usuario.
def get_or_create_profile(db: Session):
	from sqlalchemy.exc import IntegrityError

	profile = db.get(Perfil, 1)

	if profile is None:
		profile = Perfil(id=1)
		db.add(profile)

		try:
			db.commit()
		except IntegrityError:
			db.rollback()
			profile = db.get(Perfil, 1)
		else:
			db.refresh(profile)

	return profile


def profile_get(db: Session):
	return get_or_create_profile(db)


def profile_update(db: Session, body: UpdateProfileRequest):
	profile = get_or_create_profile(db)

	if body.nome is not None:
		profile.nome = body.nome

	if "dataProva" in body.model_fields_set:
		profile.data_prova = date.fromisoformat(body.dataProva) if body.dataProva else None

	db.commit()
	db.refresh(profile)

	return profile


# Salva a ultima conversa para o frontend poder retomar o contexto.
def profile_save_last_chat(db: Session, body: LastConversationRequest):
	profile = get_or_create_profile(db)

	profile.ultima_conversa_json = {
		"pergunta": body.pergunta,
		"resposta": body.resposta,
		"materia": body.materia,
	}

	profile.ultima_conversa_atualizada_em = datetime.utcnow()

	db.commit()
	db.refresh(profile)

	return profile


# Calcula a sequencia atual de dias ativos do usuario.
def _calculate_streak(activity_days: set[date], today: date) -> int:
	if not activity_days:
		return 0

	check_day = (today if today in activity_days else today - timedelta(days=1))

	if check_day not in activity_days:
		return 0

	streak = 0
	while check_day in activity_days:
		streak += 1
		check_day -= timedelta(days=1)

	return streak


# Monta os indicadores exibidos na tela de estatisticas.
def get_statistics_inline(db: Session, today: date) -> StatisticsResponse:
	results = db.scalars(
		select(ResultadoSimulado)
		.order_by(ResultadoSimulado.criado_em.asc())
	).all()

	by_subject: dict[str, dict[str, int]] = {}
	trend: list[TrendPoint] = []

	for result in results:
		trend.append(
			TrendPoint(
				createdAt=to_iso_utc(result.criado_em),
				acertos=result.acertos,
				total=result.total,
			)
		)

		for subject, statistic in result.por_materia_json.items():
			accumulated = by_subject.setdefault(
				subject,
				{
					"acertos": 0,
					"total": 0,
				},
			)

			accumulated["acertos"] += statistic.get("acertos", 0)
			accumulated["total"] += statistic.get("total", 0)

	subject_statistics = [
		SubjectStatistic(
			materia=subject,
			acertos=value["acertos"],
			total=value["total"],
		)
		for subject, value in sorted(
			by_subject.items(),
			key=lambda item: (
				item[1]["acertos"] / item[1]["total"] if item[1]["total"] else 0
			),
		)
	]

	activity_days = set(db.scalars(select(RegistroAtividade.data)).all())

	streak = _calculate_streak(activity_days, today)

	notebook_status = {"aberto": 0, "revisando": 0, "dominado": 0}

	for status in db.scalars(select(ItemCaderno.status)).all():
		if status in notebook_status:
			notebook_status[status] += 1

	return StatisticsResponse(
		totalSimulados=len(results),
		porMateria=subject_statistics,
		trend=trend,
		streak=streak,
		cadernoStatus=NotebookStatus(**notebook_status),
	)


# Lifecycle da aplicacao: aplica migrations e prepara dados basicos na subida.
@asynccontextmanager
async def lifespan(app: FastAPI):
	from pathlib import Path

	from alembic import command
	from alembic.config import Config

	alembic_cfg = Config(str(Path(__file__).parent.parent / "alembic.ini"))
	alembic_cfg.set_main_option("script_location", str(Path(__file__).parent.parent / "migrations"))
	command.upgrade(alembic_cfg, "head")

	# Cria o perfil padrão caso ainda não exista.
	with SessionLocal() as db:
		if db.get(Perfil, 1) is None:
			db.add(Perfil(id=1))
			db.commit()

	yield


app = FastAPI(
	title="Facilita OAB API",
	description=(
		"API do Facilita OAB — companion de estudo para a 1ª fase do Exame "
		"da OAB, com chat mentor, simulados gerados por IA, caderno de "
		"erros, cronograma automático e estatísticas de progresso."
	),
	version="0.3.0",
	lifespan=lifespan,
	openapi_tags=[
		{"name": "Autenticação", "description": "Login por senha única e emissão de token de sessão."},
		{"name": "Perfil", "description": "Dados do próprio usuário: nome e última conversa."},
		{"name": "Chat", "description": "Chat com o mentor (streaming) e histórico de conversas."},
		{"name": "Simulados", "description": "Geração de simulados via IA e histórico de resultados."},
		{"name": "Caderno", "description": "Caderno de erros: questões e dúvidas salvas para revisão."},
		{"name": "Cronograma", "description": "Configuração e plano de estudo automático."},
		{"name": "Estatísticas", "description": "Indicadores de progresso agregados."},
		{"name": "Backup", "description": "Exportação e importação completa dos dados do usuário."},
	],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.cors_origins_list,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


# Router de autenticacao.
auth_router = APIRouter(prefix="/auth", tags=["Autenticação"])


@auth_router.post(
	"/login",
	response_model=TokenResponse,
	summary="Login",
	description="Autentica com a senha única do app e retorna um token JWT de sessão.",
)
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest):
	token = authenticate(body.password)
	return TokenResponse(token=token)


# Router das informacoes do proprio usuario.
me_router = APIRouter(prefix="/me", tags=["Perfil"], dependencies=[Depends(require_authentication)])


# Converte o model do banco para o schema exposto pela API.
def _to_profile_response(profile) -> ProfileResponse:
	last_chat = None

	if profile.ultima_conversa_json is not None:
		last_chat = LastConversation(
			**profile.ultima_conversa_json,
			updatedAt=to_iso_utc(profile.ultima_conversa_atualizada_em),
		)

	return ProfileResponse(
		nome=profile.nome,
		dataProva=profile.data_prova.isoformat() if profile.data_prova else None,
		lastChat=last_chat,
	)


# Integra o prompt do mentor para respostas em streaming no chat.
SYSTEM_PROMPT_CHAT = load_prompt("mentor.md")


# Converte mensagens do frontend para o formato esperado pelo Gemini.
def _to_gemini_content(messages: list[dict]) -> list[types.Content]:
	contents = []

	for message in messages:
		role = "user" if message["role"] == "user" else "model"

		contents.append(
			types.Content(
				role=role,
				parts=[
					types.Part.from_text(text=message["content"])
				],
			)
		)

	return contents


# Gera o stream SSE do chat com contexto opcional da materia atual.
async def stream_chat(messages: list[dict], subject: str | None = None):
	instructions = SYSTEM_PROMPT_CHAT

	if subject:
		instructions += (
			"\n\n# Contexto da sessão atual\n\n"
			f"A estudante está estudando **{subject}** agora. "
			"Priorize exemplos e alertas dessa matéria quando fizer sentido."
		)

	contents = _to_gemini_content(messages)

	config = types.GenerateContentConfig(
		system_instruction=instructions,
		temperature=0.4,
		max_output_tokens=2048,
		thinking_config=types.ThinkingConfig(thinking_budget=0),
	)

	stream = await client.aio.models.generate_content_stream(
		model=model,
		contents=contents,
		config=config,
	)

	async for chunk in stream:
		if chunk.text:
			yield chunk.text


# Fluxo de simulados: prompt, geracao, serializacao e persistencia.
SYSTEM_PROMPT_SIM = load_prompt("simulado.md")


# Formata um resultado salvo para resposta da API.
def serialize_result(result: ResultadoSimulado) -> dict:
	return {
		"id": str(result.id),
		"createdAt": to_iso_utc(result.criado_em),
		"modo": result.modo,
		"materiaFiltro": result.materia_filtro,
		"acertos": result.acertos,
		"total": result.total,
		"elapsedSec": result.duracao_segundos,
		"porMateria": result.por_materia_json,
		"questoes": result.questoes_json,
		"answers": result.respostas_json,
	}


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

	response = await client.aio.models.generate_content(
		model=model,
		contents=user_prompt,
		config=types.GenerateContentConfig(
			system_instruction=SYSTEM_PROMPT_SIM,
			response_mime_type="application/json",
			response_schema=QuestionList,
			temperature=0.75,
			max_output_tokens=16384,
			thinking_config=types.ThinkingConfig(thinking_budget=0),
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


# Fluxo do cronograma: configuracao, plano e limpeza do plano salvo.


# Recupera a configuracao atual do cronograma.
def cronograma_get_config(db: Session) -> ConfiguracaoCronograma | None:
	return db.get(ConfiguracaoCronograma, 1)


# Persiste a configuracao informada pelo usuario.
def cronograma_save_config(db: Session, body: ConfigScheduleRequest) -> ConfiguracaoCronograma:
	config = get_or_create(db, ConfiguracaoCronograma)

	config.horas_por_dia = body.horasPorDia
	config.materias_fracas_json = body.materiasFracas
	config.atualizado_em = datetime.utcnow()

	db.add(config)
	db.commit()
	db.refresh(config)

	return config


# Recupera o plano de estudos gerado anteriormente.
def cronograma_get_plan(db: Session) -> PlanoCronograma | None:
	return db.get(PlanoCronograma, 1)


# Salva o plano de estudos montado pelo frontend.
def cronograma_save_plan(db: Session, body: SchedulePlanRequest) -> PlanoCronograma:
	plan = get_or_create(db, PlanoCronograma)

	plan.gerado_em = to_naive_utc(datetime.fromisoformat(body.geradoEm))
	plan.data_prova = date.fromisoformat(body.dataProva) if body.dataProva else None
	plan.horas_por_dia = body.horasPorDia
	plan.dias_json = body.dias

	db.add(plan)
	db.commit()
	db.refresh(plan)

	return plan


# Remove o plano atual para permitir uma nova geracao.
def cronograma_delete_plan(db: Session) -> None:
	plan = db.get(PlanoCronograma, 1)

	if plan is not None:
		db.delete(plan)
		db.commit()


@me_router.get(
	"",
	response_model=ProfileResponse,
	summary="Obter perfil",
	description="Retorna o nome salvo e o resumo da última conversa do chat.",
)
def me_get_profile(db: Session = Depends(get_session)):
	return _to_profile_response(profile_get(db))


@me_router.patch(
	"",
	response_model=ProfileResponse,
	summary="Atualizar perfil",
	description="Atualiza o nome do usuário.",
)
def update_profile(body: UpdateProfileRequest, db: Session = Depends(get_session)):
	profile = profile_update(db, body)
	return _to_profile_response(profile)


@me_router.put(
	"/last-chat",
	response_model=ProfileResponse,
	summary="Salvar última conversa",
	description="Salva um resumo da conversa mais recente do chat, exibido na tela inicial.",
)
def save_last_chat(body: LastConversationRequest, db: Session = Depends(get_session)):
	profile = profile_save_last_chat(db, body)
	return _to_profile_response(profile)


# Rotas do caderno.
caderno_router = APIRouter(prefix="/me/caderno", tags=["Caderno"], dependencies=[Depends(require_authentication)])


@caderno_router.get(
	"",
	summary="Listar itens",
	description="Lista todos os itens do caderno de erros, de origem simulado ou chat.",
)
def route_list_items(db: Session = Depends(get_session)):
	return [caderno_serialize_item(item) for item in caderno_list_items(db)]


@caderno_router.post(
	"",
	status_code=201,
	summary="Criar item",
	description="Salva uma pergunta e resposta do chat como um novo item no caderno.",
)
def route_create_from_chat(body: CreateNotebookItemFromChat, request: Request, db: Session = Depends(get_session)):
	item = caderno_create_from_chat(db, body, get_client_today(request))
	return caderno_serialize_item(item)


@caderno_router.patch(
	"/{item_id}",
	summary="Atualizar item",
	description="Atualiza o status (aberto/revisando/dominado) ou a anotação pessoal de um item.",
)
def route_update_item(item_id: int, body: UpdateNotebookItem, request: Request, db: Session = Depends(get_session)):
	item = caderno_update_item(db, item_id, body, get_client_today(request))
	return caderno_serialize_item(item)


@caderno_router.delete(
	"/{item_id}",
	status_code=204,
	summary="Remover item",
	description="Remove um item do caderno permanentemente.",
)
def route_delete_item(item_id: int, db: Session = Depends(get_session)):
	caderno_delete_item(db, item_id)
	return None


# Rotas do cronograma.
cronograma_router = APIRouter(prefix="/me/cronograma", tags=["Cronograma"], dependencies=[Depends(require_authentication)])


@cronograma_router.get(
	"/config",
	response_model=ConfigScheduleResponse,
	summary="Obter configuração",
	description="Retorna as horas de estudo por dia e as matérias marcadas como fracas.",
)
def cronograma_route_get_config(db: Session = Depends(get_session)):
	config = cronograma_get_config(db)

	if config is None:
		return ConfigScheduleResponse(
			horasPorDia=2.0,
			materiasFracas=[],
			atualizadoEm=None,
		)

	return ConfigScheduleResponse(
		horasPorDia=config.horas_por_dia,
		materiasFracas=config.materias_fracas_json,
		atualizadoEm=to_iso_utc(config.atualizado_em),
	)


@cronograma_router.put(
	"/config",
	response_model=ConfigScheduleResponse,
	summary="Salvar configuração",
	description="Define horas de estudo por dia e matérias fracas usadas para gerar o plano.",
)
def cronograma_route_save_config(body: ConfigScheduleRequest, db: Session = Depends(get_session)):
	config = cronograma_save_config(db, body)

	return ConfigScheduleResponse(
		horasPorDia=config.horas_por_dia,
		materiasFracas=config.materias_fracas_json,
		atualizadoEm=to_iso_utc(config.atualizado_em),
	)


@cronograma_router.get(
	"/plano",
	response_model=SchedulePlanResponse | None,
	summary="Obter plano",
	description="Retorna o plano de estudo atual, se houver um gerado.",
)
def cronograma_route_get_plan(db: Session = Depends(get_session)):
	plan = cronograma_get_plan(db)

	if plan is None:
		return None

	return SchedulePlanResponse(
		geradoEm=to_iso_utc(plan.gerado_em),
		dataProva=plan.data_prova.isoformat() if plan.data_prova else None,
		horasPorDia=plan.horas_por_dia,
		dias=plan.dias_json,
	)


@cronograma_router.put(
	"/plano",
	response_model=SchedulePlanResponse,
	summary="Salvar plano",
	description="Salva um novo plano de estudo gerado no cliente (com ou sem data de prova definida).",
)
def cronograma_route_save_plan(body: SchedulePlanRequest, db: Session = Depends(get_session)):
	plan = cronograma_save_plan(db, body)

	return SchedulePlanResponse(
		geradoEm=to_iso_utc(plan.gerado_em),
		dataProva=plan.data_prova.isoformat() if plan.data_prova else None,
		horasPorDia=plan.horas_por_dia,
		dias=plan.dias_json,
	)


@cronograma_router.delete(
	"/plano",
	status_code=204,
	summary="Excluir plano",
	description="Remove o plano de estudo atual.",
)
def cronograma_route_delete_plan(db: Session = Depends(get_session)):
	cronograma_delete_plan(db)
	return None


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
async def route_create_simulation(body: SimuladoRequest):
	try:
		return await create_simulation(body.modo, body.materia)
	except Exception as error:
		raise HTTPException(502, detail=resumo_erro_ia(error))


# Rotas de estatisticas.
stats_router = APIRouter(prefix="/me/stats", tags=["Estatísticas"], dependencies=[Depends(require_authentication)])


@stats_router.get(
	"",
	response_model=StatisticsResponse,
	summary="Obter estatísticas",
	description="Retorna nota por simulado ao longo do tempo, acerto por matéria, sequência de estudo e funil do caderno.",
)
def get_stats(request: Request, db: Session = Depends(get_session)):
	return get_statistics_inline(db, get_client_today(request))


# Rotas de exportacao e importacao do backup.
backup_router = APIRouter(prefix="/me", tags=["Backup"], dependencies=[Depends(require_authentication)])


@backup_router.get(
	"/export",
	summary="Exportar dados",
	description="Exporta todos os dados do usuário (caderno, cronograma, simulados) em JSON.",
)
def export_all(db: Session = Depends(get_session)):
	return backup_service.export_all(db)


@backup_router.post(
	"/import",
	summary="Importar dados",
	description="Importa itens do caderno a partir de um backup em JSON, evitando duplicatas.",
)
def import_all(body: ImportRequest, db: Session = Depends(get_session)):
	imported_count = backup_service.import_all(db, body)
	return {"cadernoImportado": imported_count}


# Rotas de conversas do chat (histórico).
conversas_router = APIRouter(prefix="/chat/conversas", tags=["Chat"], dependencies=[Depends(require_authentication)])


@conversas_router.get(
	"",
	response_model=list[ConversaResumo],
	summary="Listar conversas",
	description="Lista o histórico de conversas do chat, mais recentes primeiro.",
)
def conversas_listar(db: Session = Depends(get_session)):
	conversas = db.scalars(select(Conversa).order_by(Conversa.atualizado_em.desc())).all()

	return [
		ConversaResumo(id=c.id, titulo=c.titulo, atualizadaEm=to_iso_utc(c.atualizado_em))
		for c in conversas
	]


@conversas_router.post(
	"",
	status_code=201,
	response_model=ConversaCriada,
	summary="Criar conversa",
	description="Cria uma conversa vazia, sem mensagens ainda.",
)
def conversas_criar(db: Session = Depends(get_session)):
	agora = datetime.utcnow()
	conversa = Conversa(titulo="Nova conversa", criado_em=agora, atualizado_em=agora)

	db.add(conversa)
	db.commit()
	db.refresh(conversa)

	return ConversaCriada(id=conversa.id, titulo=conversa.titulo)


@conversas_router.get(
	"/{conversa_id}",
	response_model=ConversaDetalhe,
	summary="Obter conversa",
	description="Retorna uma conversa com todas as suas mensagens.",
)
def conversas_obter(conversa_id: int, db: Session = Depends(get_session)):
	conversa = db.get(Conversa, conversa_id)

	if conversa is None:
		raise HTTPException(404, "Conversa não encontrada.")

	mensagens = db.scalars(
		select(MensagemChat).where(MensagemChat.conversa_id == conversa_id).order_by(MensagemChat.id)
	).all()

	return ConversaDetalhe(
		id=conversa.id,
		titulo=conversa.titulo,
		criadaEm=to_iso_utc(conversa.criado_em),
		atualizadaEm=to_iso_utc(conversa.atualizado_em),
		mensagens=[
			MensagemChatResponse(id=m.id, papel=m.papel, conteudo=m.conteudo, criadoEm=to_iso_utc(m.criado_em))
			for m in mensagens
		],
	)


@conversas_router.patch(
	"/{conversa_id}",
	response_model=ConversaCriada,
	summary="Renomear conversa",
	description="Atualiza o título de uma conversa existente.",
)
def conversas_renomear(conversa_id: int, body: AtualizarTituloRequest, db: Session = Depends(get_session)):
	conversa = db.get(Conversa, conversa_id)

	if conversa is None:
		raise HTTPException(404, "Conversa não encontrada.")

	conversa.titulo = body.titulo

	db.commit()
	db.refresh(conversa)

	return ConversaCriada(id=conversa.id, titulo=conversa.titulo)


@conversas_router.delete(
	"/{conversa_id}",
	status_code=204,
	summary="Excluir conversa",
	description="Remove uma conversa e todas as suas mensagens.",
)
def conversas_deletar(conversa_id: int, db: Session = Depends(get_session)):
	conversa = db.get(Conversa, conversa_id)

	if conversa is None:
		raise HTTPException(404, "Conversa não encontrada.")

	# As mensagens são removidas pelo banco (ON DELETE CASCADE + foreign_keys=ON).
	db.delete(conversa)
	db.commit()

	return None


# Rota de chat em streaming SSE.
chat_router = APIRouter(tags=["Chat"])


@chat_router.post(
	"/chat",
	dependencies=[Depends(require_authentication)],
	summary="Enviar mensagem",
	description="Envia uma mensagem ao mentor e transmite a resposta via streaming (SSE), criando uma conversa nova se necessário.",
)
async def chat(body: ChatRequest, request: Request, db: Session = Depends(get_session)):
	# Registra atividade do usuário antes de iniciar o streaming.
	register_activity(db, get_client_today(request))

	pergunta = body.messages[-1].content if body.messages else ""

	# Sem conversaId, cria uma conversa nova com título a partir da pergunta.
	if body.conversaId is not None:
		conversa = db.get(Conversa, body.conversaId)
		if conversa is None:
			raise HTTPException(404, "Conversa não encontrada.")
	else:
		agora = datetime.utcnow()
		titulo = (body.tituloConversa or pergunta)[:50]
		conversa = Conversa(titulo=titulo, criado_em=agora, atualizado_em=agora)
		db.add(conversa)
		db.commit()
		db.refresh(conversa)

	db.add(MensagemChat(conversa_id=conversa.id, papel="user", conteudo=pergunta, criado_em=datetime.utcnow()))
	db.commit()

	conversa_id = conversa.id

	async def event_generator():
		# Primeiro evento informa o id da conversa (nova ou existente) pro front acompanhar.
		yield f"data: {json.dumps({'conversaId': conversa_id})}\n\n"

		try:
			messages = [message.model_dump() for message in body.messages]
			resposta_acumulada = ""

			async for chunk in stream_chat(messages, subject=body.materia):
				resposta_acumulada += chunk
				data = json.dumps({"text": chunk}, ensure_ascii=False)
				yield f"data: {data}\n\n"

			# Sessão própria: a injetada por Depends() não é garantida viva
			# até aqui, já que o streaming continua depois da rota retornar.
			if resposta_acumulada:
				with SessionLocal() as db_stream:
					db_stream.add(MensagemChat(
						conversa_id=conversa_id,
						papel="assistant",
						conteudo=resposta_acumulada,
						criado_em=datetime.utcnow(),
					))
					conversa_atual = db_stream.get(Conversa, conversa_id)
					conversa_atual.atualizado_em = datetime.utcnow()
					db_stream.commit()

			yield "data: [DONE]\n\n"

		except Exception as error:
			data = json.dumps({"error": resumo_erro_ia(error)}, ensure_ascii=False)
			yield f"data: {data}\n\n"

	return StreamingResponse(
		event_generator(),
		media_type="text/event-stream",
		headers={
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
			"X-Accel-Buffering": "no",
		},
	)


# Endpoint simples para verificacao de saude da API.
@app.get("/health")
async def health_check():
	return {"status": "ok"}


# Include routers
app.include_router(auth_router)
app.include_router(me_router)
app.include_router(caderno_router)
app.include_router(cronograma_router)
app.include_router(simulados_router)
app.include_router(simulado_router)
app.include_router(stats_router)
app.include_router(backup_router)
app.include_router(conversas_router)
app.include_router(chat_router)

__all__ = ["app"]

