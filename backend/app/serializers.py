"""Funções auxiliares de serialização e compartilhamento de dados.

Centraliza conversões utilizadas por diferentes módulos para evitar
duplicação de lógica e inconsistências entre implementações.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from .db import ItemCaderno, ResultadoSimulado, Perfil


# Converte uma data para o formato ISO em UTC.
def to_iso_utc(moment: datetime | None) -> str | None:
	if moment is None:
		return None

	from datetime import timezone

	return moment.replace(tzinfo=timezone.utc).isoformat()


# Remove informações de timezone mantendo o horário em UTC.
def to_naive_utc(moment: datetime) -> datetime:
	from datetime import timezone

	if moment.tzinfo is not None:
		return moment.astimezone(timezone.utc).replace(tzinfo=None)

	return moment


# Converte um item do caderno para o formato utilizado pela API.
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


# Converte o resultado de um simulado para o formato de resposta da aplicação.
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


# Recupera o perfil único da aplicação ou cria caso ainda não exista.
def get_or_create_profile(db: Session) -> Perfil:
	from sqlalchemy.exc import IntegrityError

	profile = db.get(Perfil, 1)

	if profile is None:
		profile = Perfil(id=1)
		db.add(profile)

		try:
			db.commit()
		except IntegrityError:
			# Trata possíveis conflitos quando duas requisições criam o perfil
			# ao mesmo tempo.
			db.rollback()
			profile = db.get(Perfil, 1)
		else:
			db.refresh(profile)

	return profile


__all__ = [
	"to_iso_utc",
	"to_naive_utc",
	"caderno_serialize_item",
	"serialize_result",
	"get_or_create_profile",
]
