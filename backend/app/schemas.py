from pydantic import BaseModel, Field
from typing import Optional


# --- auth ---
class LoginRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    token: str


# --- chat ---
class Message(BaseModel):
    role: str
    content: str = Field(max_length=10_000)


class ChatRequest(BaseModel):
    messages: list[Message]
    materia: str | None = None
    conversaId: int | None = None
    tituloConversa: str | None = None


class ConversaResumo(BaseModel):
    id: int
    titulo: str
    atualizadaEm: str


class ConversaCriada(BaseModel):
    id: int
    titulo: str


class MensagemChatResponse(BaseModel):
    id: int
    papel: str
    conteudo: str
    criadoEm: str


class ConversaDetalhe(BaseModel):
    id: int
    titulo: str
    criadaEm: str
    atualizadaEm: str
    mensagens: list[MensagemChatResponse]


class AtualizarTituloRequest(BaseModel):
    titulo: str = Field(max_length=200)


# --- caderno ---
class CreateNotebookItemFromChat(BaseModel):
    pergunta: str
    resposta: str
    materia: str | None = None


class UpdateNotebookItem(BaseModel):
    status: str | None = None
    anotacao: str | None = Field(default=None, max_length=5_000)


# --- cronograma ---
class ConfigScheduleRequest(BaseModel):
    horasPorDia: float
    materiasFracas: list


class ConfigScheduleResponse(BaseModel):
    horasPorDia: float
    materiasFracas: list
    atualizadoEm: Optional[str] = None


class SchedulePlanRequest(BaseModel):
    geradoEm: str
    dataProva: str | None = None
    horasPorDia: float
    dias: list


class SchedulePlanResponse(BaseModel):
    geradoEm: str
    dataProva: str | None = None
    horasPorDia: float
    dias: list


# --- perfil ---
class LastConversation(BaseModel):
    pergunta: str
    resposta: str
    materia: str | None = None
    updatedAt: str


class ProfileResponse(BaseModel):
    nome: str
    dataProva: Optional[str] = None
    lastChat: LastConversation | None = None


class UpdateProfileRequest(BaseModel):
    nome: str | None = None
    dataProva: str | None = None


class LastConversationRequest(BaseModel):
    pergunta: str
    resposta: str
    materia: str | None = None


# --- simulados ---
class Alternatives(BaseModel):
    A: str
    B: str
    C: str
    D: str


class Question(BaseModel):
    materia: str = Field(description="Nome curto da matéria: Constitucional, Civil, etc.")
    enunciado: str = Field(description="Enunciado narrativo estilo FGV, 3-8 linhas.")
    alternativas: Alternatives
    correta: str = Field(pattern="^[A-D]$", description="Letra da alternativa correta.")
    explicacao: str = Field(description="Explica por que a correta está certa e as outras erradas.")
    fundamento_legal: str = Field(description="Artigo(s) e lei(s) específicos.")


class QuestionList(BaseModel):
    questions: list[Question]


class Simulation(BaseModel):
    id: str
    modo: str
    materia_filtro: str | None
    questoes: list[Question]


class SimuladoRequest(BaseModel):
    modo: str = Field(pattern="^(rapido|materia)$")
    materia: str | None = None


class CreateSimulationResult(BaseModel):
    modo: str
    materiaFiltro: str | None = None
    questoes: list[Question]
    answers: dict[str, str]
    elapsedSec: int
    acertos: int
    total: int
    porMateria: dict[str, dict]


# --- backup ---
class LegacyNotebookItem(BaseModel):
    origin: str
    createdAt: str
    status: str
    materia: str | None = None
    anotacao: str | None = None
    questao: dict | None = None
    pergunta: str | None = None
    respostaDada: str | None = None
    resposta: str | None = None


class LegacyScheduleConfig(BaseModel):
    horasPorDia: float
    materiasFracas: list


class LegacySchedulePlan(BaseModel):
    geradoEm: str
    dataProva: str | None = None
    horasPorDia: float
    dias: list


class ImportRequest(BaseModel):
    nome: str | None = None
    dataProva: str | None = None
    caderno: list[LegacyNotebookItem]
    simulados: list[dict]
    cronogramaConfig: LegacyScheduleConfig | None = None
    cronogramaPlano: LegacySchedulePlan | None = None


# --- stats ---
class SubjectStatistic(BaseModel):
    materia: str
    acertos: int
    total: int


class TrendPoint(BaseModel):
    createdAt: str
    acertos: int
    total: int


class NotebookStatus(BaseModel):
    aberto: int
    revisando: int
    dominado: int


class StatisticsResponse(BaseModel):
    totalSimulados: int
    porMateria: list[SubjectStatistic]
    trend: list[TrendPoint]
    streak: int
    cadernoStatus: NotebookStatus


__all__ = [
    "LoginRequest",
    "TokenResponse",
    "ChatRequest",
    "Message",
    "ConversaResumo",
    "ConversaCriada",
    "MensagemChatResponse",
    "ConversaDetalhe",
    "AtualizarTituloRequest",
    "CreateNotebookItemFromChat",
    "UpdateNotebookItem",
    "ConfigScheduleRequest",
    "ConfigScheduleResponse",
    "SchedulePlanRequest",
    "SchedulePlanResponse",
    "LastConversation",
    "ProfileResponse",
    "UpdateProfileRequest",
    "LastConversationRequest",
    "Alternatives",
    "Question",
    "QuestionList",
    "Simulation",
    "SimuladoRequest",
    "CreateSimulationResult",
    "LegacyNotebookItem",
    "ImportRequest",
    "SubjectStatistic",
    "TrendPoint",
    "NotebookStatus",
    "StatisticsResponse",
]
