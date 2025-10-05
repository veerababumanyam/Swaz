import { test, expect } from '@playwright/test';

test.describe('Swaz Data Recovery - UI Inspection', () => {
  
  test('should inspect the actual UI elements and button text', async ({ page }) => {
    console.log('🔍 Inspecting actual UI elements...');
    
    await page.goto('http://localhost:5174/');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for visual inspection
    await page.screenshot({ path: 'test-results/main-page-inspection.png', fullPage: true });
    
    // Find all buttons on the page
    const allButtons = await page.locator('button').all();
    console.log(`📋 Total buttons found: ${allButtons.length}`);
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const text = await button.textContent();
      const isVisible = await button.isVisible();
      console.log(`Button ${i + 1}: "${text}" (visible: ${isVisible})`);
    }
    
    // Find all clickable elements that might be buttons
    const clickableElements = await page.locator('a, button, [role="button"], [onclick]').all();
    console.log(`🔗 Total clickable elements found: ${clickableElements.length}`);
    
    for (let i = 0; i < Math.min(clickableElements.length, 10); i++) {
      const element = clickableElements[i];
      const text = await element.textContent();
      const tagName = await element.evaluate(el => el.tagName);
      const className = await element.getAttribute('class');
      const isVisible = await element.isVisible();
      console.log(`Clickable ${i + 1}: <${tagName}> "${text}" class="${className}" (visible: ${isVisible})`);
    }
    
    // Look for text that might indicate sender/receiver functionality
    const pageText = await page.textContent('body');
    const senderKeywords = ['sender', 'send', 'upload', 'file', 'transfer'];
    const receiverKeywords = ['receiver', 'receive', 'download', 'join', 'room', 'id'];
    
    console.log('\n🔍 Searching for sender-related keywords:');
    senderKeywords.forEach(keyword => {
      const matches = pageText?.toLowerCase().includes(keyword.toLowerCase());
      console.log(`  "${keyword}": ${matches ? '✅ Found' : '❌ Not found'}`);
    });
    
    console.log('\n🔍 Searching for receiver-related keywords:');
    receiverKeywords.forEach(keyword => {
      const matches = pageText?.toLowerCase().includes(keyword.toLowerCase());
      console.log(`  "${keyword}": ${matches ? '✅ Found' : '❌ Not found'}`);
    });
    
    // Try to find elements by common patterns
    console.log('\n🎯 Testing common button patterns:');
    
    const patterns = [
      'button:has-text("Start Sending")',
      'button:has-text("Start Receiving")',
      'button:has-text("Send")',
      'button:has-text("Receive")',
      'button:has-text("Upload")',
      'button:has-text("Download")',
      'button:has-text("Join")',
      'button:has-text("Room")',
      'button:has-text("File")',
      'button:has-text("Transfer")',
      '[data-testid*="send"]',
      '[data-testid*="receive"]',
      '[data-testid*="upload"]',
      '[data-testid*="download"]'
    ];
    
    for (const pattern of patterns) {
      try {
        const element = page.locator(pattern);
        const count = await element.count();
        if (count > 0) {
          const text = await element.first().textContent();
          console.log(`  Pattern "${pattern}": Found ${count} element(s), text: "${text}"`);
        }
      } catch (e) {
        // Ignore errors for invalid selectors
      }
    }
    
    console.log('✅ UI inspection completed');
  });
  
  test('should test clicking on different elements to find the right ones', async ({ page }) => {
    console.log('🖱️ Testing element interactions...');
    
    await page.goto('http://localhost:5174/');
    await page.waitForLoadState('networkidle');
    
    // Get all buttons and try clicking them one by one
    const buttons = await page.locator('button').all();
    console.log(`📋 Testing ${buttons.length} buttons...`);
    
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      try {
        const button = buttons[i];
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        
        if (isVisible) {
          console.log(`🖱️ Clicking button: "${text}"`);
          await button.click();
          await page.waitForTimeout(1000);
          
          // Take screenshot after clicking
          await page.screenshot({ path: `test-results/after-click-${i + 1}.png` });
          
          // Check if we're in a different mode now
          const currentUrl = page.url();
          const pageTitle = await page.title();
          console.log(`  After click - URL: ${currentUrl}, Title: ${pageTitle}`);
          
          // Look for file input or other indicators of sender mode
          const fileInputs = await page.locator('input[type="file"]').count();
          if (fileInputs > 0) {
            console.log(`  ✅ Found ${fileInputs} file input(s) - this might be sender mode!`);
          }
          
          // Look for room ID related elements
          const roomElements = await page.locator('text=/room|id|join/i').count();
          if (roomElements > 0) {
            console.log(`  ✅ Found ${roomElements} room-related elements - this might be receiver mode!`);
          }
          
          // Go back to main page for next test
          await page.goBack();
          await page.waitForLoadState('networkidle');
        }
      } catch (e) {
        console.log(`  ❌ Error clicking button ${i + 1}: ${e.message}`);
      }
    }
    
    console.log('✅ Element interaction testing completed');
  });
});
