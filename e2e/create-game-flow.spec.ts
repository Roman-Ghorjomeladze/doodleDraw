import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';

test.describe('Create Game Flow', () => {
  test('create classic room and verify lobby', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForTimeout(500);

    // Fill nickname (guest mode)
    const nicknameInput = page.locator('input[placeholder*="nickname" i]').first();
    if (await nicknameInput.isVisible()) {
      await nicknameInput.fill('TestPlayer');
    }

    // Click Create Room button
    const createBtn = page.getByText('Create Room', { exact: true }).last();
    await createBtn.click();

    // Should now be in the lobby — verify room code appears in header
    await page.waitForTimeout(1500);
    const roomCode = page.locator('.font-mono.font-bold').first();
    await expect(roomCode).toBeVisible({ timeout: 5000 });
  });

  test('create team room and verify mode', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForTimeout(500);

    // Click team battle button if visible
    const teamBtn = page.getByText('Team Battle', { exact: false }).first();
    if (await teamBtn.isVisible()) {
      await teamBtn.click();
    }

    // Fill nickname
    const nicknameInput = page.locator('input[placeholder*="nickname" i]').first();
    if (await nicknameInput.isVisible()) {
      await nicknameInput.fill('TeamPlayer');
    }

    // Create
    const createBtn = page.getByText('Create Room', { exact: true }).last();
    await createBtn.click();

    await page.waitForTimeout(1500);
    // Verify in lobby (room code visible)
    const roomCode = page.locator('.font-mono.font-bold').first();
    await expect(roomCode).toBeVisible({ timeout: 5000 });
  });
});
