# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the backend directory contents into the container at /app
# This assumes you build the Docker image from the root of the repository
COPY backend/ /app/

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Run app.py when the container launches using Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
