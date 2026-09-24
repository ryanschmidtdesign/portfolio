import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Test Samsara
  console.log("Testing Samsara...");
  await page.goto('https://www.samsara.com/company/careers/open-roles/lead-product-designer-remote-canada-5372/');
  await page.waitForTimeout(3000);
  
  const applyButton = await page.$('a:has-text("Apply now"), a:has-text("Apply for this job"), button:has-text("Apply now"), button:has-text("Apply for this job"), button:has-text("Apply")');
  if (applyButton) {
    console.log("Found apply button, clicking...");
    const pagePromise = context.waitForEvent('page', { timeout: 3000 }).catch(() => null);
    await applyButton.click();
    const newPage = await pagePromise;
    if (newPage) {
      console.log("Opened NEW tab:", newPage.url());
    } else {
      console.log("Same tab, new URL:", page.url());
    }
  } else {
    console.log("No apply button found.");
  }
  
  await browser.close();
})();
