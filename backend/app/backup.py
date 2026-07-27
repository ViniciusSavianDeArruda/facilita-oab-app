"""Exportação e importação dos dados persistidos da aplicação."""

from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import (
    ItemCaderno,
    ConfiguracaoCronograma,
    PlanoCronograma,
    ResultadoSimulado,
    get_or_create,
)
from .schemas import ImportRequest
from .serializers import (
    to_iso_utc,
    to_naive_utc,
    caderno_serialize_item,
    serialize_result,
    get_or_create_profile,
)


def export_all(db: Session) -> dict:
    profile = get_or_create_profile(db)

    notebook = db.scalars(select(ItemCaderno).order_by(ItemCaderno.criado_em.desc())).all()
    simulations = db.scalars(select(ResultadoSimulado).order_by(ResultadoSimulado.criado_em.desc())).all()
    schedule_config = db.get(ConfiguracaoCronograma, 1)
    schedule_plan = db.get(PlanoCronograma, 1)

    return {
        "exportadoEm": to_iso_utc(datetime.utcnow()),
        "perfil": {
            "nome": profile.nome,
            "dataProva": profile.data_prova.isoformat() if profile.data_prova else None,
        },
        "caderno": [caderno_serialize_item(item) for item in notebook],
        "simulados": [serialize_result(item) for item in simulations],
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
                "geradoEm": to_iso_utc(schedule_plan.gerado_em),
                "dataProva": schedule_plan.data_prova.isoformat() if schedule_plan.data_prova else None,
                "horasPorDia": schedule_plan.horas_por_dia,
                "dias": schedule_plan.dias_json,
            }
            if schedule_plan
            else None
        ),
    }


# Importa um backup da aplicação, restaurando os dados e evitando
# duplicatas de questões provenientes de simulados.
def import_all(db: Session, body: ImportRequest) -> int:
    profile = get_or_create_profile(db)

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
                criado_em=to_naive_utc(datetime.fromisoformat(legacy_item.createdAt)),
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
        plan.gerado_em = to_naive_utc(datetime.fromisoformat(body.cronogramaPlano.geradoEm))
        plan.data_prova = (
            date.fromisoformat(body.cronogramaPlano.dataProva)
            if body.cronogramaPlano.dataProva
            else None
        )
        plan.horas_por_dia = body.cronogramaPlano.horasPorDia
        plan.dias_json = body.cronogramaPlano.dias
        db.add(plan)

    db.commit()
    return imported_count
