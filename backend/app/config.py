# Configurações centralizadas da aplicação carregadas do ambiente.

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


settings = Settings()
