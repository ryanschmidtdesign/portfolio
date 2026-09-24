export function isRetryableNavigationError(err = null) {
  const message = (err && (err.message || String(err))) || '';
  if (!message) return false;

  const patterns = [
    'net::ERR_NETWORK_CHANGED',
    'Timeout 30000ms exceeded',
    'net::ERR_CONNECTION_RESET',
    'net::ERR_CONNECTION_ABORTED',
    'net::ERR_INTERNET_DISCONNECTED',
    'net::ERR_NAME_NOT_RESOLVED',
    'The operation was aborted',
    'temporarily unavailable',
    'load failed' 
  ];

  return patterns.some(pattern => message.toLowerCase().includes(pattern.toLowerCase()));
}

export async function retryPageNavigation(page, url, options = {}, retries = 2) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(url, options);
      return true;
    } catch (err) {
      lastError = err;
      if (!isRetryableNavigationError(err) || attempt === retries) {
        throw err;
      }
      await page.waitForTimeout(1500);
    }
  }

  throw lastError;
}
