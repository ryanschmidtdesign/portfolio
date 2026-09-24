import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://job-boards.greenhouse.io/smartsheet/jobs/8191836', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  
  for (const frame of page.frames()) {
    const html = await frame.evaluate(() => {
      const btn = document.querySelector('.select__control');
      if (btn) btn.click();
      return null;
    });
  }
  await page.waitForTimeout(500);
  for (const frame of page.frames()) {
    const html = await frame.evaluate(() => {
      const input = document.querySelector('input.select__input');
      if (input) {
        input.value = "Male";
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return null;
    });
  }
  await page.waitForTimeout(1000);
  for (const frame of page.frames()) {
    const html = await frame.evaluate(() => {
      const menu = document.querySelector('.select__menu, div[role="listbox"], [id*="listbox"]');
      return menu ? menu.outerHTML : 'NO MENU';
    });
    if (html && html !== 'NO MENU') console.log("MENU HTML:\n" + html);
  }

  
  await browser.close();
})();
