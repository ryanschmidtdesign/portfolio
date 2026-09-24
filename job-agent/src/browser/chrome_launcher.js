import { chromium } from 'playwright';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Connects to a running Chrome instance with remote debugging, 
 * OR launches a persistent browser context to retain logins/cookies.
 */
export async function launchBrowser({ cdpUrl = 'http://localhost:9222', headless = false } = {}) {
  // Option 1: Attempt to attach to existing user Chrome instance if running with --remote-debugging-port=9222
  try {
    const browser = await chromium.connectOverCDP(cdpUrl);
    console.log(`[Browser] Successfully attached to existing Chrome instance at ${cdpUrl}`);
    const defaultContext = browser.contexts()[0] || await browser.newContext();
    return { browser, context: defaultContext, isCDP: true };
  } catch (err) {
    console.log(`[Browser] No active Chrome CDP at ${cdpUrl}. Launching dedicated persistent profile.`);
  }

  // Option 2: Launch persistent context in dedicated project directory
  const userDataDir = path.join(__dirname, '../../.chrome_profile');
  try {
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
  } catch (e) {}

  // Remove stale Chromium singleton lock files if previous process crashed or was killed
  const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie'];
  for (const file of lockFiles) {
    const lockPath = path.join(userDataDir, file);
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch (e) {}
  }

  const realisticUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless,
      viewport: { width: 1280, height: 800 },
      userAgent: realisticUserAgent,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-crash-reporter'
      ]
    });
    
    // Inject anti-bot evasion scripts
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      window.chrome = { runtime: {} };
    });
    
    return { browser: null, context, isCDP: false };
  } catch (launchErr) {
    console.warn(`[Browser] Persistent profile note: ${launchErr.message}`);
    console.log(`[Browser] Launching clean isolated browser instance...`);
    const browser = await chromium.launch({
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    const context = await browser.newContext({ 
      viewport: { width: 1280, height: 800 },
      userAgent: realisticUserAgent
    });
    
    // Inject anti-bot evasion scripts
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      window.chrome = { runtime: {} };
    });
    
    return { browser, context, isCDP: false };
  }
}
