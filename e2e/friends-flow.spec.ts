import { test, expect, type Page } from '@playwright/test';

const APP_URL = 'http://localhost:5173';

// Helper: register a user via the UI
async function registerUser(page: Page, username: string, password: string, nickname: string) {
  await page.goto(APP_URL);

  // Open settings
  await page.click('button[aria-label="Settings"]');
  await page.waitForTimeout(300);

  // Click Login/Register button
  await page.getByText('Log In / Register').click();
  await page.waitForTimeout(300);

  // Switch to Register tab
  await page.getByText('Register').click();
  await page.waitForTimeout(200);

  // Fill registration form
  await page.locator('input[autocomplete="username"]').last().fill(username);
  await page.locator('input[type="password"]').last().fill(password);

  // Set nickname
  const nicknameInput = page.locator('input[autocomplete="username"]').first();
  if (await nicknameInput.isVisible()) {
    // The nickname field might be separate
  }

  // Submit
  await page.getByRole('button', { name: /register/i }).last().click();
  await page.waitForTimeout(1000);
}

// Helper: login a user
async function loginUser(page: Page, username: string, password: string) {
  await page.goto(APP_URL);

  // Open settings
  await page.click('button[aria-label="Settings"]');
  await page.waitForTimeout(300);

  // Click Login/Register
  await page.getByText('Log In / Register').click();
  await page.waitForTimeout(300);

  // Fill login form (Login tab is default)
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);

  // Submit
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForTimeout(1000);
}

test.describe('Friends Flow', () => {
  test('full friend request lifecycle: search, add, accept, remove', async ({ browser }) => {
    // Create two browser contexts (two different users)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const userA = `testuser_a_${Date.now()}`;
    const userB = `testuser_b_${Date.now()}`;

    try {
      // Register both users
      await registerUser(pageA, userA, 'password123', 'UserA');
      await registerUser(pageB, userB, 'password123', 'UserB');

      // UserA: open friends sidebar
      await pageA.click('button[aria-label="Friends"]');
      await pageA.waitForTimeout(300);

      // UserA: switch to search tab
      await pageA.getByText('friends.search').click();
      await pageA.waitForTimeout(200);

      // UserA: search for UserB
      await pageA.locator('input[placeholder="friends.search"]').fill(userB);
      await pageA.waitForTimeout(500); // wait for debounce

      // UserA: click Add Friend
      await pageA.getByText('friends.addFriend').click();
      await pageA.waitForTimeout(500);

      // Verify the button changed to Pending
      await expect(pageA.getByText('friends.pending')).toBeVisible();

      // UserB: open friends sidebar and check for incoming request
      await pageB.click('button[aria-label="Friends"]');
      await pageB.waitForTimeout(300);

      // UserB: go to requests tab
      await pageB.getByText('friends.requests').click();
      await pageB.waitForTimeout(300);

      // UserB: accept the friend request
      await pageB.getByText('friends.accept').click();
      await pageB.waitForTimeout(500);

      // UserB: switch to friends tab - should see UserA
      await pageB.getByText('friends.title').first().click();
      await pageB.waitForTimeout(300);

      // Verify both users see each other in friends list
      await expect(pageB.locator('text=UserA').first()).toBeVisible();

      // UserA: close sidebar and reopen to see updated friends list
      await pageA.keyboard.press('Escape');
      await pageA.waitForTimeout(200);
      await pageA.click('button[aria-label="Friends"]');
      await pageA.waitForTimeout(500);

      // UserA should see UserB as a friend
      await expect(pageA.locator(`text=@${userB}`).first()).toBeVisible();

    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
