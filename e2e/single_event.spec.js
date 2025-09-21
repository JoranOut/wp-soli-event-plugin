import { test, expect } from '@playwright/test';

test('happy flow of adding and viewing a single date event', async ({page}) => {
    await page.goto('/wp-login.php');
    await page.getByRole('textbox', { name: 'Username or Email Address' }).fill('admin');
    await page.getByRole('textbox', { name: 'Username or Email Address' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password' }).fill('password');
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.getByRole('link', { name: 'Events' }).first().click();
    await page.locator('#wpbody-content').getByRole('link', { name: 'Add New Event' }).click();
    await page.getByRole('textbox', { name: 'Add title' }).click();
    await page.getByRole('textbox', { name: 'Add title' }).fill('Single Event Concert');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.getByLabel('Editor publish').getByRole('button', { name: 'Publish', exact: true }).click();
    await page.getByRole('link', { name: 'View Posts' }).click();
    await page.getByRole('row', { name: 'Select Single Event Concert “Single Event Concert” (Edit) Edit “Single Event Concert” | Quick edit “Single Event Concert” inline | Move “Single Event Concert” to the Trash | View admin September 21, 2025 11:18 am September 21, 2025 12:18 pm -', exact: true }).getByLabel('“Single Event Concert” (Edit)').click();

    await expect(page.getByLabel('Add title')).toContainText('Single Event Concert');
    const page2Promise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'View Event' }).click();
    const page2 = await page2Promise;
    await expect(page2.locator('h1')).toContainText('Single Event Concert');
    await expect(page2.getByText('September 2025 (Sunday)13:18 - 14:18')).toBeVisible();
});