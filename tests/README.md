# Swaz Data Recovery Labs - Playwright Test Suite

This directory contains comprehensive end-to-end tests for the Swaz Data Recovery application using Playwright.

## 📁 Test Structure

```
tests/
├── README.md                    # This file
├── 00-setup.spec.ts            # Environment setup and basic functionality tests
├── 01-frontend-ui.spec.ts      # Frontend UI component tests
├── 02-websocket-connection.spec.ts  # WebSocket connection and signaling tests
└── 03-file-transfer.spec.ts    # End-to-end file transfer tests
```

## 🧪 Test Suites Overview

### 1. Setup and Environment Tests (`00-setup.spec.ts`)
- ✅ Basic page loading and rendering
- ✅ Backend server connectivity
- ✅ Frontend assets loading
- ✅ Responsive design verification
- ✅ Browser compatibility checks
- ✅ Error handling verification
- ✅ Performance metrics validation

### 2. Frontend UI Tests (`01-frontend-ui.spec.ts`)
- ✅ Main page navigation
- ✅ Sender/Receiver mode switching
- ✅ Room ID generation and validation
- ✅ QR code modal functionality
- ✅ Copy-to-clipboard functionality
- ✅ Input validation and error messages
- ✅ Mobile responsiveness
- ✅ Keyboard navigation
- ✅ Browser back button handling

### 3. WebSocket Connection Tests (`02-websocket-connection.spec.ts`)
- ✅ WebSocket connection establishment
- ✅ Room join message handling
- ✅ Connection error handling
- ✅ Reconnection logic
- ✅ Multiple connection support
- ✅ Message parsing validation
- ✅ Connection lifecycle management

### 4. File Transfer Tests (`03-file-transfer.spec.ts`)
- ✅ End-to-end file transfer between sender and receiver
- ✅ File selection and information display
- ✅ Multiple file selection
- ✅ Transfer progress tracking
- ✅ Transfer cancellation
- ✅ Invalid file type handling
- ✅ Large file transfer support
- ✅ Network interruption handling
- ✅ Transfer speed and ETA display

## 🚀 Running Tests

### Quick Start
```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests in headed mode (visible browser)
npm run test:headed

# Run tests in debug mode
npm run test:debug

# Show test report
npm run test:report
```

### Comprehensive Test Suite
```bash
# Run the complete test suite with proper setup
./scripts/run-tests.sh
```

### Individual Test Suites
```bash
# Run specific test file
npx playwright test tests/01-frontend-ui.spec.ts

# Run tests by name pattern
npx playwright test --grep "Room ID"

# Run tests in specific browser
npx playwright test --project=chromium
```

## 🔧 Test Configuration

The tests are configured in `playwright.config.ts` with the following features:

- **Multi-browser testing**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Automatic server startup**: Frontend (Vite) and Backend (WebSocket) servers
- **Screenshots and videos**: Captured on test failures
- **Trace collection**: For debugging failed tests
- **Parallel execution**: Tests run in parallel for faster execution
- **Retry logic**: Failed tests are retried on CI

## 📊 Test Reports

After running tests, you can view detailed reports:

```bash
# HTML report
npm run test:report

# JSON report
npx playwright test --reporter=json --output-file=results.json

# JUnit report
npx playwright test --reporter=junit --output-file=results.xml
```

## 🛠️ Test Development

### Adding New Tests

1. Create a new test file in the `tests/` directory
2. Follow the naming convention: `XX-description.spec.ts`
3. Use descriptive test names and organize tests in logical groups
4. Add proper setup and teardown logic
5. Include both positive and negative test cases

### Test Data

- Test files are created dynamically during test execution
- Clean up test files in `afterAll` hooks
- Use realistic test data that matches production scenarios

### Best Practices

- Use `data-testid` attributes for reliable element selection
- Wait for network idle state when appropriate
- Use proper assertions with meaningful error messages
- Test both happy path and error scenarios
- Include accessibility and performance considerations

## 🐛 Debugging Tests

### Debug Mode
```bash
# Run in debug mode with browser dev tools
npx playwright test --debug

# Debug specific test
npx playwright test tests/01-frontend-ui.spec.ts --debug
```

### Trace Viewer
```bash
# Open trace viewer for failed tests
npx playwright show-trace test-results/trace.zip
```

### Screenshots and Videos
- Screenshots are automatically captured on test failures
- Videos are recorded for failed tests
- Both are saved in the `test-results/` directory

## 🔍 Troubleshooting

### Common Issues

1. **Server Connection Issues**
   - Ensure both frontend and backend servers are running
   - Check port availability (5173 for frontend, 8080 for backend)
   - Verify firewall settings

2. **WebSocket Connection Failures**
   - Check if WebSocket server is properly configured
   - Verify network connectivity
   - Check browser console for WebSocket errors

3. **File Upload Issues**
   - Ensure test files are created properly
   - Check file permissions
   - Verify file size limits

4. **Timing Issues**
   - Add appropriate wait conditions
   - Use `waitForLoadState('networkidle')` for network-dependent operations
   - Increase timeouts if needed

### Getting Help

- Check the [Playwright documentation](https://playwright.dev/)
- Review test logs in the console output
- Use the trace viewer to debug complex issues
- Check the generated HTML report for detailed failure information

## 📈 Performance Testing

The test suite includes basic performance monitoring:

- Page load time validation
- DOM content loaded time checks
- First paint and first contentful paint metrics
- Network request monitoring

For more detailed performance testing, consider adding:
- Lighthouse audits
- Web Vitals monitoring
- Load testing with multiple concurrent users

## 🔄 Continuous Integration

The tests are designed to run in CI environments:

- Automatic server startup and teardown
- Proper error handling and cleanup
- Retry logic for flaky tests
- Comprehensive reporting for CI systems

To run in CI:
```bash
# Install dependencies
npm ci
npx playwright install --with-deps

# Run tests
npm run test
```
