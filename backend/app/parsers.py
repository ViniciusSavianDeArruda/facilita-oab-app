"""Parsers de entrada compartilhados — dados que vêm de fora (request body,
backup importado) podem estar malformados; sem validar aqui, um ValueError
de fromisoformat vira 500 cru em vez de um 422 com mensagem clara."""

from datetime import date, datetime

from fastapi import HTTPException


def _parse_date(value: str, field: str) -> date:
	try:
		return date.fromisoformat(value)
	except ValueError:
		raise HTTPException(422, detail={"field": field, "message": "formato inválido, esperado ISO 8601"})


def _parse_datetime(value: str, field: str) -> datetime:
	try:
		return datetime.fromisoformat(value)
	except ValueError:
		raise HTTPException(422, detail={"field": field, "message": "formato inválido, esperado ISO 8601"})


__all__ = ["_parse_date", "_parse_datetime"]
