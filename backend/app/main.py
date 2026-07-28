# Bootstrap da aplicacao FastAPI: config, banco, schemas e montagem dos routers.
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .rate_limit import limiter


# Headers de resposta padrão pra hardening básico (sem HSTS — o Fly.io já
# aplica na borda — nem CSP, que fica pra depois).
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
	async def dispatch(self, request: Request, call_next):
		response = await call_next(request)
		response.headers["X-Content-Type-Options"] = "nosniff"
		response.headers["X-Frame-Options"] = "DENY"
		response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
		return response

# Configuracoes globais e acesso ao banco de dados.
from .config import settings
from .db import SessionLocal, Perfil
from .routers import stats, auth, perfil, caderno, cronograma, simulado, chat


# Lifecycle da aplicacao: aplica migrations e prepara dados basicos na subida.
@asynccontextmanager
async def lifespan(app: FastAPI):
	from pathlib import Path

	from alembic import command
	from alembic.config import Config

	alembic_cfg = Config(str(Path(__file__).parent.parent / "alembic.ini"))
	alembic_cfg.set_main_option("script_location", str(Path(__file__).parent.parent / "migrations"))
	command.upgrade(alembic_cfg, "head")

	# Cria o perfil padrão caso ainda não exista.
	with SessionLocal() as db:
		if db.get(Perfil, 1) is None:
			db.add(Perfil(id=1))
			db.commit()

	yield


# Docs interativas só em dev — nao expor /docs, /redoc, /openapi.json
# publicamente em produção.
_is_dev = settings.ENV == "dev"

app = FastAPI(
	title="Facilita OAB API",
	description=(
		"API do Facilita OAB — companion de estudo para a 1ª fase do Exame "
		"da OAB, com chat mentor, simulados gerados por IA, caderno de "
		"erros, cronograma automático e estatísticas de progresso."
	),
	version="0.3.0",
	lifespan=lifespan,
	docs_url="/docs" if _is_dev else None,
	redoc_url="/redoc" if _is_dev else None,
	openapi_url="/openapi.json" if _is_dev else None,
	openapi_tags=[
		{"name": "Autenticação", "description": "Login por senha única e emissão de token de sessão."},
		{"name": "Perfil", "description": "Dados do próprio usuário: nome e última conversa."},
		{"name": "Chat", "description": "Chat com o mentor (streaming) e histórico de conversas."},
		{"name": "Simulados", "description": "Geração de simulados via IA e histórico de resultados."},
		{"name": "Caderno", "description": "Caderno de erros: questões e dúvidas salvas para revisão."},
		{"name": "Cronograma", "description": "Configuração e plano de estudo automático."},
		{"name": "Estatísticas", "description": "Indicadores de progresso agregados."},
		{"name": "Backup", "description": "Exportação e importação completa dos dados do usuário."},
	],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.cors_origins_list,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.add_middleware(SecurityHeadersMiddleware)


# Endpoint simples para verificacao de saude da API.
@app.get("/health")
@app.head("/health")
async def health_check():
	return {"status": "ok"}


# Include routers
app.include_router(auth.auth_router)
app.include_router(perfil.me_router)
app.include_router(caderno.caderno_router)
app.include_router(cronograma.cronograma_router)
app.include_router(simulado.simulados_router)
app.include_router(simulado.simulado_router)
app.include_router(stats.stats_router)
app.include_router(perfil.backup_router)
app.include_router(chat.conversas_router)
app.include_router(chat.chat_router)

__all__ = ["app"]

