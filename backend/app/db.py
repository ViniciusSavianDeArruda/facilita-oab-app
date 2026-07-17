from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={
        "check_same_thread": False
    } if settings.DATABASE_URL.startswith("sqlite") else {},
)


# Pragmas do SQLite aplicadas em toda conexão nova — sem isso, foreign keys
# não são de fato aplicadas pelo banco (só existem como documentação do
# schema), e o modo de journal padrão trava mais sob concorrência.
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _configurar_pragmas_sqlite(conexao_dbapi, _record):
        cursor = conexao_dbapi.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


class Base(DeclarativeBase):
    pass


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create(db, model, id: int = 1):
    return db.get(model, id) or model(id=id)


# --- Models consolidated from app/*/model.py ---
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column


class RegistroAtividade(Base):
    __tablename__ = "registro_atividade"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    data: Mapped[date] = mapped_column(Date)

    __table_args__ = (
        UniqueConstraint("data", name="uq_atividade_data"),
    )


class ItemCaderno(Base):
    __tablename__ = "itens_caderno"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    origem: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="aberto")
    materia: Mapped[str] = mapped_column(String)
    anotacao: Mapped[str] = mapped_column(Text, default="")
    questao_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    enunciado: Mapped[str | None] = mapped_column(Text, nullable=True)
    resposta_dada: Mapped[str | None] = mapped_column(String, nullable=True)
    pergunta: Mapped[str | None] = mapped_column(Text, nullable=True)
    resposta: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index(
            "ix_caderno_dedup_simulado",
            "enunciado",
            unique=True,
            sqlite_where=text("origem = 'simulado'"),
        ),
    )


class ConfiguracaoCronograma(Base):
    __tablename__ = "configuracao_cronograma"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    horas_por_dia: Mapped[float] = mapped_column(Float, default=2.0)
    materias_fracas_json: Mapped[list] = mapped_column(JSON, default=list)
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class PlanoCronograma(Base):
    __tablename__ = "plano_cronograma"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    gerado_em: Mapped[datetime] = mapped_column(DateTime)
    data_prova: Mapped[date | None] = mapped_column(Date, nullable=True)
    horas_por_dia: Mapped[float] = mapped_column(Float)
    dias_json: Mapped[list] = mapped_column(JSON)


class Perfil(Base):
    __tablename__ = "perfil"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    nome: Mapped[str] = mapped_column(String, default="")
    data_prova: Mapped[date | None] = mapped_column(Date, nullable=True)
    ultima_conversa_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ultima_conversa_atualizada_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ResultadoSimulado(Base):
    __tablename__ = "resultados_simulado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    modo: Mapped[str] = mapped_column(String)
    materia_filtro: Mapped[str | None] = mapped_column(String, nullable=True)
    acertos: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(Integer)
    duracao_segundos: Mapped[int] = mapped_column(Integer)
    questoes_json: Mapped[list] = mapped_column(JSON)
    respostas_json: Mapped[dict] = mapped_column(JSON)
    por_materia_json: Mapped[dict] = mapped_column(JSON)


class Conversa(Base):
    __tablename__ = "conversas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MensagemChat(Base):
    __tablename__ = "mensagens_chat"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversa_id: Mapped[int] = mapped_column(ForeignKey("conversas.id", ondelete="CASCADE"))
    # "user" ou "assistant" — mesmos valores usados na integração com o Gemini.
    papel: Mapped[str] = mapped_column(String)
    conteudo: Mapped[str] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


__all__ = [
    "engine",
    "Base",
    "SessionLocal",
    "get_or_create",
    "get_session",
    "RegistroAtividade",
    "ItemCaderno",
    "ConfiguracaoCronograma",
    "PlanoCronograma",
    "Perfil",
    "ResultadoSimulado",
    "Conversa",
    "MensagemChat",
]
