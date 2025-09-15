# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the entire project context into the container at /app
# This Dockerfile is expected to be run with the project root as the build context.
COPY . /app/

# Install any needed packages specified in requirements.txt
# Note the path is now relative to the project root.
RUN pip install --no-cache-dir -r backend/requirements.txt

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Run the app using the new wsgi entrypoint and the root gunicorn config
# The user needs to ensure their deployment command runs `docker build -f backend/Dockerfile .` from the project root.
CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"]
