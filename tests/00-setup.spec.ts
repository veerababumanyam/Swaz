import { test, expect } from '@playwright/test';

test.describe('Swaz Data Recovery - Test Setup and Environment', () => {
  test('should verify test environment is ready', async ({ page }) => {
    // Test basic page load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify the page title or main heading exists
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Verify main application elements are present
    await expect(page.locator('body')).toBeVisible();
  });

  test('should verify backend server is running', async ({ page }) => {
    // Test WebSocket connection
    const wsPromise = page.waitForEvent('websocket');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to establish a WebSocket connection
    await page.click('text=Start Sending');
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket connection
    const ws = await wsPromise;
    expect(ws.url()).toBe('ws://localhost:8080/');
    expect(ws.isClosed()).toBeFalsy();
    
    // Close the connection
    ws.close();
  });

  test('should verify frontend assets are loading correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if main CSS is loaded
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
    
    // Check if JavaScript is loaded
    const scripts = await page.locator('script').count();
    expect(scripts).toBeGreaterThan(0);
  });

  test('should verify responsive design works', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Start Sending')).toBeVisible();
    await expect(page.locator('text=Start Receiving')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Start Sending')).toBeVisible();
    await expect(page.locator('text=Start Receiving')).toBeVisible();
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Start Sending')).toBeVisible();
    await expect(page.locator('text=Start Receiving')).toBeVisible();
  });

  test('should verify browser compatibility features', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test clipboard API availability
    const clipboardAvailable = await page.evaluate(() => {
      return typeof navigator.clipboard !== 'undefined';
    });
    expect(clipboardAvailable).toBeTruthy();
    
    // Test WebSocket support
    const websocketAvailable = await page.evaluate(() => {
      return typeof WebSocket !== 'undefined';
    });
    expect(websocketAvailable).toBeTruthy();
    
    // Test file API support
    const fileApiAvailable = await page.evaluate(() => {
      return typeof File !== 'undefined' && typeof FileReader !== 'undefined';
    });
    expect(fileApiAvailable).toBeTruthy();
  });

  test('should verify error handling works correctly', async ({ page }) => {
    // Test with invalid URL
    const response = await page.goto('/non-existent-page');
    expect(response?.status()).toBe(404);
    
    // Go back to main page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify we're back on the main page
    await expect(page.locator('text=Start Sending')).toBeVisible();
  });

  test('should verify performance metrics', async ({ page }) => {
    // Start performance monitoring
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      };
    });
    
    // Verify reasonable performance (adjust thresholds as needed)
    expect(performanceMetrics.loadTime).toBeLessThan(5000); // 5 seconds max
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // 3 seconds max
  });
});
