import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Swaz Data Recovery - File Transfer Tests', () => {
  let testFilePath: string;
  let testFileContent: string;

  test.beforeAll(async () => {
    // Create a test file
    testFileContent = 'This is a test file for Swaz Data Recovery transfer testing.\n' +
                     'It contains multiple lines of text to test file transfer functionality.\n' +
                     'Line 3: Testing file transfer\n' +
                     'Line 4: End of test content';
    
    testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, testFileContent);
  });

  test.afterAll(async () => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  test('should complete end-to-end file transfer between sender and receiver', async ({ browser }) => {
    // Create two browser contexts for sender and receiver
    const senderContext = await browser.newContext();
    const receiverContext = await browser.newContext();
    
    const senderPage = await senderContext.newPage();
    const receiverPage = await receiverContext.newPage();

    try {
      // Setup sender
      await senderPage.goto('/');
      await senderPage.waitForLoadState('networkidle');
      await senderPage.click('text=Start Sending');
      await senderPage.waitForLoadState('networkidle');

      // Get the Room ID from sender
      const roomIdElement = senderPage.locator('[data-testid="room-id-display"]');
      await expect(roomIdElement).toBeVisible();
      const roomId = await roomIdElement.textContent();
      expect(roomId).toBeTruthy();

      // Setup receiver with the same Room ID
      await receiverPage.goto('/');
      await receiverPage.waitForLoadState('networkidle');
      await receiverPage.click('text=Start Receiving');
      await receiverPage.waitForLoadState('networkidle');
      
      await receiverPage.fill('input[placeholder*="Room ID"]', roomId!);
      
      // Look for join button or trigger join
      const joinButton = receiverPage.locator('button:has-text("Join")');
      if (await joinButton.isVisible()) {
        await joinButton.click();
      } else {
        await receiverPage.press('input[placeholder*="Room ID"]', 'Enter');
      }

      // Wait for connection establishment
      await senderPage.waitForTimeout(2000);
      await receiverPage.waitForTimeout(2000);

      // Select file on sender
      const fileInput = senderPage.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);

      // Wait for file to be selected
      await senderPage.waitForTimeout(1000);

      // Check if file is displayed in the file list
      await expect(senderPage.locator('text=test-file.txt')).toBeVisible();

      // Start transfer
      const startTransferButton = senderPage.locator('button:has-text("Start Transfer")');
      if (await startTransferButton.isVisible()) {
        await startTransferButton.click();
      }

      // Wait for transfer to complete
      await senderPage.waitForTimeout(5000);

      // Check if transfer completed successfully
      await expect(senderPage.locator('text=Transfer completed')).toBeVisible();
      await expect(receiverPage.locator('text=File received')).toBeVisible();

    } finally {
      await senderContext.close();
      await receiverContext.close();
    }
  });

  test('should handle file selection and display file information', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');

    // Select the test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Wait for file to be processed
    await page.waitForTimeout(1000);

    // Check if file information is displayed
    await expect(page.locator('text=test-file.txt')).toBeVisible();
    
    // Check if file size is displayed
    const fileSize = fs.statSync(testFilePath).size;
    await expect(page.locator(`text=${fileSize} bytes`)).toBeVisible();
  });

  test('should handle multiple file selection', async ({ page }) => {
    // Create additional test files
    const testFile2 = path.join(__dirname, 'test-file-2.txt');
    const testFile3 = path.join(__dirname, 'test-file-3.txt');
    
    fs.writeFileSync(testFile2, 'Second test file content');
    fs.writeFileSync(testFile3, 'Third test file content');

    try {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.click('text=Start Sending');
      await page.waitForLoadState('networkidle');

      // Select multiple files
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([testFilePath, testFile2, testFile3]);

      // Wait for files to be processed
      await page.waitForTimeout(1000);

      // Check if all files are displayed
      await expect(page.locator('text=test-file.txt')).toBeVisible();
      await expect(page.locator('text=test-file-2.txt')).toBeVisible();
      await expect(page.locator('text=test-file-3.txt')).toBeVisible();

      // Check if total file count is displayed
      await expect(page.locator('text=3 files selected')).toBeVisible();

    } finally {
      // Clean up additional test files
      if (fs.existsSync(testFile2)) fs.unlinkSync(testFile2);
      if (fs.existsSync(testFile3)) fs.unlinkSync(testFile3);
    }
  });

  test('should show transfer progress during file transfer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');

    // Select file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Start transfer
    const startTransferButton = page.locator('button:has-text("Start Transfer")');
    if (await startTransferButton.isVisible()) {
      await startTransferButton.click();
    }

    // Check if progress indicator appears
    await expect(page.locator('[data-testid="transfer-progress"]')).toBeVisible();
    
    // Check if progress percentage is displayed
    await expect(page.locator('text=0%')).toBeVisible();
    
    // Wait a bit and check if progress updates
    await page.waitForTimeout(1000);
    
    // Progress should have updated (or show some progress)
    const progressElement = page.locator('[data-testid="progress-percentage"]');
    if (await progressElement.isVisible()) {
      const progressText = await progressElement.textContent();
      expect(progressText).toBeTruthy();
    }
  });

  test('should handle transfer cancellation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');

    // Select file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Start transfer
    const startTransferButton = page.locator('button:has-text("Start Transfer")');
    if (await startTransferButton.isVisible()) {
      await startTransferButton.click();
    }

    // Wait for transfer to start
    await page.waitForTimeout(1000);

    // Cancel transfer
    const cancelButton = page.locator('button:has-text("Cancel")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    // Check if transfer was cancelled
    await expect(page.locator('text=Transfer cancelled')).toBeVisible();
  });

  test('should handle invalid file types gracefully', async ({ page }) => {
    // Create an invalid file type
    const invalidFile = path.join(__dirname, 'test-file.exe');
    fs.writeFileSync(invalidFile, 'This is not a valid file for testing');

    try {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.click('text=Start Sending');
      await page.waitForLoadState('networkidle');

      // Try to select invalid file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(invalidFile);

      // Wait for file processing
      await page.waitForTimeout(1000);

      // Check if error message is shown
      await expect(page.locator('text=Invalid file type')).toBeVisible();

    } finally {
      // Clean up invalid file
      if (fs.existsSync(invalidFile)) fs.unlinkSync(invalidFile);
    }
  });

  test('should handle large file transfers', async ({ page }) => {
    // Create a larger test file (1MB)
    const largeFilePath = path.join(__dirname, 'large-test-file.txt');
    const largeContent = 'A'.repeat(1024 * 1024); // 1MB of 'A' characters
    fs.writeFileSync(largeFilePath, largeContent);

    try {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.click('text=Start Sending');
      await page.waitForLoadState('networkidle');

      // Select large file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(largeFilePath);

      // Wait for file to be processed
      await page.waitForTimeout(2000);

      // Check if large file is displayed with correct size
      await expect(page.locator('text=large-test-file.txt')).toBeVisible();
      await expect(page.locator('text=1.0 MB')).toBeVisible();

    } finally {
      // Clean up large file
      if (fs.existsSync(largeFilePath)) fs.unlinkSync(largeFilePath);
    }
  });

  test('should handle network interruption during transfer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');

    // Select file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Start transfer
    const startTransferButton = page.locator('button:has-text("Start Transfer")');
    if (await startTransferButton.isVisible()) {
      await startTransferButton.click();
    }

    // Wait for transfer to start
    await page.waitForTimeout(1000);

    // Simulate network interruption by going offline
    await page.context().setOffline(true);
    
    // Wait a bit
    await page.waitForTimeout(2000);
    
    // Check if error message is shown
    await expect(page.locator('text=Connection lost')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    
    // Wait for reconnection
    await page.waitForTimeout(2000);
    
    // Check if retry option is available
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should handle empty file selection', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');

    // Try to start transfer without selecting files
    const startTransferButton = page.locator('button:has-text("Start Transfer")');
    if (await startTransferButton.isVisible()) {
      // Button should be disabled or show error
      const isDisabled = await startTransferButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    }
  });

  test('should display transfer speed and ETA', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');

    // Select file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Start transfer
    const startTransferButton = page.locator('button:has-text("Start Transfer")');
    if (await startTransferButton.isVisible()) {
      await startTransferButton.click();
    }

    // Wait for transfer to start
    await page.waitForTimeout(1000);

    // Check if transfer speed is displayed
    await expect(page.locator('[data-testid="transfer-speed"]')).toBeVisible();
    
    // Check if ETA is displayed
    await expect(page.locator('[data-testid="transfer-eta"]')).toBeVisible();
  });
});
