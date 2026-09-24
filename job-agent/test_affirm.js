import { chromium } from 'playwright';
import { applyGreenhouse } from './src/ats/greenhouse.js';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://job-boards.greenhouse.io/affirm/jobs/7990774003');
  
  const profile = {
    personal: {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      phone: "555-555-5555",
      location: { city: "San Francisco", stateAbbr: "CA", country: "United States" },
      links: { linkedin: "https://linkedin.com/in/test", portfolio: "https://test.com" }
    },
    education: [{}, {}, { institution: "Test Univ", degree: "BS", focus: "CS" }],
    experience: [{ company: "Test Co", title: "Dev" }]
  };
  
  const res = await applyGreenhouse(page, profile, "cover letter", "./README.md", false, page);
  console.log("Result:", res);
  
  if (!res.submitted) {
    await page.screenshot({ path: 'affirm_error.png', fullPage: true });
    console.log("Saved screenshot to affirm_error.png");
  }
  
  await browser.close();
})();
