"""Exportação e importação de dados do app."""

from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import (
    ItemCaderno,
    ConfiguracaoCronograma,
    PlanoCronograma,
    ResultadoSimulado,
    get_or_create,
    Perfil,
)
from .schemas import ImportRequest


def _to_iso_utc(moment: datetime | None) -> str | None:
    if moment is None:
        return None

    from datetime import timezone

    return moment.replace(tzinfo=timezone.utc).isoformat()


def _to_naive_utc(moment: datetime) -> datetime:
    from datetime import timezone

    if moment.tzinfo is not None:
        return moment.astimezone(timezone.utc).replace(tzinfo=None)

    return moment


def _serialize_item(item: ItemCaderno) -> dict:
    return {
        "id": str(item.id),
        "createdAt": _to_iso_utc(item.criado_em),
        "origin": item.origem,
        "status": item.status,
        "materia": item.materia,
        "anotacao": item.anotacao,
        "questao": item.questao_json,
        "respostaDada": item.resposta_dada,
        "pergunta": item.pergunta,
        "resposta": item.resposta,
    }


def _serialize_result(result: ResultadoSimulado) -> dict:
    return {
        "id": str(result.id),
        "createdAt": _to_iso_utc(result.criado_em),
        "modo": result.modo,
        "materiaFiltro": result.materia_filtro,
        "acertos": result.acertos,
        "total": result.total,
        "elapsedSec": result.duracao_segundos,
        "porMateria": result.por_materia_json,
        "questoes": result.questoes_json,
        "answers": result.respostas_json,
    }


def _get_or_create_profile(db: Session) -> Perfil:
    profile = db.get(Perfil, 1)
    if profile is None:
        profile = Perfil(id=1)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def export_all(db: Session) -> dict:
    profile = _get_or_create_profile(db)

    notebook = db.scalars(select(ItemCaderno).order_by(ItemCaderno.criado_em.desc())).all()
    simulations = db.scalars(select(ResultadoSimulado).order_by(ResultadoSimulado.criado_em.desc())).all()
    schedule_config = db.get(ConfiguracaoCronograma, 1)
    schedule_plan = db.get(PlanoCronograma, 1)

    return {
        "exportadoEm": _to_iso_utc(datetime.utcnow()),
        "perfil": {
            "nome": profile.nome,
            "dataProva": profile.data_prova.isoformat() if profile.data_prova else None,
        },
        "caderno": [_serialize_item(item) for item in notebook],
        "simulados": [_serialize_result(item) for item in simulations],
        "cronogramaConfig": (
            {
                "horasPorDia": schedule_config.horas_por_dia,
                "materiasFracas": schedule_config.materias_fracas_json,
            }
            if schedule_config
            else None
        ),
        "cronogramaPlano": (
            {
                "geradoEm": _to_iso_utc(schedule_plan.gerado_em),
                "dataProva": schedule_plan.data_prova.isoformat() if schedule_plan.data_prova else None,
                "horasPorDia": schedule_plan.horas_por_dia,
                "dias": schedule_plan.dias_json,
            }
            if schedule_plan
            else None
        ),
    }


def import_all(db: Session, body: ImportRequest) -> int:
    profile = _get_or_create_profile(db)

    if body.nome is not None:
        profile.nome = body.nome

    if body.dataProva is not None:
        profile.data_prova = date.fromisoformat(body.dataProva)

    existing_questions = set(
        db.scalars(select(ItemCaderno.enunciado).where(ItemCaderno.origem == "simulado"))
    )

    imported_count = 0

    for legacy_item in body.caderno:
        enunciado = (
            (legacy_item.questao or {}).get("enunciado")
            if legacy_item.origin == "simulado"
            else None
        )

        if enunciado is not None:
            if enunciado in existing_questions:
                continue
            existing_questions.add(enunciado)

        db.add(
            ItemCaderno(
                criado_em=_to_naive_utc(datetime.fromisoformat(legacy_item.createdAt)),
                origem=legacy_item.origin,
                status=legacy_item.status,
                materia=legacy_item.materia,
                anotacao=legacy_item.anotacao,
                questao_json=legacy_item.questao,
                enunciado=enunciado,
                resposta_dada=legacy_item.respostaDada,
                pergunta=legacy_item.pergunta,
                resposta=legacy_item.resposta,
            )
        )
        imported_count += 1

    if body.cronogramaConfig is not None:
        config = get_or_create(db, ConfiguracaoCronograma)
        config.horas_por_dia = body.cronogramaConfig.horasPorDia
        config.materias_fracas_json = body.cronogramaConfig.materiasFracas
        config.atualizado_em = datetime.utcnow()
        db.add(config)

    if body.cronogramaPlano is not None:
        plan = get_or_create(db, PlanoCronograma)
        plan.gerado_em = _to_naive_utc(datetime.fromisoformat(body.cronogramaPlano.geradoEm))
        plan.data_prova = date.fromisoformat(body.cronogramaPlano.dataProva) if body.cronogramaPlano.dataProva else None
        plan.horas_por_dia = body.cronogramaPlano.horasPorDia
        plan.dias_json = body.cronogramaPlano.dias
        db.add(plan)

    db.commit()
    return imported_count
