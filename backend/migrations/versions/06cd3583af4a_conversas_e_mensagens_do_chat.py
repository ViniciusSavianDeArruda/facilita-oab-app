"""conversas e mensagens do chat

Revision ID: 06cd3583af4a
Revises: 46e791ab5190
Create Date: 2026-07-16 22:31:28.299275

"""
import json
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '06cd3583af4a'
down_revision: Union[str, Sequence[str], None] = '46e791ab5190'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('conversas',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('titulo', sa.String(), nullable=False),
    sa.Column('criado_em', sa.DateTime(), nullable=False),
    sa.Column('atualizado_em', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('mensagens_chat',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('conversa_id', sa.Integer(), nullable=False),
    sa.Column('papel', sa.String(), nullable=False),
    sa.Column('conteudo', sa.Text(), nullable=False),
    sa.Column('criado_em', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['conversa_id'], ['conversas.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # Preserva a última conversa que já existia em perfil.ultima_conversa_json
    # (formato antigo, sem histórico completo — só pergunta/resposta mais recentes).
    # Sem essa migração de dados, essa conversa se perderia silenciosamente.
    bind = op.get_bind()
    row = bind.execute(
        sa.text("SELECT ultima_conversa_json, ultima_conversa_atualizada_em FROM perfil WHERE id = 1")
    ).fetchone()

    if row and row[0]:
        dados = json.loads(row[0]) if isinstance(row[0], str) else row[0]
        pergunta = dados.get("pergunta")
        resposta = dados.get("resposta")
        quando = row[1] or datetime.utcnow().isoformat()

        if pergunta and resposta:
            titulo = pergunta[:50]
            conversa_id = bind.execute(
                sa.text(
                    "INSERT INTO conversas (titulo, criado_em, atualizado_em) "
                    "VALUES (:titulo, :quando, :quando)"
                ),
                {"titulo": titulo, "quando": quando},
            ).lastrowid

            for papel, conteudo in (("user", pergunta), ("assistant", resposta)):
                bind.execute(
                    sa.text(
                        "INSERT INTO mensagens_chat (conversa_id, papel, conteudo, criado_em) "
                        "VALUES (:conversa_id, :papel, :conteudo, :quando)"
                    ),
                    {"conversa_id": conversa_id, "papel": papel, "conteudo": conteudo, "quando": quando},
                )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('mensagens_chat')
    op.drop_table('conversas')
