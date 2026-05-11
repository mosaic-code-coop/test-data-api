import { test, expect } from '@playwright/test';

test('shows a STEM profile on first load', async ({ page }) => {
  await page.goto('/test-data-api/');
  await expect(page.locator('article.profile-card h2')).toBeVisible({ timeout: 10_000 });
  const url = new URL(page.url());
  expect(url.searchParams.get('library')).toBe('stem');
  expect(url.searchParams.get('person')).not.toBeNull();
});

test('next/prev navigation changes the profile and URL', async ({ page }) => {
  await page.goto('/test-data-api/');
  const h2 = page.locator('article.profile-card h2');
  await expect(h2).toBeVisible();

  const first = await h2.innerText();
  const firstId = new URL(page.url()).searchParams.get('person');

  await page.getByRole('button', { name: /next/i }).click();
  await expect.poll(async () => (await h2.innerText()) !== first).toBe(true);
  const secondId = new URL(page.url()).searchParams.get('person');
  expect(secondId).not.toBe(firstId);

  await page.getByRole('button', { name: /previous/i }).click();
  await expect.poll(async () => (await h2.innerText()) === first).toBe(true);
});

test('random changes profile at least once across 5 clicks', async ({ page }) => {
  await page.goto('/test-data-api/');
  const h2 = page.locator('article.profile-card h2');
  await expect(h2).toBeVisible();

  const names = new Set<string>();
  for (let i = 0; i < 6; i++) {
    names.add(await h2.innerText());
    await page.getByRole('button', { name: /random/i }).click();
    await page.waitForTimeout(50);
  }
  expect(names.size).toBeGreaterThanOrEqual(2);
});

test('First Nations library shows acknowledgment modal', async ({ page }) => {
  await page.goto('/test-data-api/');
  await page.getByLabel(/First Nations/i).check();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/may now be deceased/i)).toBeVisible();
});

test('declining FN modal switches back to STEM', async ({ page }) => {
  await page.goto('/test-data-api/');
  await page.getByLabel(/First Nations/i).check();
  await page.getByRole('button', { name: /STEM library instead/i }).click();
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await expect(page.locator('article.profile-card h2')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('library')).toBe('stem');
});

test('confirming FN modal loads First Nations profile', async ({ page }) => {
  await page.goto('/test-data-api/');
  await page.getByLabel(/First Nations/i).check();
  await page.getByRole('button', { name: /acknowledge/i }).click();
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await expect(page.locator('article.profile-card h2')).toBeVisible({ timeout: 10_000 });
  expect(new URL(page.url()).searchParams.get('library')).toBe('first-nations');
});

test('deep link to specific person loads that profile', async ({ page }) => {
  // First find a known person id from the STEM dataset
  await page.goto('/test-data-api/');
  await expect(page.locator('article.profile-card h2')).toBeVisible();
  const personId = new URL(page.url()).searchParams.get('person');
  const name = await page.locator('article.profile-card h2').innerText();

  // Re-visit with the same person id
  await page.goto(`/test-data-api/?library=stem&person=${personId}`);
  await expect(page.locator('article.profile-card h2')).toHaveText(name);
});

test('issue link references the framework or library repo', async ({ page }) => {
  await page.goto('/test-data-api/');
  const issueLink = page.getByRole('link', { name: /See something incorrect/i });
  await expect(issueLink).toBeVisible();
  const href = await issueLink.getAttribute('href');
  expect(href).toMatch(
    /github\.com\/mosaic-sunrise\/test-data-stem-women-trans-bipoc\/issues\/new/,
  );
  expect(href).toContain('Correction');
});
