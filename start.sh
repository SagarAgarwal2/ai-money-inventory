#!/bin/bash
# AI Money Mentor - One-command startup
# Usage: chmod +x start.sh && ./start.sh

set -e

echo "🚀 Starting AI Money Mentor..."

# Start backend
echo "📦 Starting FastAPI backend..."
cd backend
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 3
echo "✅ Backend running at http://localhost:8000"

# Start frontend
echo "⚛️  Starting React frontend..."
cd frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✨ AI Money Mentor is running!"
echo "   Frontend: http://localhost:5173"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
