import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';

test.describe('Bot Lobby Flow', () => {
  test('navigate to public lobbies and join a bot game', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForTimeout(500);

    // Set nickname (guest mode)
    const nicknameInput = page.locator('input[placeholder*="nickname" i]').first();
    if (await nicknameInput.isVisible()) {
      await nicknameInput.fill('BotPlayer');
    }

    // Navigate to "Play with Bot" or "Public Lobbies" tab
    const lobbiesTab = page.getByText(/Play with Bot|Public Lobbies/i).first();
    if (await lobbiesTab.isVisible({ timeout: 3000 })) {
      await lobbiesTab.click();
      await page.waitForTimeout(500);

      // Look for a join button on a lobby
      const joinBtn = page.getByRole('button').filter({ hasText: /join|play/i }).first();
      if (await joinBtn.isVisible({ timeout: 3000 })) {
        await joinBtn.click();
        await page.waitForTimeout(2000);

        // Verify a room code is now visible (we joined a room)
        const roomCode = page.locator('.font-mono.font-bold').first();
        await expect(roomCode).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
