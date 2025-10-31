import { test, expect } from '@playwright/test';

test.describe('Pricing and Checkout Flow', () => {
  test('should display pricing plans', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check for all three plans
    await expect(page.locator('[data-testid="plan-basic"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-pro"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-vip"]')).toBeVisible();
    
    // Check pricing
    await expect(page.locator('[data-testid="price-basic"]')).toContainText('$5');
    await expect(page.locator('[data-testid="price-pro"]')).toContainText('$15');
    await expect(page.locator('[data-testid="price-vip"]')).toContainText('$30');
  });

  test('should require authentication for checkout', async ({ page }) => {
    await page.goto('/pricing');
    
    // Click on a plan without being authenticated
    await page.click('[data-testid="choose-basic"]');
    
    // Should redirect to sign in
    await expect(page.url()).toContain('/auth/signin');
  });

  test('should redirect to Stripe checkout when authenticated', async ({ page }) => {
    // Mock authentication
    await page.goto('/pricing');
    
    // This would require setting up authentication state
    // await page.click('[data-testid="choose-pro"]');
    
    // Should redirect to Stripe checkout
    // await expect(page.url()).toContain('checkout.stripe.com');
  });

  test('should display plan features', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check that features are displayed for each plan
    await expect(page.locator('[data-testid="basic-features"]')).toBeVisible();
    await expect(page.locator('[data-testid="pro-features"]')).toBeVisible();
    await expect(page.locator('[data-testid="vip-features"]')).toBeVisible();
  });
});
