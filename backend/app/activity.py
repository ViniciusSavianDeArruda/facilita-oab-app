from datetime import date, datetime

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import RegistroAtividade


# Usa o offset enviado pelo frontend para calcular o dia local do cliente.
def get_client_today(request: Request) -> date:
	from datetime import timezone, timedelta

	try:
		timezone_offset = int(request.headers.get("X-Tz-Offset-Minutes", "0"))
	except ValueError:
		timezone_offset = 0

	return (
		datetime.now(timezone.utc) - timedelta(minutes=timezone_offset)
	).date()


# Garante que cada dia seja contabilizado uma vez na tabela de atividades.
def register_activity(db: Session, day: date | None = None) -> None:
	day = day or date.today()

	exists = db.scalar(
		select(RegistroAtividade.id).where(
			RegistroAtividade.data == day
		)
	)

	if exists is not None:
		return

	db.add(RegistroAtividade(data=day))


__all__ = ["get_client_today", "register_activity"]
