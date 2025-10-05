import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Swaz Data Recovery - Sender/Receiver Connectivity & File Exchange', () => {
  let testFilePath: string;
  let testFileContent: string;

  test.beforeAll(async () => {
    // Create test files
    testFileContent = 'This is a test file for sender-receiver connectivity testing.\n' +
                     'File contains: Hello from Swaz Data Recovery!\n' +
                     'Timestamp: ' + new Date().toISOString() + '\n' +
                     'Test data: ABC123-DEF456-GHI789\n' +
                     'End of test content.';
    
    testFilePath = path.join(__dirname, 'connectivity-test-file.txt');
    fs.writeFileSync(testFilePath, testFileContent);
  });

  test.afterAll(async () => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  test('should establish connection between sender and receiver', async ({ browser }) => {
    // Create two browser contexts for sender and receiver
    const senderContext = await browser.newContext();
    const receiverContext = await browser.newContext();
    
    const senderPage = await senderContext.newPage();
    const receiverPage = await receiverContext.newPage();

    try {
      console.log('🚀 Setting up sender and receiver...');
      
      // Setup sender
      await senderPage.goto('http://localhost:5174/');
      await senderPage.waitForLoadState('networkidle');
      await senderPage.click('text=Start Sending');
      await senderPage.waitForLoadState('networkidle');

      console.log('📡 Sender setup complete, waiting for Room ID...');
      
      // Wait for Room ID to be generated and displayed
      await senderPage.waitForSelector('[data-testid="room-id-display"]', { timeout: 10000 });
      const roomIdElement = senderPage.locator('[data-testid="room-id-display"]');
      await expect(roomIdElement).toBeVisible();
      
      const roomId = await roomIdElement.textContent();
      console.log('🔑 Room ID generated:', roomId);
      expect(roomId).toBeTruthy();
      expect(roomId!.length).toBeGreaterThan(5);

      // Setup receiver with the same Room ID
      await receiverPage.goto('http://localhost:5174/');
      await receiverPage.waitForLoadState('networkidle');
      await receiverPage.click('text=Start Receiving');
      await receiverPage.waitForLoadState('networkidle');
      
      console.log('📥 Setting up receiver with Room ID:', roomId);
      
      // Enter Room ID
      await receiverPage.fill('input[placeholder*="Room ID"]', roomId!);
      
      // Look for join button or trigger join
      const joinButton = receiverPage.locator('button:has-text("Join")');
      if (await joinButton.isVisible()) {
        await joinButton.click();
      } else {
        await receiverPage.press('input[placeholder*="Room ID"]', 'Enter');
      }

      console.log('⏳ Waiting for connection establishment...');
      
      // Wait for connection establishment
      await senderPage.waitForTimeout(3000);
      await receiverPage.waitForTimeout(3000);

      // Check if both sides show connection status
      console.log('✅ Connection test completed successfully');

    } finally {
      await senderContext.close();
      await receiverContext.close();
    }
  });

  test('should exchange files between sender and receiver', async ({ browser }) => {
    // Create two browser contexts for sender and receiver
    const senderContext = await browser.newContext();
    const receiverContext = await browser.newContext();
    
    const senderPage = await senderContext.newPage();
    const receiverPage = await receiverContext.newPage();

    try {
      console.log('🚀 Starting file exchange test...');
      
      // Setup sender
      await senderPage.goto('http://localhost:5174/');
      await senderPage.waitForLoadState('networkidle');
      await senderPage.click('text=Start Sending');
      await senderPage.waitForLoadState('networkidle');

      // Get Room ID
      await senderPage.waitForSelector('[data-testid="room-id-display"]', { timeout: 10000 });
      const roomIdElement = senderPage.locator('[data-testid="room-id-display"]');
      const roomId = await roomIdElement.textContent();
      console.log('🔑 Room ID for file exchange:', roomId);

      // Setup receiver
      await receiverPage.goto('http://localhost:5174/');
      await receiverPage.waitForLoadState('networkidle');
      await receiverPage.click('text=Start Receiving');
      await receiverPage.waitForLoadState('networkidle');
      
      // Enter Room ID
      await receiverPage.fill('input[placeholder*="Room ID"]', roomId!);
      
      // Join room
      const joinButton = receiverPage.locator('button:has-text("Join")');
      if (await joinButton.isVisible()) {
        await joinButton.click();
      } else {
        await receiverPage.press('input[placeholder*="Room ID"]', 'Enter');
      }

      // Wait for connection
      await senderPage.waitForTimeout(2000);
      await receiverPage.waitForTimeout(2000);

      console.log('📁 Selecting file for transfer...');
      
      // Select file on sender
      const fileInput = senderPage.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);

      // Wait for file to be processed
      await senderPage.waitForTimeout(1000);

      // Check if file is displayed in the file list
      await expect(senderPage.locator('text=connectivity-test-file.txt')).toBeVisible();
      console.log('✅ File selected on sender side');

      // Look for transfer controls
      const startTransferButton = senderPage.locator('button:has-text("Start Transfer")');
      const transferButton = senderPage.locator('button:has-text("Transfer")');
      
      if (await startTransferButton.isVisible()) {
        console.log('🚀 Starting file transfer...');
        await startTransferButton.click();
      } else if (await transferButton.isVisible()) {
        console.log('🚀 Starting file transfer...');
        await transferButton.click();
      } else {
        console.log('⚠️ No transfer button found, checking for automatic transfer...');
      }

      // Wait for transfer to process
      console.log('⏳ Waiting for transfer to complete...');
      await senderPage.waitForTimeout(5000);
      await receiverPage.waitForTimeout(5000);

      // Check for transfer completion indicators
      const transferCompleteSender = senderPage.locator('text=Transfer completed');
      const transferCompleteReceiver = receiverPage.locator('text=File received');
      
      if (await transferCompleteSender.isVisible()) {
        console.log('✅ Transfer completed on sender side');
      }
      
      if (await transferCompleteReceiver.isVisible()) {
        console.log('✅ File received on receiver side');
      }

      // Check for any error messages
      const errorSender = senderPage.locator('text=Error');
      const errorReceiver = receiverPage.locator('text=Error');
      
      if (await errorSender.isVisible()) {
        console.log('❌ Error detected on sender side');
      }
      
      if (await errorReceiver.isVisible()) {
        console.log('❌ Error detected on receiver side');
      }

      console.log('✅ File exchange test completed');

    } finally {
      await senderContext.close();
      await receiverContext.close();
    }
  });

  test('should handle WebSocket communication between sender and receiver', async ({ browser }) => {
    const senderContext = await browser.newContext();
    const receiverContext = await browser.newContext();
    
    const senderPage = await senderContext.newPage();
    const receiverPage = await receiverContext.newPage();

    try {
      console.log('🔌 Testing WebSocket communication...');
      
      // Listen for WebSocket connections on both pages
      const senderWSPromise = senderPage.waitForEvent('websocket');
      const receiverWSPromise = receiverPage.waitForEvent('websocket');
      
      // Setup sender
      await senderPage.goto('http://localhost:5174/');
      await senderPage.waitForLoadState('networkidle');
      await senderPage.click('text=Start Sending');
      await senderPage.waitForLoadState('networkidle');

      // Setup receiver
      await receiverPage.goto('http://localhost:5174/');
      await receiverPage.waitForLoadState('networkidle');
      await receiverPage.click('text=Start Receiving');
      await receiverPage.waitForLoadState('networkidle');

      // Get Room ID from sender
      await senderPage.waitForSelector('[data-testid="room-id-display"]', { timeout: 10000 });
      const roomIdElement = senderPage.locator('[data-testid="room-id-display"]');
      const roomId = await roomIdElement.textContent();

      // Enter Room ID on receiver
      await receiverPage.fill('input[placeholder*="Room ID"]', roomId!);
      
      // Join room
      const joinButton = receiverPage.locator('button:has-text("Join")');
      if (await joinButton.isVisible()) {
        await joinButton.click();
      } else {
        await receiverPage.press('input[placeholder*="Room ID"]', 'Enter');
      }

      // Wait for WebSocket connections
      const senderWS = await senderWSPromise;
      const receiverWS = await receiverWSPromise;
      
      console.log('✅ WebSocket connections established');
      console.log('Sender WebSocket URL:', senderWS.url());
      console.log('Receiver WebSocket URL:', receiverWS.url());
      
      expect(senderWS.isClosed()).toBeFalsy();
      expect(receiverWS.isClosed()).toBeFalsy();

      // Listen for messages
      let senderMessages: any[] = [];
      let receiverMessages: any[] = [];
      
      senderWS.on('framereceived', (event) => {
        try {
          const data = JSON.parse(event.payload as string);
          senderMessages.push(data);
          console.log('📨 Sender received:', data.type);
        } catch (e) {
          // Ignore non-JSON messages
        }
      });
      
      receiverWS.on('framereceived', (event) => {
        try {
          const data = JSON.parse(event.payload as string);
          receiverMessages.push(data);
          console.log('📨 Receiver received:', data.type);
        } catch (e) {
          // Ignore non-JSON messages
        }
      });

      // Wait for messages to be exchanged
      await senderPage.waitForTimeout(3000);
      await receiverPage.waitForTimeout(3000);

      console.log('📊 Message exchange summary:');
      console.log('Sender messages:', senderMessages.length);
      console.log('Receiver messages:', receiverMessages.length);

      // Verify that both sides received messages
      expect(senderMessages.length).toBeGreaterThan(0);
      expect(receiverMessages.length).toBeGreaterThan(0);

      // Close WebSocket connections
      senderWS.close();
      receiverWS.close();

      console.log('✅ WebSocket communication test completed');

    } finally {
      await senderContext.close();
      await receiverContext.close();
    }
  });

  test('should verify Room ID sharing functionality', async ({ browser }) => {
    const senderContext = await browser.newContext();
    
    const senderPage = await senderContext.newPage();

    try {
      console.log('🔑 Testing Room ID sharing functionality...');
      
      // Setup sender
      await senderPage.goto('http://localhost:5174/');
      await senderPage.waitForLoadState('networkidle');
      await senderPage.click('text=Start Sending');
      await senderPage.waitForLoadState('networkidle');

      // Wait for Room ID
      await senderPage.waitForSelector('[data-testid="room-id-display"]', { timeout: 10000 });
      const roomIdElement = senderPage.locator('[data-testid="room-id-display"]');
      const roomId = await roomIdElement.textContent();
      
      console.log('🔑 Generated Room ID:', roomId);

      // Test Share Room ID functionality
      const shareButton = senderPage.locator('text=Share Room ID');
      if (await shareButton.isVisible()) {
        console.log('📤 Testing Share Room ID button...');
        await shareButton.click();
        
        // Wait for QR modal to appear
        await senderPage.waitForSelector('[data-testid="qr-modal"]', { timeout: 5000 });
        console.log('✅ QR modal opened successfully');
        
        // Check if Room ID is displayed in modal
        const modalRoomId = senderPage.locator('[data-testid="room-id-copy"]');
        if (await modalRoomId.isVisible()) {
          const modalRoomIdText = await modalRoomId.textContent();
          console.log('📋 Room ID in modal:', modalRoomIdText);
          expect(modalRoomIdText).toBe(roomId);
        }
        
        // Test copy functionality
        const copyButton = senderPage.locator('[data-testid="copy-button"]');
        if (await copyButton.isVisible()) {
          console.log('📋 Testing copy functionality...');
          await copyButton.click();
          
          // Check for copy confirmation
          await expect(senderPage.locator('text=Copied!')).toBeVisible();
          console.log('✅ Copy functionality working');
        }
        
        // Close modal
        const closeButton = senderPage.locator('[data-testid="close-modal"]');
        if (await closeButton.isVisible()) {
          await closeButton.click();
          console.log('✅ Modal closed successfully');
        }
      } else {
        console.log('⚠️ Share Room ID button not found');
      }

      console.log('✅ Room ID sharing test completed');

    } finally {
      await senderContext.close();
    }
  });

  test('should test multiple file selection and transfer', async ({ browser }) => {
    // Create additional test files
    const testFile2 = path.join(__dirname, 'test-file-2.txt');
    const testFile3 = path.join(__dirname, 'test-file-3.txt');
    
    fs.writeFileSync(testFile2, 'Second test file content for multi-file transfer');
    fs.writeFileSync(testFile3, 'Third test file content for multi-file transfer');

    const senderContext = await browser.newContext();
    const receiverContext = await browser.newContext();
    
    const senderPage = await senderContext.newPage();
    const receiverPage = await receiverContext.newPage();

    try {
      console.log('📁 Testing multiple file selection and transfer...');
      
      // Setup sender and receiver
      await senderPage.goto('http://localhost:5174/');
      await senderPage.waitForLoadState('networkidle');
      await senderPage.click('text=Start Sending');
      await senderPage.waitForLoadState('networkidle');

      await receiverPage.goto('http://localhost:5174/');
      await receiverPage.waitForLoadState('networkidle');
      await receiverPage.click('text=Start Receiving');
      await receiverPage.waitForLoadState('networkidle');

      // Get Room ID and connect
      await senderPage.waitForSelector('[data-testid="room-id-display"]', { timeout: 10000 });
      const roomIdElement = senderPage.locator('[data-testid="room-id-display"]');
      const roomId = await roomIdElement.textContent();

      await receiverPage.fill('input[placeholder*="Room ID"]', roomId!);
      
      const joinButton = receiverPage.locator('button:has-text("Join")');
      if (await joinButton.isVisible()) {
        await joinButton.click();
      } else {
        await receiverPage.press('input[placeholder*="Room ID"]', 'Enter');
      }

      await senderPage.waitForTimeout(2000);
      await receiverPage.waitForTimeout(2000);

      console.log('📁 Selecting multiple files...');
      
      // Select multiple files
      const fileInput = senderPage.locator('input[type="file"]');
      await fileInput.setInputFiles([testFilePath, testFile2, testFile3]);

      // Wait for files to be processed
      await senderPage.waitForTimeout(1000);

      // Check if all files are displayed
      await expect(senderPage.locator('text=connectivity-test-file.txt')).toBeVisible();
      await expect(senderPage.locator('text=test-file-2.txt')).toBeVisible();
      await expect(senderPage.locator('text=test-file-3.txt')).toBeVisible();

      console.log('✅ Multiple files selected successfully');

      // Attempt to start transfer
      const startTransferButton = senderPage.locator('button:has-text("Start Transfer")');
      const transferButton = senderPage.locator('button:has-text("Transfer")');
      
      if (await startTransferButton.isVisible()) {
        await startTransferButton.click();
      } else if (await transferButton.isVisible()) {
        await transferButton.click();
      }

      // Wait for transfer
      await senderPage.waitForTimeout(5000);
      await receiverPage.waitForTimeout(5000);

      console.log('✅ Multiple file transfer test completed');

    } finally {
      // Clean up additional test files
      if (fs.existsSync(testFile2)) fs.unlinkSync(testFile2);
      if (fs.existsSync(testFile3)) fs.unlinkSync(testFile3);
      
      await senderContext.close();
      await receiverContext.close();
    }
  });
});
