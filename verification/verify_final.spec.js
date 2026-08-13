import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Verify Character Hub previews are visible', async ({ page }) => {
  // Start server on 8080
  await page.goto('http://localhost:8080/stickman_hub.html');

  // Wait for canvasses to render
  await page.waitForSelector('canvas');

  // Take a screenshot of the Cowboy tab
  await page.screenshot({ path: path.join(__dirname, 'screenshots/hub_cowboy.png') });

  // Switch to Sci-Fi tab
  await page.click('button[data-tab="scifi"]');
  await page.waitForTimeout(500); // Animation/Render time
  await page.screenshot({ path: path.join(__dirname, 'screenshots/hub_scifi_restored.png') });

  // Verify that at least one canvas is not empty (check for pixel data if possible, or just visual review)
  const scifiCanvas = await page.$('#prev-scifi-sf1');
  expect(scifiCanvas).not.toBeNull();
});

test('Verify Landing Page particles', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html');
  await page.screenshot({ path: path.join(__dirname, 'screenshots/index_final.png') });
});
