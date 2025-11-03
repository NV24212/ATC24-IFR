FROM python:3.9-slim

WORKDIR /app

COPY ./backend /app

RUN pip install --no-cache-dir -r /app/requirements.txt

EXPOSE 5000

CMD ["gunicorn", "--config", "/app/gunicorn.conf.py", "wsgi:app"]
