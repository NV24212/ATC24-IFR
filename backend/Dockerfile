# This Dockerfile lives in /backend, but the build context is the project root.
# e.g., the build command should be `docker build -f backend/Dockerfile .`
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy dependency file from the backend directory in the build context.
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application code into a backend directory in the image
COPY backend/ /app/backend/

# Copy root files needed for the application into the image root
COPY wsgi.py .
COPY gunicorn.conf.py .

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Run the app using the wsgi entrypoint and the root gunicorn config
CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"]
