const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://127.0.0.1:5512/zoom_vs_transform.html');
  const r = await page.evaluate(() => window.__result);
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})();
