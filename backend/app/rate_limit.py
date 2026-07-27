from slowapi import Limiter
from slowapi.util import get_remote_address

# Limita tentativas de login por IP, pra dificultar força bruta na senha.
limiter = Limiter(key_func=get_remote_address)

__all__ = ["limiter"]
