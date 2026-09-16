FROM python:3.12-slim

# Sem isso, o stdout/stderr do Python fica bufferizado quando não há TTY
# (caso do container) — logs (ex.: qual modelo Gemini foi usado) podem
# demorar a aparecer ou nunca aparecer em `docker compose logs`.
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY migrations ./migrations
COPY alembic.ini .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
