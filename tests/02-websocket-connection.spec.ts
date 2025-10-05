import { test, expect } from '@playwright/test';

test.describe('Swaz Data Recovery - WebSocket Connection Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should establish WebSocket connection when starting sender', async ({ page }) => {
    // Listen for WebSocket connections
    const wsPromise = page.waitForEvent('websocket');
    
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket connection
    const ws = await wsPromise;
    expect(ws.url()).toBe('ws://localhost:8080/');
    
    // Check if connection is open
    expect(ws.isClosed()).toBeFalsy();
  });

  test('should send room join message when starting sender', async ({ page }) => {
    const wsPromise = page.waitForEvent('websocket');
    
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    const ws = await wsPromise;
    
    // Listen for messages
    const messages: any[] = [];
    ws.on('framereceived', (event) => {
      try {
        const data = JSON.parse(event.payload as string);
        messages.push(data);
      } catch (e) {
        // Ignore non-JSON messages
      }
    });
    
    // Wait a bit for messages
    await page.waitForTimeout(2000);
    
    // Should have received room-joined message
    expect(messages.length).toBeGreaterThan(0);
    const roomJoinedMessage = messages.find(msg => msg.type === 'room-joined');
    expect(roomJoinedMessage).toBeTruthy();
    expect(roomJoinedMessage.payload.roomId).toBeTruthy();
    
    // Validate Room ID format
    const roomId = roomJoinedMessage.payload.roomId;
    const validRoomIdRegex = /^[a-zA-Z0-9-]+$/;
    expect(validRoomIdRegex.test(roomId)).toBeTruthy();
  });

  test('should handle WebSocket connection errors gracefully', async ({ page }) => {
    // Mock WebSocket to simulate connection failure
    await page.addInitScript(() => {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          // Simulate immediate connection failure
          setTimeout(() => {
            this.dispatchEvent(new Event('error'));
          }, 100);
        }
      };
    });
    
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    // Should still show the UI even if WebSocket fails
    await expect(page.locator('text=Share Room ID')).toBeVisible();
  });

  test('should establish WebSocket connection when starting receiver', async ({ page }) => {
    const wsPromise = page.waitForEvent('websocket');
    
    await page.click('text=Start Receiving');
    await page.waitForLoadState('networkidle');
    
    // Enter a valid Room ID
    await page.fill('input[placeholder*="Room ID"]', 'test-room-123');
    
    // Click join button (if exists)
    const joinButton = page.locator('button:has-text("Join")');
    if (await joinButton.isVisible()) {
      await joinButton.click();
    }
    
    // Wait for WebSocket connection
    const ws = await wsPromise;
    expect(ws.url()).toBe('ws://localhost:8080/');
    expect(ws.isClosed()).toBeFalsy();
  });

  test('should send join room message with Room ID when receiver joins', async ({ page }) => {
    const wsPromise = page.waitForEvent('websocket');
    
    await page.click('text=Start Receiving');
    await page.waitForLoadState('networkidle');
    
    const ws = await wsPromise;
    
    // Listen for sent messages
    const sentMessages: any[] = [];
    ws.on('framesent', (event) => {
      try {
        const data = JSON.parse(event.payload as string);
        sentMessages.push(data);
      } catch (e) {
        // Ignore non-JSON messages
      }
    });
    
    // Enter Room ID and join
    const roomId = 'test-room-456';
    await page.fill('input[placeholder*="Room ID"]', roomId);
    
    // Look for join button or trigger join logic
    const joinButton = page.locator('button:has-text("Join")');
    if (await joinButton.isVisible()) {
      await joinButton.click();
    } else {
      // If no join button, trigger by pressing Enter
      await page.press('input[placeholder*="Room ID"]', 'Enter');
    }
    
    await page.waitForTimeout(1000);
    
    // Should have sent join-room message
    expect(sentMessages.length).toBeGreaterThan(0);
    const joinMessage = sentMessages.find(msg => msg.type === 'join-room');
    expect(joinMessage).toBeTruthy();
    expect(joinMessage.payload.roomId).toBe(roomId);
  });

  test('should handle WebSocket reconnection', async ({ page }) => {
    const wsPromise = page.waitForEvent('websocket');
    
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    const ws = await wsPromise;
    
    // Close the connection
    ws.close();
    expect(ws.isClosed()).toBeTruthy();
    
    // Wait for reconnection attempt
    const wsPromise2 = page.waitForEvent('websocket');
    await page.waitForTimeout(3000);
    
    // Should attempt to reconnect
    const ws2 = await wsPromise2;
    expect(ws2.isClosed()).toBeFalsy();
  });

  test('should handle multiple WebSocket connections', async ({ page, context }) => {
    // Create a second page (simulating another client)
    const page2 = await context.newPage();
    
    const wsPromise1 = page.waitForEvent('websocket');
    const wsPromise2 = page2.waitForEvent('websocket');
    
    // Start sender on first page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    // Start receiver on second page
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');
    await page2.click('text=Start Receiving');
    await page2.waitForLoadState('networkidle');
    
    const ws1 = await wsPromise1;
    const ws2 = await wsPromise2;
    
    // Both connections should be established
    expect(ws1.isClosed()).toBeFalsy();
    expect(ws2.isClosed()).toBeFalsy();
    
    await page2.close();
  });

  test('should handle WebSocket message parsing errors', async ({ page }) => {
    const wsPromise = page.waitForEvent('websocket');
    
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    const ws = await wsPromise;
    
    // Listen for any errors
    let errorOccurred = false;
    ws.on('error', () => {
      errorOccurred = true;
    });
    
    // Wait for normal operation
    await page.waitForTimeout(2000);
    
    // Should not have encountered errors during normal operation
    expect(errorOccurred).toBeFalsy();
  });

  test('should maintain WebSocket connection during navigation', async ({ page }) => {
    const wsPromise = page.waitForEvent('websocket');
    
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    const ws = await wsPromise;
    expect(ws.isClosed()).toBeFalsy();
    
    // Navigate back to main page
    await page.click('text=Back to Main');
    await page.waitForLoadState('networkidle');
    
    // WebSocket should still be connected or should reconnect
    await page.waitForTimeout(1000);
    
    // Connection should be maintained or re-established
    expect(ws.isClosed()).toBeFalsy();
  });

  test('should handle WebSocket close events', async ({ page }) => {
    const wsPromise = page.waitForEvent('websocket');
    
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    const ws = await wsPromise;
    
    // Listen for close events
    let closeEventOccurred = false;
    ws.on('close', () => {
      closeEventOccurred = true;
    });
    
    // Close the connection manually
    ws.close();
    
    // Should trigger close event
    await page.waitForTimeout(500);
    expect(closeEventOccurred).toBeTruthy();
  });

  test('should validate WebSocket message formats', async ({ page }) => {
    const wsPromise = page.waitForEvent('websocket');
    
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    const ws = await wsPromise;
    
    // Listen for received messages
    const messages: any[] = [];
    ws.on('framereceived', (event) => {
      try {
        const data = JSON.parse(event.payload as string);
        messages.push(data);
      } catch (e) {
        // Track parsing errors
        messages.push({ parseError: true, payload: event.payload });
      }
    });
    
    await page.waitForTimeout(2000);
    
    // All messages should be valid JSON
    const parseErrors = messages.filter(msg => msg.parseError);
    expect(parseErrors.length).toBe(0);
    
    // Messages should have proper structure
    const validMessages = messages.filter(msg => !msg.parseError);
    expect(validMessages.length).toBeGreaterThan(0);
    
    for (const message of validMessages) {
      expect(message.type).toBeTruthy();
      expect(message.payload).toBeTruthy();
    }
  });
});
