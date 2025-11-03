FROM python:3.9-slim

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir -r /app/requirements.txt

ENV SERVER_MAINTENANCE=true

EXPOSE 5000

CMD ["gunicorn", "--config", "/app/gunicorn.conf.py", "wsgi:app"]
