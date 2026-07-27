"""Utilitários de autenticação da aplicação.

Centraliza o processo de login e reexporta os recursos de autenticação
utilizados pelo backend.
"""

from fastapi import HTTPException

from .security import verify_password, create_access_token, require_authentication


# Valida a senha informada e gera um novo token de acesso.
def login(password: str) -> str:
    if not verify_password(password):
        raise HTTPException(401, "Senha incorreta.")

    return create_access_token()


__all__ = [
    "verify_password",
    "create_access_token",
    "require_authentication",
    "login",
]
