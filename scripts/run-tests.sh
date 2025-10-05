#!/bin/bash

# Comprehensive Test Runner for Swaz Data Recovery Labs
# This script runs all Playwright tests with proper setup and reporting

set -e

echo "🧪 Swaz Data Recovery Labs - Comprehensive Test Suite"
echo "====================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    print_error "Playwright not found. Installing..."
    npm install --save-dev @playwright/test
    npx playwright install
fi

print_status "Starting test environment setup..."

# Kill any existing processes
print_status "Cleaning up existing processes..."
pkill -f "vite" || true
pkill -f "node.*index.js" || true
sleep 2

# Start the development servers
print_status "Starting development servers..."
./scripts/dev-start.sh &
SERVER_PID=$!

# Wait for servers to start
print_status "Waiting for servers to start..."
sleep 10

# Check if servers are running
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 | grep -q "200"; then
    print_error "Frontend server not responding on port 5173"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "404"; then
    print_warning "Backend server may not be responding on port 8080"
fi

print_success "Servers are running!"

# Run different test suites
print_status "Running comprehensive test suite..."

# Test 1: Setup and Environment Tests
print_status "1/4 Running setup and environment tests..."
npx playwright test tests/00-setup.spec.ts --reporter=line || {
    print_error "Setup tests failed!"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
}

# Test 2: Frontend UI Tests
print_status "2/4 Running frontend UI tests..."
npx playwright test tests/01-frontend-ui.spec.ts --reporter=line || {
    print_error "Frontend UI tests failed!"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
}

# Test 3: WebSocket Connection Tests
print_status "3/4 Running WebSocket connection tests..."
npx playwright test tests/02-websocket-connection.spec.ts --reporter=line || {
    print_error "WebSocket connection tests failed!"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
}

# Test 4: File Transfer Tests
print_status "4/4 Running file transfer tests..."
npx playwright test tests/03-file-transfer.spec.ts --reporter=line || {
    print_error "File transfer tests failed!"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
}

# Generate comprehensive test report
print_status "Generating test report..."
npx playwright test --reporter=html --output-dir=test-results

print_success "All tests completed successfully!"
print_status "Test results saved to test-results/ directory"

# Show test summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo "✅ Setup and Environment Tests"
echo "✅ Frontend UI Tests"
echo "✅ WebSocket Connection Tests"
echo "✅ File Transfer Tests"
echo ""
echo "🎉 All test suites passed!"

# Clean up
print_status "Cleaning up..."
kill $SERVER_PID 2>/dev/null || true
sleep 2

print_success "Test suite completed successfully!"
echo ""
echo "To view the detailed test report, run:"
echo "npm run test:report"
echo ""
echo "To run tests in UI mode, run:"
echo "npm run test:ui"
