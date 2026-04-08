import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';

test.describe('Join Game Flow', () => {
  test('user A creates room, user B joins by code', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // User A creates a room
      await pageA.goto(APP_URL);
      await pageA.waitForTimeout(500);

      const nicknameA = pageA.locator('input[placeholder*="nickname" i]').first();
      if (await nicknameA.isVisible()) {
        await nicknameA.fill('UserA');
      }

      const createBtn = pageA.getByText('Create Room', { exact: true }).last();
      await createBtn.click();
      await pageA.waitForTimeout(1500);

      // Get the room code
      const roomCodeElement = pageA.locator('.font-mono.font-bold').first();
      await expect(roomCodeElement).toBeVisible({ timeout: 5000 });
      const roomCode = await roomCodeElement.textContent();
      expect(roomCode).toBeTruthy();

      // User B navigates to join
      await pageB.goto(APP_URL);
      await pageB.waitForTimeout(500);

      // Click Join Room tab
      const joinTab = pageB.getByText('Join Room').first();
      if (await joinTab.isVisible()) {
        await joinTab.click();
        await pageB.waitForTimeout(300);
      }

      // Type the room code into the inputs
      const codeInputs = pageB.locator('input[type="text"]');
      const code = (roomCode ?? '').trim();
      for (let i = 0; i < code.length && i < 6; i++) {
        await codeInputs.nth(i).fill(code[i]);
      }

      // Fill nickname if needed
      const nicknameB = pageB.locator('input[placeholder*="nickname" i]').first();
      if (await nicknameB.isVisible()) {
        await nicknameB.fill('UserB');
      }

      // Click Join button
      const joinButton = pageB.getByText('Join Room').last();
      await joinButton.click();
      await pageB.waitForTimeout(1500);

      // Verify B is in the same room
      const codeInB = pageB.locator(`.font-mono.font-bold:has-text("${code}")`).first();
      await expect(codeInB).toBeVisible({ timeout: 5000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
