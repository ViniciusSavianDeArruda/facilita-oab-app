FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY migrations ./migrations
COPY alembic.ini .

EXPOSE 8000

# Se for usar SQLite em produção, monte um volume persistente e aponte
# DATABASE_URL pra ele, ex.: sqlite:////data/facilita.db (Fly.io volumes,
# Railway volumes, disco persistente do Render). Sem isso, o arquivo é
# apagado a cada redeploy/restart em plataformas com filesystem efêmero.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
