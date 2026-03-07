import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/connections');
  await page.waitForTimeout(2000); // Wait for content to load
  await page.screenshot({ path: 'connections.png' });
  await browser.close();
})();
