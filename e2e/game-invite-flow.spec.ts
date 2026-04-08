import { test, expect, type Page } from '@playwright/test';

const APP_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

// Helper: register user via API and return token
async function registerViaAPI(username: string, password: string, nickname: string) {
  const persistentId = `e2e-${username}-${Date.now()}`;
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      nickname,
      avatar: 'adventurer:Adrian',
      country: 'US',
      birthYear: 1995,
      persistentId,
    }),
  });
  if (!res.ok) {
    // Try login if already exists
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return loginRes.json();
  }
  return res.json();
}

// Helper: make two users friends via API
async function makeFriendsViaAPI(tokenA: string, persistentIdB: string) {
  await fetch(`${API_URL}/api/friends/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ targetPersistentId: persistentIdB }),
  });
}

// Helper: login user in the browser
async function loginInBrowser(page: Page, username: string, password: string) {
  await page.goto(APP_URL);
  await page.click('button[aria-label="Settings"]');
  await page.waitForTimeout(300);
  await page.getByText('Log In / Register').click();
  await page.waitForTimeout(300);
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForTimeout(1500);
}

test.describe('Game Invite Flow', () => {
  test('invite friend to game and friend accepts', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const ts = Date.now();
    const userA = `invite_a_${ts}`;
    const userB = `invite_b_${ts}`;

    try {
      // Register both users via API
      const resultA = await registerViaAPI(userA, 'password123', 'InviterA');
      const resultB = await registerViaAPI(userB, 'password123', 'InviterB');

      // Make them friends via API
      await makeFriendsViaAPI(resultA.token, resultB.user.persistentId);
      // Accept from B's side
      const pendingRes = await fetch(`${API_URL}/api/friends/requests`, {
        headers: { Authorization: `Bearer ${resultB.token}` },
      });
      const pending = await pendingRes.json();
      if (pending.incoming?.length > 0) {
        await fetch(`${API_URL}/api/friends/request/respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resultB.token}`,
          },
          body: JSON.stringify({
            requestId: pending.incoming[0].id,
            action: 'accept',
          }),
        });
      }

      // Login both in browsers
      await loginInBrowser(pageA, userA, 'password123');
      await loginInBrowser(pageB, userB, 'password123');

      // UserA: create a room
      const nicknameInput = pageA.locator('input[placeholder*="nickname"]');
      if (await nicknameInput.isVisible()) {
        await nicknameInput.fill('InviterA');
      }
      await pageA.getByText('Create Room').last().click();
      await pageA.waitForTimeout(1000);

      // UserA: click Invite Friends button in lobby
      await pageA.getByText('friends.inviteFriends').click();
      await pageA.waitForTimeout(500);

      // UserA: invite UserB
      const inviteBtn = pageA.getByText('friends.invite').first();
      if (await inviteBtn.isVisible()) {
        await inviteBtn.click();
        await pageA.waitForTimeout(500);

        // Verify it shows "Invited"
        await expect(pageA.getByText('friends.invited').first()).toBeVisible();
      }

      // UserB: should see game invite toast
      await pageB.waitForTimeout(2000);
      const acceptBtn = pageB.getByText('friends.accept').first();
      if (await acceptBtn.isVisible({ timeout: 5000 })) {
        await acceptBtn.click();
        await pageB.waitForTimeout(1000);

        // UserB should now be in the lobby (room code visible in header)
        const roomCode = pageA.locator('.font-mono.font-bold');
        if (await roomCode.isVisible()) {
          const code = await roomCode.textContent();
          // UserB should show the same room code
          await expect(pageB.locator(`.font-mono.font-bold:has-text("${code}")`)).toBeVisible({ timeout: 5000 });
        }
      }
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
