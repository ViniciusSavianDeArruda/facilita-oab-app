from pydantic import AfterValidator, BaseModel, Field
from typing import Annotated, Literal, Optional

from .materias import MATERIAS_CANONICAS


def _materia_conhecida(valor: str | None) -> str | None:
    # A materia entra no prompt do Gemini: so nomes da lista fechada passam.
    if valor is not None and valor not in MATERIAS_CANONICAS:
        raise ValueError("Matéria desconhecida.")
    return valor


MateriaDoPrompt = Annotated[str | None, AfterValidator(_materia_conhecida)]


# --- auth ---
class LoginRequest(BaseModel):
    password: str = Field(max_length=256)


class TokenResponse(BaseModel):
    token: str


# --- chat ---
class Message(BaseModel):
    role: str
    content: str = Field(max_length=10_000)


class ChatRequest(BaseModel):
    messages: list[Message] = Field(max_length=200)
    materia: MateriaDoPrompt = Field(default=None, max_length=100)
    conversaId: int | None = None
    tituloConversa: str | None = Field(default=None, max_length=200)


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
    pergunta: str = Field(max_length=10_000)
    resposta: str = Field(max_length=50_000)
    materia: str | None = Field(default=None, max_length=100)


class UpdateNotebookItem(BaseModel):
    status: Literal["aberto", "revisando", "dominado"] | None = None
    anotacao: str | None = Field(default=None, max_length=5_000)


# --- cronograma ---
class ConfigScheduleRequest(BaseModel):
    horasPorDia: float
    materiasFracas: list = Field(max_length=50)


class ConfigScheduleResponse(BaseModel):
    horasPorDia: float
    materiasFracas: list
    atualizadoEm: Optional[str] = None


class SchedulePlanRequest(BaseModel):
    geradoEm: str
    dataProva: str | None = None
    horasPorDia: float
    dias: list = Field(max_length=400)


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
    nome: str | None = Field(default=None, max_length=100)
    dataProva: str | None = Field(default=None, max_length=32)


class LastConversationRequest(BaseModel):
    pergunta: str = Field(max_length=10_000)
    resposta: str = Field(max_length=50_000)
    materia: str | None = Field(default=None, max_length=100)


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
    materia: MateriaDoPrompt = None


class CreateSimulationResult(BaseModel):
    modo: str = Field(max_length=32)
    materiaFiltro: str | None = Field(default=None, max_length=100)
    questoes: list[Question] = Field(max_length=100)
    answers: dict[str, str] = Field(max_length=100)
    elapsedSec: int = Field(ge=0)
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
    dias: list = Field(max_length=400)


class ImportRequest(BaseModel):
    nome: str | None = None
    dataProva: str | None = None
    caderno: list[LegacyNotebookItem] = Field(max_length=5_000)
    simulados: list[dict] = Field(max_length=1_000)
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
