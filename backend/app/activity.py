from datetime import date, datetime

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import RegistroAtividade


# Brasília (UTC-3, sem horário de verão): usado quando o cabeçalho falta ou é
# inválido, em vez de UTC, que viraria o dia às 21h para quem estuda à noite.
TZ_PADRAO_MINUTOS = 180
# Limites reais de getTimezoneOffset() (UTC+14 a UTC-12).
TZ_OFFSET_MIN, TZ_OFFSET_MAX = -840, 720


# Calcula a data local do usuário utilizando o offset de fuso horário
# enviado pelo frontend no cabeçalho da requisição.
def get_client_today(request: Request) -> date:
	from datetime import timezone, timedelta

	try:
		# Offset em minutos em relação ao UTC.
		timezone_offset = int(request.headers.get("X-Tz-Offset-Minutes", TZ_PADRAO_MINUTOS))
	except ValueError:
		timezone_offset = TZ_PADRAO_MINUTOS

	# Valor absurdo estouraria o cálculo de data (500) ou gravaria um dia falso.
	if not TZ_OFFSET_MIN <= timezone_offset <= TZ_OFFSET_MAX:
		timezone_offset = TZ_PADRAO_MINUTOS

	# Converte o horário UTC para a data correspondente ao fuso do cliente.
	return (
		datetime.now(timezone.utc) - timedelta(minutes=timezone_offset)
	).date()


# Registra uma atividade diária apenas uma vez para cada data.
def register_activity(db: Session, day: date | None = None) -> None:
	# Utiliza a data atual quando nenhuma data é informada.
	day = day or date.today()

	# Verifica se já existe um registro para o dia informado.
	exists = db.scalar(
		select(RegistroAtividade.id).where(
			RegistroAtividade.data == day
		)
	)

	# Evita criar registros duplicados para a mesma data.
	if exists is not None:
		return

	# Persiste o novo registro de atividade.
	db.add(RegistroAtividade(data=day))


__all__ = ["get_client_today", "register_activity"]
