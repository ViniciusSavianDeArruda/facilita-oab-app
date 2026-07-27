from datetime import date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import ConfiguracaoCronograma, get_or_create, get_session, PlanoCronograma
from ..schemas import ConfigScheduleRequest, ConfigScheduleResponse, SchedulePlanRequest, SchedulePlanResponse
from ..security import require_authentication
from ..serializers import to_iso_utc, to_naive_utc

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


__all__ = ["cronograma_router"]
