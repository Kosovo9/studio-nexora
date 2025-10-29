import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display sign in page', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await expect(page.locator('h1')).toContainText('Welcome Back');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should display sign up page', async ({ page }) => {
    await page.goto('/auth/signup');
    
    await expect(page.locator('h1')).toContainText('Create Account');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should require email for sign in', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
    
    await page.fill('input[type="email"]', 'test@example.com');
    await expect(submitButton).toBeEnabled();
  });

  test('should require terms agreement for sign up', async ({ page }) => {
    await page.goto('/auth/signup');
    
    const submitButton = page.locator('button[type="submit"]');
    await page.fill('input[type="email"]', 'test@example.com');
    
    await expect(submitButton).toBeDisabled();
    
    await page.check('input[type="checkbox"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should redirect to callback URL after sign in', async ({ page }) => {
    await page.goto('/auth/signin?callbackUrl=/dashboard');
    
    await expect(page.url()).toContain('callbackUrl=/dashboard');
  });
});