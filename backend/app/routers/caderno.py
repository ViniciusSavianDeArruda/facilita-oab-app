from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..activity import get_client_today, register_activity
from ..db import get_session, ItemCaderno
from ..schemas import CreateNotebookItemFromChat, UpdateNotebookItem
from ..security import require_authentication
from ..serializers import caderno_serialize_item

# Rotas do caderno.
caderno_router = APIRouter(prefix="/me/caderno", tags=["Caderno"], dependencies=[Depends(require_authentication)])


# Regras do caderno: serializacao, criacao, edicao e exclusao de itens.
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


__all__ = ["caderno_router"]
