import { test, expect } from '@playwright/test';

test.describe('Swaz Data Recovery - Frontend UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should load the main page correctly', async ({ page }) => {
    // Check if the main title is visible
    await expect(page.locator('h1')).toBeVisible();
    
    // Check if the main container is present
    await expect(page.locator('[data-testid="file-transfer-container"]')).toBeVisible();
  });

  test('should display sender and receiver options', async ({ page }) => {
    // Check if both options are present
    await expect(page.locator('text=Start Sending')).toBeVisible();
    await expect(page.locator('text=Start Receiving')).toBeVisible();
  });

  test('should navigate to sender view when clicking "Start Sending"', async ({ page }) => {
    await page.click('text=Start Sending');
    
    // Wait for sender view to load
    await page.waitForLoadState('networkidle');
    
    // Check if sender-specific elements are visible
    await expect(page.locator('text=Select Files')).toBeVisible();
    await expect(page.locator('text=Room ID')).toBeVisible();
  });

  test('should generate Room ID when starting sender mode', async ({ page }) => {
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    // Check if Room ID is generated and displayed
    const roomIdElement = page.locator('[data-testid="room-id-display"]');
    await expect(roomIdElement).toBeVisible();
    
    // Get the Room ID text
    const roomId = await roomIdElement.textContent();
    expect(roomId).toBeTruthy();
    expect(roomId!.length).toBeGreaterThan(5);
    
    // Validate Room ID format (alphanumeric and hyphens only)
    const validRoomIdRegex = /^[a-zA-Z0-9-]+$/;
    expect(validRoomIdRegex.test(roomId!)).toBeTruthy();
  });

  test('should show "Share Room ID" button', async ({ page }) => {
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    // Check if Share Room ID button is visible
    await expect(page.locator('text=Share Room ID')).toBeVisible();
  });

  test('should open QR code modal when clicking "Share Room ID"', async ({ page }) => {
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    // Click Share Room ID button
    await page.click('text=Share Room ID');
    
    // Wait for modal to appear
    await expect(page.locator('[data-testid="qr-modal"]')).toBeVisible();
    
    // Check if QR code is generated
    await expect(page.locator('canvas')).toBeVisible();
    
    // Check if Room ID is displayed in modal
    await expect(page.locator('[data-testid="room-id-copy"]')).toBeVisible();
  });

  test('should copy Room ID to clipboard when clicking copy button', async ({ page }) => {
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    // Click Share Room ID button
    await page.click('text=Share Room ID');
    
    // Wait for modal to appear
    await expect(page.locator('[data-testid="qr-modal"]')).toBeVisible();
    
    // Get the Room ID from the display
    const roomIdElement = page.locator('[data-testid="room-id-copy"]');
    const roomId = await roomIdElement.textContent();
    
    // Click the copy button
    await page.click('[data-testid="copy-button"]');
    
    // Check if copy confirmation appears
    await expect(page.locator('text=Copied!')).toBeVisible();
  });

  test('should close QR modal when clicking close button', async ({ page }) => {
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    // Click Share Room ID button
    await page.click('text=Share Room ID');
    
    // Wait for modal to appear
    await expect(page.locator('[data-testid="qr-modal"]')).toBeVisible();
    
    // Click close button
    await page.click('[data-testid="close-modal"]');
    
    // Check if modal is closed
    await expect(page.locator('[data-testid="qr-modal"]')).not.toBeVisible();
  });

  test('should navigate to receiver view when clicking "Start Receiving"', async ({ page }) => {
    await page.click('text=Start Receiving');
    
    // Wait for receiver view to load
    await page.waitForLoadState('networkidle');
    
    // Check if receiver-specific elements are visible
    await expect(page.locator('text=Enter Room ID')).toBeVisible();
    await expect(page.locator('input[placeholder*="Room ID"]')).toBeVisible();
  });

  test('should validate Room ID input correctly', async ({ page }) => {
    await page.click('text=Start Receiving');
    await page.waitForLoadState('networkidle');
    
    const roomIdInput = page.locator('input[placeholder*="Room ID"]');
    
    // Test valid Room ID
    await roomIdInput.fill('abc123-def456');
    await expect(page.locator('text=Invalid characters')).not.toBeVisible();
    
    // Test invalid characters
    await roomIdInput.fill('invalid/chars');
    await expect(page.locator('text=Invalid characters')).toBeVisible();
    
    // Test spaces
    await roomIdInput.fill('test space');
    await expect(page.locator('text=Invalid characters')).toBeVisible();
    
    // Test special characters
    await roomIdInput.fill('test@domain.com');
    await expect(page.locator('text=Invalid characters')).toBeVisible();
  });

  test('should allow valid Room ID input', async ({ page }) => {
    await page.click('text=Start Receiving');
    await page.waitForLoadState('networkidle');
    
    const roomIdInput = page.locator('input[placeholder*="Room ID"]');
    
    // Test various valid formats
    const validRoomIds = [
      'abc123-def456',
      'room-123',
      '06f0be8e-32d0-4b15-b',
      'simple123',
      'test-room-id-456'
    ];
    
    for (const roomId of validRoomIds) {
      await roomIdInput.fill(roomId);
      await expect(page.locator('text=Invalid characters')).not.toBeVisible();
    }
  });

  test('should display placeholder text correctly', async ({ page }) => {
    await page.click('text=Start Receiving');
    await page.waitForLoadState('networkidle');
    
    const roomIdInput = page.locator('input[placeholder*="Room ID"]');
    const placeholder = await roomIdInput.getAttribute('placeholder');
    
    expect(placeholder).toContain('Room ID');
    expect(placeholder).toContain('letters, numbers, and hyphens');
  });

  test('should handle empty Room ID input', async ({ page }) => {
    await page.click('text=Start Receiving');
    await page.waitForLoadState('networkidle');
    
    const roomIdInput = page.locator('input[placeholder*="Room ID"]');
    
    // Empty input should not show error
    await roomIdInput.fill('');
    await expect(page.locator('text=Invalid characters')).not.toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if main elements are still visible
    await expect(page.locator('text=Start Sending')).toBeVisible();
    await expect(page.locator('text=Start Receiving')).toBeVisible();
    
    // Test sender view on mobile
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    // Check if QR modal works on mobile
    await page.click('text=Share Room ID');
    await expect(page.locator('[data-testid="qr-modal"]')).toBeVisible();
  });

  test('should work with keyboard navigation', async ({ page }) => {
    // Navigate using Tab key
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Should activate "Start Sending"
    
    await page.waitForLoadState('networkidle');
    
    // Check if sender view opened
    await expect(page.locator('text=Share Room ID')).toBeVisible();
  });

  test('should handle browser back button correctly', async ({ page }) => {
    // Go to sender view
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    // Go back
    await page.goBack();
    
    // Should return to main view
    await expect(page.locator('text=Start Sending')).toBeVisible();
    await expect(page.locator('text=Start Receiving')).toBeVisible();
  });
});
