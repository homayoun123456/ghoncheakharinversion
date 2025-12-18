#!/bin/bash

# ╔════════════════════════════════════════════════════════════╗
# ║  Ghoncheye Lalehzar - Server Startup Script               ║
# ╚════════════════════════════════════════════════════════════╝

echo ""
echo "🌹 Ghoncheye Lalehzar - Starting Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Navigate to backend directory
cd /workspace/backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🚀 Starting backend server..."
node server.js
