import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('should display language selector', async ({ page }) => {
    await page.goto('/');
    
    // Check for language selector in header
    await expect(page.locator('[data-testid="language-selector"]')).toBeVisible();
    
    // Check for language selector in footer
    await expect(page.locator('[data-testid="footer-language-selector"]')).toBeVisible();
  });

  test('should switch languages', async ({ page }) => {
    await page.goto('/');
    
    // Click language selector
    await page.click('[data-testid="language-selector"]');
    
    // Select Spanish
    await page.click('[data-testid="lang-es"]');
    
    // Should redirect to Spanish version
    await expect(page.url()).toContain('/es');
    
    // Content should be in Spanish
    await expect(page.locator('h1')).toContainText('Transforma');
  });

  test('should persist language choice', async ({ page }) => {
    await page.goto('/');
    
    // Switch to French
    await page.click('[data-testid="language-selector"]');
    await page.click('[data-testid="lang-fr"]');
    
    // Navigate to another page
    await page.goto('/pricing');
    
    // Should still be in French
    await expect(page.url()).toContain('/fr');
  });

  test('should support all 12 languages', async ({ page }) => {
    const languages = ['es', 'en', 'pt', 'fr', 'it', 'de', 'nl', 'sv', 'no', 'da', 'ja', 'ko'];
    
    for (const lang of languages) {
      await page.goto(`/${lang}`);
      await expect(page.url()).toContain(`/${lang}`);
      
      // Check that page loads without errors
      await expect(page.locator('body')).toBeVisible();
    }
  });
});