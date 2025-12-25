#!/bin/bash

echo "Starting Website Analytics API Server..."
echo "========================================="
echo ""

# Activate virtual environment
source venv/bin/activate

# Start FastAPI server
echo "Starting server on http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
