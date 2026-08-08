import { expect, Page, test } from '@playwright/test';

async function loginAs(page: Page, nickname: string) {
  await page.goto('/');
  await expect(page.getByTestId('login-nickname')).toBeVisible();
  await page.getByTestId('login-nickname').fill(nickname);
  await page.getByTestId('login-age').fill('25');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('idle-page')).toBeVisible();
  await expect(page.getByText(`Привет, ${nickname}!`)).toBeVisible();
}

test.describe('two-tab smoke', () => {
  test('match, chat, and leave', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await loginAs(pageA, 'AliceSmoke');
    await loginAs(pageB, 'BobSmoke');

    await pageA.getByTestId('start-search').click();
    await expect(pageA.getByTestId('searching-page')).toBeVisible();

    await expect(pageB.getByTestId('proposal-modal')).toBeVisible({
      timeout: 10_000,
    });
    await pageB.getByTestId('proposal-accept').click();

    await expect(pageA.getByTestId('chat-page')).toBeVisible();
    await expect(pageB.getByTestId('chat-page')).toBeVisible();
    await expect(pageA.getByText('BobSmoke')).toBeVisible();
    await expect(pageB.getByText('AliceSmoke')).toBeVisible();

    await pageA.getByTestId('chat-input').fill('hello from A');
    await pageA.getByTestId('chat-send').click();
    await expect(pageB.getByText('hello from A')).toBeVisible();

    await pageB.getByTestId('chat-input').fill('hello from B');
    await pageB.getByTestId('chat-send').click();
    await expect(pageA.getByText('hello from B')).toBeVisible();

    await pageA.getByTestId('leave-chat').click();
    await expect(pageA.getByTestId('idle-page')).toBeVisible();
    await expect(pageB.getByTestId('idle-page')).toBeVisible();
    await expect(pageB.getByText('Собеседник покинул чат')).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
