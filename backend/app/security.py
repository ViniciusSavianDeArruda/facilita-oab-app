"""Primitivas de segurança do app.

Senha única + JWT para proteger as rotas autenticadas.
"""

import hmac
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Request

from .config import settings

ALGORITHM = "HS256"


def verify_password(password: str) -> bool:
    return hmac.compare_digest(
        password.encode("utf-8"),
        settings.APP_PASSWORD.encode("utf-8"),
    )


def create_access_token() -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.ACCESS_TOKEN_EXPIRE_DAYS
    )
    payload = {"sub": "app", "exp": expires_at}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def require_authentication(request: Request) -> None:
    authorization = request.headers.get("Authorization", "")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado.")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")


__all__ = ["verify_password", "create_access_token", "require_authentication"]
