"""Authentication helpers consolidated at backend level.

Provides a simple `login` service and re-exports security primitives
from `backend.security`.
"""
from .security import verify_password, create_access_token, require_authentication
from fastapi import HTTPException


def login(password: str) -> str:
    if not verify_password(password):
        raise HTTPException(401, "Senha incorreta.")

    return create_access_token()

__all__ = ["verify_password", "create_access_token", "require_authentication", "login"]
