# This Dockerfile lives in /backend, and the build context is also the backend directory.
# The project root is not available during the build.
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Create a directory for the backend application
RUN mkdir -p /app/backend

# Copy the build context (the contents of the local /backend directory)
# into the container's /app/backend/ directory.
COPY . /app/backend/

# Install dependencies using the correct path to requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Run the app using absolute paths.
# The python path is /app, so imports like `from backend...` work correctly.
CMD ["gunicorn", "--config", "/app/backend/gunicorn.conf.py", "backend.wsgi:app"]