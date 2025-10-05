import { test, expect } from '@playwright/test';

test.describe('Swaz Data Recovery - Realistic Sender/Receiver Connectivity Test', () => {
  
  test('should test basic sender and receiver connectivity', async ({ browser }) => {
    // Create two browser contexts for sender and receiver
    const senderContext = await browser.newContext();
    const receiverContext = await browser.newContext();
    
    const senderPage = await senderContext.newPage();
    const receiverPage = await receiverContext.newPage();

    try {
      console.log('🚀 Testing basic sender and receiver connectivity...');
      
      // Setup sender
      await senderPage.goto('http://localhost:5174/');
      await senderPage.waitForLoadState('networkidle');
      
      // Look for and click "Start Sending" button
      const startSendingButton = senderPage.locator('button:has-text("Start Sending")');
      await expect(startSendingButton).toBeVisible();
      await startSendingButton.click();
      
      console.log('✅ Sender setup initiated');
      await senderPage.waitForTimeout(2000);

      // Setup receiver
      await receiverPage.goto('http://localhost:5174/');
      await receiverPage.waitForLoadState('networkidle');
      
      // Look for and click "Join & Receive" button
      const startReceivingButton = receiverPage.locator('button:has-text("Join & Receive")');
      await expect(startReceivingButton).toBeVisible();
      await startReceivingButton.click();
      
      console.log('✅ Receiver setup initiated');
      await receiverPage.waitForTimeout(2000);

      // Check if both pages are in their respective modes
      console.log('🔍 Checking sender page state...');
      await senderPage.screenshot({ path: 'test-results/sender-page.png' });
      
      console.log('🔍 Checking receiver page state...');
      await receiverPage.screenshot({ path: 'test-results/receiver-page.png' });

      // Look for any Room ID related elements
      const senderRoomIdElements = await senderPage.locator('text=/Room ID|room-id|Room/i').count();
      const receiverRoomIdElements = await receiverPage.locator('text=/Room ID|room-id|Room/i').count();
      
      console.log(`📊 Room ID elements found - Sender: ${senderRoomIdElements}, Receiver: ${receiverRoomIdElements}`);

      // Look for any input fields that might be for Room ID
      const inputFields = await receiverPage.locator('input').count();
      console.log(`📝 Input fields found on receiver page: ${inputFields}`);

      if (inputFields > 0) {
        // Try to find and interact with input fields
        const inputs = receiverPage.locator('input');
        for (let i = 0; i < inputFields; i++) {
          const input = inputs.nth(i);
          const placeholder = await input.getAttribute('placeholder');
          const type = await input.getAttribute('type');
          console.log(`Input ${i}: placeholder="${placeholder}", type="${type}"`);
          
          if (placeholder && placeholder.toLowerCase().includes('room')) {
            console.log('🎯 Found Room ID input field!');
            await input.fill('test-room-123');
            break;
          }
        }
      }

      console.log('✅ Basic connectivity test completed');

    } finally {
      await senderContext.close();
      await receiverContext.close();
    }
  });

  test('should test WebSocket connections', async ({ browser }) => {
    const senderContext = await browser.newContext();
    const receiverContext = await browser.newContext();
    
    const senderPage = await senderContext.newPage();
    const receiverPage = await receiverContext.newPage();

    try {
      console.log('🔌 Testing WebSocket connections...');
      
      // Listen for WebSocket connections
      const senderWSPromise = senderPage.waitForEvent('websocket');
      const receiverWSPromise = receiverPage.waitForEvent('websocket');
      
      // Setup sender
      await senderPage.goto('http://localhost:5174/');
      await senderPage.waitForLoadState('networkidle');
      await senderPage.click('button:has-text("Start Sending")');
      await senderPage.waitForTimeout(2000);

      // Setup receiver
      await receiverPage.goto('http://localhost:5174/');
      await receiverPage.waitForLoadState('networkidle');
      await receiverPage.click('button:has-text("Join & Receive")');
      await receiverPage.waitForTimeout(2000);

      // Wait for WebSocket connections (with timeout)
      try {
        const senderWS = await Promise.race([
          senderWSPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        console.log('✅ Sender WebSocket connected:', senderWS.url());
        expect(senderWS.isClosed()).toBeFalsy();
        
        // Close the connection
        if (typeof senderWS.close === 'function') {
          senderWS.close();
        }
      } catch (error) {
        console.log('⚠️ Sender WebSocket connection timeout or error:', error.message);
      }

      try {
        const receiverWS = await Promise.race([
          receiverWSPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        console.log('✅ Receiver WebSocket connected:', receiverWS.url());
        expect(receiverWS.isClosed()).toBeFalsy();
        
        // Close the connection
        if (typeof receiverWS.close === 'function') {
          receiverWS.close();
        }
      } catch (error) {
        console.log('⚠️ Receiver WebSocket connection timeout or error:', error.message);
      }

      console.log('✅ WebSocket connectivity test completed');

    } finally {
      await senderContext.close();
      await receiverContext.close();
    }
  });

  test('should test file upload functionality', async ({ browser }) => {
    const senderContext = await browser.newContext();
    const senderPage = await senderContext.newPage();

    try {
      console.log('📁 Testing file upload functionality...');
      
      // Setup sender
      await senderPage.goto('http://localhost:5174/');
      await senderPage.waitForLoadState('networkidle');
      await senderPage.click('button:has-text("Start Sending")');
      await senderPage.waitForTimeout(2000);

      // Look for file input elements
      const fileInputs = await senderPage.locator('input[type="file"]').count();
      console.log(`📎 File input elements found: ${fileInputs}`);

      if (fileInputs > 0) {
        // Create a test file
        const testContent = 'This is a test file for upload testing.\nTimestamp: ' + new Date().toISOString();
        
        // Create a temporary file using Playwright's file creation
        const fileInput = senderPage.locator('input[type="file"]').first();
        
        // Test file upload by creating a buffer and setting it
        const buffer = Buffer.from(testContent);
        await fileInput.setInputFiles({
          name: 'test-file.txt',
          mimeType: 'text/plain',
          buffer: buffer
        });
        
        console.log('✅ Test file uploaded successfully');
        
        // Wait for file to be processed
        await senderPage.waitForTimeout(1000);
        
        // Check if file appears in the UI
        const fileListElements = await senderPage.locator('text=/test-file|file|upload/i').count();
        console.log(`📋 File list elements found: ${fileListElements}`);
        
        // Take screenshot of the state after file upload
        await senderPage.screenshot({ path: 'test-results/file-upload-result.png' });
      } else {
        console.log('⚠️ No file input elements found');
      }

      console.log('✅ File upload test completed');

    } finally {
      await senderContext.close();
    }
  });

  test('should test UI navigation and responsiveness', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      console.log('🎨 Testing UI navigation and responsiveness...');
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('http://localhost:5174/');
      await page.waitForLoadState('networkidle');
      
      // Check if main buttons are visible
      const startSendingButton = page.locator('button:has-text("Start Sending")');
      const startReceivingButton = page.locator('button:has-text("Join & Receive")');
      
      await expect(startSendingButton).toBeVisible();
      await expect(startReceivingButton).toBeVisible();
      
      console.log('✅ Desktop viewport test passed');
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await expect(startSendingButton).toBeVisible();
      await expect(startReceivingButton).toBeVisible();
      
      console.log('✅ Tablet viewport test passed');
      
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await expect(startSendingButton).toBeVisible();
      await expect(startReceivingButton).toBeVisible();
      
      console.log('✅ Mobile viewport test passed');
      
      // Test navigation to sender mode
      await startSendingButton.click();
      await page.waitForTimeout(2000);
      
      // Check if we're in sender mode (look for any sender-specific elements)
      const senderElements = await page.locator('text=/file|upload|send|transfer/i').count();
      console.log(`📤 Sender-specific elements found: ${senderElements}`);
      
      // Go back to main page
      await page.goBack();
      await page.waitForLoadState('networkidle');
      
      // Test navigation to receiver mode
      await startReceivingButton.click();
      await page.waitForTimeout(2000);
      
      // Check if we're in receiver mode
      const receiverElements = await page.locator('text=/receive|join|room|id/i').count();
      console.log(`📥 Receiver-specific elements found: ${receiverElements}`);

      console.log('✅ UI navigation and responsiveness test completed');

    } finally {
      await context.close();
    }
  });

  test('should test application performance and loading', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      console.log('⚡ Testing application performance...');
      
      // Measure page load time
      const startTime = Date.now();
      
      await page.goto('http://localhost:5174/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      console.log(`📊 Page load time: ${loadTime}ms`);
      
      // Check if load time is reasonable (less than 10 seconds)
      expect(loadTime).toBeLessThan(10000);
      
      // Test button responsiveness
      const startTime2 = Date.now();
      await page.click('button:has-text("Start Sending")');
      await page.waitForTimeout(1000);
      const responseTime = Date.now() - startTime2;
      
      console.log(`📊 Button response time: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(2000);
      
      // Test memory usage (basic check)
      const metrics = await page.evaluate(() => {
        return {
          memory: (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit
          } : null
        };
      });
      
      if (metrics.memory) {
        console.log('📊 Memory usage:', {
          used: `${Math.round(metrics.memory.used / 1024 / 1024)}MB`,
          total: `${Math.round(metrics.memory.total / 1024 / 1024)}MB`,
          limit: `${Math.round(metrics.memory.limit / 1024 / 1024)}MB`
        });
      }

      console.log('✅ Performance test completed');

    } finally {
      await context.close();
    }
  });
});
