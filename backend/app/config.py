# Configuração central via variáveis de ambiente.
#
# App de usuário único: proteção por senha fixa (APP_PASSWORD), não por
# cadastro/conta. Falha de forma clara no startup se faltar algo essencial.

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # extra="ignore": variáveis extras no .env (de outra ferramenta, por
    # exemplo) não derrubam o app. Apenas as declaradas abaixo são lidas.
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-flash-latest"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    APP_PASSWORD: str
    JWT_SECRET: str
    ACCESS_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str = "sqlite:///./facilita.db"

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()
