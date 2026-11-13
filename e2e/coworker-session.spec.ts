import {test, expect, type Page} from '@playwright/test';

async function joinAndDraw(page: Page, code: string, name: string) {
  await page.goto(`/join?code=${code}`);
  await page.getByLabel('Your display name').fill(name);
  await page.getByRole('button', {name: 'Let’s draw a fish'}).click();
  await expect(page.getByLabel('Fish name')).toBeVisible();
  await page.getByLabel('Fish name').fill(`${name}'s fish`);
  const intro = page.getByRole('button', {name: 'Got it', exact: true});
  if (await intro.isVisible()) await intro.click();
  await expect(page.getByRole('button', {name: 'Preview swim', exact: true})).toBeEnabled();
  await page.getByRole('button', {name: 'Brush', exact: true}).click();
  await page.getByRole('region', {name: 'Tool settings'}).getByRole('button', {name: 'Done ✓'}).click();
  const canvas = page.getByRole('img', {name: 'Your fish. Its head faces right and tail faces left.'});
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Fish canvas has no rendered bounds');
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, {steps: 12});
  await page.mouse.up();
  await expect(page.getByRole('button', {name: 'Send fish', exact: true})).toBeEnabled();
}

test('host and two independent coworkers can save, retry and restore fish', async ({browser, page: host}, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  const phones = await Promise.all([0, 1].map(() => browser.newContext({baseURL, viewport: {width: 390, height: 844}})));
  try {
    await host.goto('/');
    await host.getByLabel('Aquarium name').fill('Browser smoke aquarium');
    await host.getByRole('button', {name: 'Create aquarium'}).click();
    await expect(host).toHaveURL(/\/host\/[A-Z2-9]{6}/);
    const code = new URL(host.url()).pathname.split('/').pop()!;
    const alice = await phones[0].newPage();
    const bob = await phones[1].newPage();
    await joinAndDraw(alice, code, 'Alice');
    await alice.getByRole('button', {name: 'Send fish', exact: true}).click();
    await expect(alice.getByText('Your fish is saved!', {exact: true})).toBeVisible();
    await joinAndDraw(bob, code, 'Bob');
    await phones[1].setOffline(true);
    await bob.getByRole('button', {name: 'Send fish', exact: true}).click();
    await expect(bob.getByRole('button', {name: 'Retry sending', exact: true})).toBeEnabled();
    await phones[1].setOffline(false);
    await bob.getByRole('button', {name: 'Retry sending', exact: true}).click();
    await expect(bob.getByText('Your fish is saved!', {exact: true})).toBeVisible();
    await expect(host.locator('.fish-card')).toHaveCount(2);
    await bob.reload();
    await expect(bob.getByText('Your fish is saved!', {exact: true})).toBeVisible();
    await host.reload();
    await expect(host.locator('.fish-card')).toHaveCount(2);
    await expect(host.locator('.swimming-badge')).toHaveCount(2);
    await host.screenshot({path: testInfo.outputPath('host-two-fish.png'), fullPage: true});
    await bob.screenshot({path: testInfo.outputPath('phone-saved.png'), fullPage: true});
    host.once('dialog', dialog => dialog.dismiss());
    await host.getByRole('button', {name: 'End shift', exact: true}).click();
    await expect(host.getByRole('button', {name: 'End shift', exact: true})).toBeVisible();
    host.once('dialog', dialog => dialog.accept());
    await host.getByRole('button', {name: 'End shift', exact: true}).click();
    await expect(host.getByRole('button', {name: 'Start new shift', exact: true})).toBeVisible();
    await expect(host.locator('.fish-card')).toHaveCount(2);
    await expect(host.locator('.swimming-badge')).toHaveCount(0);
    await host.getByRole('button', {name: 'Start new shift', exact: true}).click();
    await host.getByRole('button', {name: 'Select up to 40', exact: true}).click();
    await host.getByRole('button', {name: 'Put 2 in the water', exact: true}).click();
    await expect(host.locator('.swimming-badge')).toHaveCount(2);
  } finally {
    await Promise.all(phones.map(context => context.close()));
  }
});
