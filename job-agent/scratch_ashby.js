import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://jobs.ashbyhq.com/acorns/57eb2798-e357-42d6-aa74-6f98c837015d/application');
  await page.waitForTimeout(5000);
  
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('ashby_dom.html', html);
  
  await browser.close();
})();
