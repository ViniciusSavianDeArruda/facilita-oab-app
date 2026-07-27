from datetime import date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import backup as backup_service
from ..db import get_session
from ..schemas import (
	ImportRequest,
	LastConversation,
	LastConversationRequest,
	ProfileResponse,
	UpdateProfileRequest,
)
from ..security import require_authentication
from ..serializers import get_or_create_profile, to_iso_utc

# Router das informacoes do proprio usuario.
me_router = APIRouter(prefix="/me", tags=["Perfil"], dependencies=[Depends(require_authentication)])


# Regras do perfil: carregar, criar e persistir os dados do usuario.
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


__all__ = ["me_router", "backup_router"]
