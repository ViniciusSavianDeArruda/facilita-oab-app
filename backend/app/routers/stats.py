from datetime import date, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..activity import get_client_today
from ..db import get_session, ItemCaderno, RegistroAtividade, ResultadoSimulado
from ..schemas import NotebookStatus, StatisticsResponse, SubjectStatistic, TrendPoint
from ..security import require_authentication
from ..serializers import to_iso_utc

# Rotas de estatisticas.
stats_router = APIRouter(prefix="/me/stats", tags=["Estatísticas"], dependencies=[Depends(require_authentication)])


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


@stats_router.get(
	"",
	response_model=StatisticsResponse,
	summary="Obter estatísticas",
	description="Retorna nota por simulado ao longo do tempo, acerto por matéria, sequência de estudo e funil do caderno.",
)
def get_stats(request: Request, db: Session = Depends(get_session)):
	return get_statistics_inline(db, get_client_today(request))


__all__ = ["stats_router"]
