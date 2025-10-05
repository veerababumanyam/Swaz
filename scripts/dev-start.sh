#!/bin/bash

# Swaz Data Recovery - Development Server Startup Script
# This script starts both the frontend (Vite) and backend (WebSocket) servers

set -e  # Exit on any error

echo "🚀 Starting Swaz Data Recovery Development Environment..."
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version (require 18+)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server
    npm install
    cd ..
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    echo "✅ Servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend server (WebSocket)
echo "🔧 Starting WebSocket signaling server on port 8080..."
cd server
node index.js &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend server (Vite)
echo "🎨 Starting Vite development server on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Development servers started successfully!"
echo "=================================================="
echo "📱 Frontend (React): http://localhost:5173"
echo "🔌 Backend (WebSocket): ws://localhost:8080"
echo "=================================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $FRONTEND_PID $BACKEND_PID
