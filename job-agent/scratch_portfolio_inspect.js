import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://job-boards.greenhouse.io/smartsheet/jobs/8191836', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => {
    const out = [];
    for (const lbl of document.querySelectorAll('label, legend')) {
      const t = lbl.innerText || '';
      if (!/portfolio/i.test(t)) continue;
      const root = lbl.closest('div') || lbl.parentElement;
      const inputs = root ? [...root.querySelectorAll('input, textarea')].map(i => ({
        type: i.type, name: i.name, id: i.id, value: i.value, placeholder: i.placeholder,
      })) : [];
      out.push({ label: t.slice(0, 80), inputs });
    }
    return out;
  });
  const structure = await page.evaluate(() => {
    const input = document.querySelector('[id^="question_"]');
    const lbl = [...document.querySelectorAll('label, legend')].find(l => /portfolio/i.test(l.innerText));
    const root = lbl?.closest('.field, .application-field, fieldset, .question, div[class*="field"]') || lbl?.parentElement;
    return {
      lblText: lbl?.innerText?.slice(0, 60),
      rootClass: root?.className,
      hasInputInRoot: !!root?.querySelector('input[id^="question_"]'),
      questionIds: [...document.querySelectorAll('input[id^="question_"]')].map(i => i.id),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  console.log(JSON.stringify(structure, null, 2));
  await browser.close();
})();
