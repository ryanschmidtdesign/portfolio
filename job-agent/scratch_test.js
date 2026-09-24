import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://careers.roblox.com/jobs/37618', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  let activeContext = page;
  for (const frame of page.frames()) {
    try {
      const hasForm = await frame.$('input[type="file"], input[type="email"], input[name*="first_name" i]').catch(() => null);
      if (hasForm && frame !== page.mainFrame()) {
        activeContext = frame;
        console.log("Found iframe:", frame.url());
        break;
      }
    } catch (e) {}
  }
  
  if (activeContext === page) {
    console.log("No iframe found, using main page.");
  }
  
  const firstName = await activeContext.$('#first_name, input[name*="first_name" i]');
  if (firstName) {
    console.log("Found first name input!");
  } else {
    console.log("Could not find first name input.");
  }
  
  await browser.close();
})();
