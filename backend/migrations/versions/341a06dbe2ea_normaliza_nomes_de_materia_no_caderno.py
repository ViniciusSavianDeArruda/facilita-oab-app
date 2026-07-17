"""normaliza nomes de materia no caderno

Revision ID: 341a06dbe2ea
Revises: 06cd3583af4a
Create Date: 2026-07-17 01:51:25.699055

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '341a06dbe2ea'
down_revision: Union[str, Sequence[str], None] = '06cd3583af4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# itens_caderno.materia vinha do texto livre que o Gemini escrevia por
# questao (ver fix em app/main.py:create_simulation, que agora fixa o nome
# curto pedido em simulados focados). Isso deixou nomes inconsistentes nos
# itens ja salvos — mapeia pro nome curto canonico usado em MATERIAS_CRONO/
# MATERIAS_SIMULADO (frontend/src/lib/materias.js). 'Consumidor' nao esta
# nessa lista de propósito (é matéria própria, não faz parte do rodízio de
# cronograma/simulado) — só padroniza o nome, não adiciona ao currículo.
MAPEAMENTO = {
    "Direito Administrativo": "Administrativo",
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


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    for antigo, novo in MAPEAMENTO.items():
        bind.execute(
            sa.text("UPDATE itens_caderno SET materia = :novo WHERE materia = :antigo"),
            {"novo": novo, "antigo": antigo},
        )


def downgrade() -> None:
    """Downgrade schema.

    Reversão best-effort por valor — se itens novos e legítimos já tiverem
    sido criados com esses mesmos nomes curtos (esperado após o fix de
    causa-raiz), esta reversão também os afeta, já que não há como
    distinguir "migrado" de "gerado depois" só pelo valor de materia.
    """
    bind = op.get_bind()
    for antigo, novo in MAPEAMENTO.items():
        bind.execute(
            sa.text("UPDATE itens_caderno SET materia = :antigo WHERE materia = :novo"),
            {"novo": novo, "antigo": antigo},
        )
