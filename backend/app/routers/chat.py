import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from google.genai import types
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..activity import get_client_today, register_activity
from ..ai import load_prompt, resumo_erro_ia, stream_with_fallback
from ..db import Conversa, get_session, MensagemChat, SessionLocal
from ..rate_limit import limiter
from ..schemas import AtualizarTituloRequest, ChatRequest, ConversaCriada, ConversaDetalhe, ConversaResumo, MensagemChatResponse
from ..security import require_authentication
from ..serializers import to_iso_utc

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
	)

	stream = stream_with_fallback(
		contents=contents,
		config=config,
	)

	async for chunk in stream:
		if chunk.text:
			yield chunk.text


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
@limiter.limit("60/minute")
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


__all__ = ["conversas_router", "chat_router"]
