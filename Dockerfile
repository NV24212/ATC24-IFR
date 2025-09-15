# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy dependency files first to leverage Docker layer caching
COPY backend/requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend code into the container
COPY backend/ /app/backend/

# Copy the wsgi entrypoint and gunicorn config
COPY wsgi.py .
COPY gunicorn.conf.py .

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Run the app using the wsgi entrypoint and the root gunicorn config
CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"]
