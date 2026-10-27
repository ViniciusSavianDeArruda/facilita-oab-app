# Configurações centralizadas da aplicação carregadas do ambiente.

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Ignora variáveis extras presentes no .env que não são utilizadas.
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    # Mantém o ambiente em produção por padrão, priorizando a configuração
    # mais segura caso a variável ENV não seja definida.
    ENV: str = "production"

    @field_validator("ENV")
    @classmethod
    def _normalizar_env(cls, valor: str) -> str:
        return valor.strip().lower()

    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-3.5-flash"
    GEMINI_MODEL_FALLBACK: str = "gemini-3.6-flash"

    # O simulado é uma resposta estruturada maior que o chat. O prazo total
    # evita somar dois timeouts longos quando o fallback é necessário.
    SIMULADO_GENERATION_TIMEOUT_SECONDS: float = 90.0
    SIMULADO_PRIMARY_TIMEOUT_SECONDS: float = 60.0

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    APP_PASSWORD: str
    JWT_SECRET: str
    ACCESS_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str = "sqlite:///./facilita.db"

    # Converte a lista de origens do CORS em uma lista de strings.
    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


AMBIENTES_SEM_VALIDACAO_DE_SEGREDOS = {"dev", "test"}
JWT_SECRET_TAMANHO_MINIMO = 32
APP_PASSWORD_TAMANHO_MINIMO = 8
_VALORES_CONHECIDOS = {
    "troque_isso_por_uma_senha_forte",
    "troque_isso_por_um_segredo_aleatorio",
    "changeme",
    "change-me",
    "change_me",
    "secret",
    "password",
    "senha",
    "admin",
    "123456",
    "12345678",
    "your-secret-key",
    "ci-dummy-password",
}


def _segredo_fraco(valor: str, tamanho_minimo: int) -> str | None:
    texto = valor.strip()
    if not texto:
        return "vazio"
    if texto.lower() in _VALORES_CONHECIDOS or texto.lower().startswith(("troque_", "ci-dummy")):
        return "valor de exemplo/placeholder conhecido"
    if len(texto) < tamanho_minimo:
        return f"menor que {tamanho_minimo} caracteres"
    if len(set(texto)) == 1:
        return "caractere repetido"
    return None


# Devolve só nomes de variáveis e motivos: nunca o valor do segredo.
def problemas_de_segredos(env: str, jwt_secret: str, app_password: str) -> list[str]:
    if env.strip().lower() in AMBIENTES_SEM_VALIDACAO_DE_SEGREDOS:
        return []

    problemas = []
    for nome, valor, minimo in (
        ("JWT_SECRET", jwt_secret, JWT_SECRET_TAMANHO_MINIMO),
        ("APP_PASSWORD", app_password, APP_PASSWORD_TAMANHO_MINIMO),
    ):
        motivo = _segredo_fraco(valor, minimo)
        if motivo:
            problemas.append(f"{nome}: {motivo}")
    return problemas


settings = Settings()

_problemas = problemas_de_segredos(settings.ENV, settings.JWT_SECRET, settings.APP_PASSWORD)
if _problemas:
    raise RuntimeError(
        "Configuração insegura para ENV="
        + settings.ENV
        + " ("
        + "; ".join(_problemas)
        + "). Defina segredos fortes no ambiente."
    )
