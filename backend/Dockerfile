# This Dockerfile lives in /backend, but the build context is the project root.
# e.g., the build command should be `docker build -f backend/Dockerfile .`
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the entire project context into the /app directory
COPY . .

# --- DEBUGGING: List all files in the /app directory ---
RUN ls -laR /app

# Install dependencies from the requirements file now located at /app/backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Run the app using the moved config and wsgi files.
# The python path is /app, so imports like `from backend...` work.
CMD ["gunicorn", "--config", "backend/gunicorn.conf.py", "backend.wsgi:app"]
