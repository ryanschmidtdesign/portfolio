const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('/Users/ryanschmidt/Desktop/Portfolio Dev/.cursor/debug-b6ebec.log');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const errors = {};
  for await (const line of rl) {
    try {
      const entry = JSON.parse(line);
      if (entry.message === 'Application result') {
        const data = entry.data || {};
        if (data.status === 'FAILED') {
          const reason = data.failureReason || data.error || 'Unknown';
          const ats = data.atsType || 'UnknownATS';
          const key = `[${ats}] ${reason}`;
          errors[key] = (errors[key] || 0) + 1;
        }
      } else if (entry.location && entry.location.includes('error')) {
        const err = entry.data || entry.message;
        const errStr = typeof err === 'object' ? err.errorSnippet : err;
        const ats = entry.atsType || entry.location;
        const key = `[${ats}] ${errStr}`;
        errors[key] = (errors[key] || 0) + 1;
      }
    } catch (e) {}
  }
  
  console.log("=== Top Errors/Failures by ATS ===");
  Object.entries(errors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([k, v]) => console.log(`${v}: ${k}`));
}
processLineByLine();
