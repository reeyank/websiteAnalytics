# Use the Python 3 alpine official image
# https://hub.docker.com/_/python
FROM python:3-alpine

# Install system dependencies needed for some Python packages
RUN apk add --no-cache gcc g++ musl-dev linux-headers

# Create and change to the app directory.
WORKDIR /app

# Copy requirements.txt first for better caching
COPY requirements.txt .

# Install project dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the backend code to the container
COPY backend/ .

# Run the web service on container startup.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
