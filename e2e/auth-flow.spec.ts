import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

test.describe('Auth Flow', () => {
  test('register, logout, and re-login', async ({ page }) => {
    const username = `e2etest_${Date.now()}`;
    const password = 'TestPass123';
    const persistentId = `e2e-${username}`;

    // Register via API for speed and reliability
    const registerRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        nickname: 'E2EUser',
        avatar: 'adventurer:Adrian',
        country: 'US',
        birthYear: 1995,
        persistentId,
      }),
    });
    expect(registerRes.ok).toBe(true);
    const { token } = await registerRes.json();
    expect(token).toBeTruthy();

    // Verify /api/auth/me works with the token
    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.ok).toBe(true);
    const me = await meRes.json();
    expect(me.username).toBe(username);

    // Logout
    const logoutRes = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutRes.ok).toBe(true);

    // Verify token is invalidated
    const meAfter = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meAfter.status).toBe(401);

    // Re-login
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    expect(loginRes.ok).toBe(true);
    const { token: newToken } = await loginRes.json();
    expect(newToken).toBeTruthy();
  });

  test('register validation: rejects duplicate username', async () => {
    const username = `dup_${Date.now()}`;

    // First registration succeeds
    const r1 = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: 'Pass1234',
        nickname: 'Dup1',
        avatar: 'adventurer:Adrian',
        country: 'US',
        birthYear: 1995,
        persistentId: `pid-1-${username}`,
      }),
    });
    expect(r1.ok).toBe(true);

    // Second registration with same username fails
    const r2 = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: 'Pass1234',
        nickname: 'Dup2',
        avatar: 'adventurer:Adrian',
        country: 'US',
        birthYear: 1995,
        persistentId: `pid-2-${username}`,
      }),
    });
    expect(r2.status).toBe(409);
  });

  test('login: rejects bad credentials', async () => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent_user_xyz', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });
});
