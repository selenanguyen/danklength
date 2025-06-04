#!/bin/bash

# Custom Remote Game Mode Test Runner
# This script starts the server and runs comprehensive tests

set -e

echo "🚀 Custom Remote Game Mode Test Runner"
echo "======================================"

# Check if server is already running
if lsof -i :3001 >/dev/null 2>&1; then
    echo "✅ Server already running on port 3001"
else
    echo "🔄 Starting server..."
    # Start server in background
    npm run dev:server &
    SERVER_PID=$!
    
    # Wait for server to start
    echo "⏳ Waiting for server to start..."
    for i in {1..10}; do
        if curl -s http://localhost:3001/health >/dev/null 2>&1; then
            echo "✅ Server started successfully"
            break
        fi
        if [ $i -eq 10 ]; then
            echo "❌ Server failed to start"
            exit 1
        fi
        sleep 1
    done
fi

# Run the tests
echo ""
echo "🧪 Running comprehensive tests..."
echo "================================"

node test-custom-remote-game.js

# Store test exit code
TEST_EXIT_CODE=$?

# Cleanup: kill server if we started it
if [ ! -z "$SERVER_PID" ]; then
    echo ""
    echo "🧹 Cleaning up server (PID: $SERVER_PID)..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
fi

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "🎉 All tests passed!"
else
    echo "💥 Some tests failed!"
fi

exit $TEST_EXIT_CODE