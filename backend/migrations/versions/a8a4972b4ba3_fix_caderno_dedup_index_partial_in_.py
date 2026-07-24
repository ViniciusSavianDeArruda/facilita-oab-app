"""fix caderno dedup index partial in postgres

Revision ID: a8a4972b4ba3
Revises: 23afeb965802
Create Date: 2026-07-24 00:43:42.996160

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8a4972b4ba3'
down_revision: Union[str, Sequence[str], None] = '23afeb965802'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # sqlite_where já cria o índice parcial certo desde a migration base
    # (46e791ab5190) — só o Postgres precisa desse fix, já que
    # sqlite_where é ignorado nesse dialeto (virou índice único total).
    if op.get_bind().dialect.name != "postgresql":
        return

    op.drop_index("ix_caderno_dedup_simulado", table_name="itens_caderno")
    op.create_index(
        "ix_caderno_dedup_simulado",
        "itens_caderno",
        ["enunciado"],
        unique=True,
        postgresql_where=sa.text("origem = 'simulado'"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    if op.get_bind().dialect.name != "postgresql":
        return

    op.drop_index("ix_caderno_dedup_simulado", table_name="itens_caderno")
    op.create_index(
        "ix_caderno_dedup_simulado",
        "itens_caderno",
        ["enunciado"],
        unique=True,
    )
