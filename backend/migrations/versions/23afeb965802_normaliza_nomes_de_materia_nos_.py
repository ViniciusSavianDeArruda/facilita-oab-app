"""normaliza nomes de materia nos resultados de simulado

Revision ID: 23afeb965802
Revises: 341a06dbe2ea
Create Date: 2026-07-17 22:43:12.703197

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '23afeb965802'
down_revision: Union[str, Sequence[str], None] = '341a06dbe2ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Mesmo mapeamento da migracao 341a06dbe2ea (Caderno), mais "Direito
# Ambiental" -> "Ambiental", que nao apareceu nos itens do caderno na
# epoca mas aparece nos resultados de simulado.
MAPEAMENTO = {
    "Direito Administrativo": "Administrativo",
    "Direito Ambiental": "Ambiental",
    "Direito Civil": "Civil",
    "Direito Constitucional": "Constitucional",
    "Direito Empresarial": "Empresarial",
    "Direito Penal": "Penal",
    "Direito Processual Civil": "Processo Civil",
    "Direito Processual Penal": "Processo Penal",
    "Direito Tributário": "Tributário",
    "Direito do Consumidor": "Consumidor",
    "Direito do Trabalho": "Trabalho",
    "Estatuto da Advocacia e da OAB": "Ética",
}


def _renomear_por_materia(bruto: dict) -> dict:
    # Soma valores se o rename colidir duas chaves antigas na mesma linha
    # (ex.: uma linha tivesse "Processo Civil" e "Direito Processual
    # Civil" ao mesmo tempo) — nao acontece nos dados atuais, mas e
    # seguro independente disso.
    normalizado: dict = {}
    for materia, valores in bruto.items():
        nome_novo = MAPEAMENTO.get(materia, materia)
        acumulado = normalizado.setdefault(nome_novo, {"acertos": 0, "total": 0})
        acumulado["acertos"] += valores.get("acertos", 0)
        acumulado["total"] += valores.get("total", 0)
    return normalizado


def _renomear_questoes(questoes: list) -> list:
    for questao in questoes:
        if questao.get("materia") in MAPEAMENTO:
            questao["materia"] = MAPEAMENTO[questao["materia"]]
    return questoes


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    linhas = bind.execute(
        sa.text("SELECT id, por_materia_json, questoes_json FROM resultados_simulado")
    ).fetchall()

    for id_, por_materia_bruto, questoes_bruto in linhas:
        por_materia = (
            json.loads(por_materia_bruto)
            if isinstance(por_materia_bruto, str)
            else por_materia_bruto
        )
        questoes = (
            json.loads(questoes_bruto)
            if isinstance(questoes_bruto, str)
            else questoes_bruto
        )

        por_materia_novo = _renomear_por_materia(por_materia)
        questoes_novo = _renomear_questoes(questoes)

        bind.execute(
            sa.text(
                "UPDATE resultados_simulado SET por_materia_json = :pm, "
                "questoes_json = :q WHERE id = :id"
            ),
            {
                "pm": json.dumps(por_materia_novo, ensure_ascii=False),
                "q": json.dumps(questoes_novo, ensure_ascii=False),
                "id": id_,
            },
        )


def downgrade() -> None:
    """Downgrade schema.

    Reversao best-effort nao e possivel aqui sem perda: quando duas
    chaves antigas colidem no mesmo nome curto (ex.: uma linha ja tinha
    "Processo Civil" e outra tinha "Direito Processual Civil"), o valor
    somado nao da pra desfazer sem saber qual parcela veio de qual nome
    original. Downgrade e um no-op de proposito — restaure o backup
    feito antes desta migracao se precisar reverter de verdade.
    """
    pass
