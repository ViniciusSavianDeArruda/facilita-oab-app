from fastapi import APIRouter, Request

from ..auth import login as authenticate
from ..rate_limit import limiter
from ..schemas import LoginRequest, TokenResponse

# Router de autenticacao.
auth_router = APIRouter(prefix="/auth", tags=["Autenticação"])


@auth_router.post(
	"/login",
	response_model=TokenResponse,
	summary="Login",
	description="Autentica com a senha única do app e retorna um token JWT de sessão.",
)
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest):
	token = authenticate(body.password)
	return TokenResponse(token=token)


__all__ = ["auth_router"]
