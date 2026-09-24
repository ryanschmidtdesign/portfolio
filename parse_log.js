const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('/Users/ryanschmidt/Desktop/Portfolio Dev/.cursor/debug-b6ebec.log');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const errors = {};
  const atsStats = {};

  for await (const line of rl) {
    try {
      const entry = JSON.parse(line);
      // Look for application results or errors
      if (entry.message === 'Application result') {
        const data = entry.data || {};
        if (data.status === 'FAILED') {
          const reason = data.failureReason || data.error || 'Unknown';
          const ats = data.atsType || 'Unknown ATS';
          
          if (!errors[reason]) errors[reason] = 0;
          errors[reason]++;
          
          if (!atsStats[ats]) atsStats[ats] = { success: 0, failed: 0 };
          atsStats[ats].failed++;
        } else if (data.status === 'SUBMITTED' || data.success) {
          const ats = data.atsType || 'Unknown ATS';
          if (!atsStats[ats]) atsStats[ats] = { success: 0, failed: 0 };
          atsStats[ats].success++;
        }
      }
    } catch (e) {}
  }
  
  console.log("=== Top Failure Reasons ===");
  Object.entries(errors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([k, v]) => console.log(`${v}: ${k}`));
    
  console.log("\n=== ATS Stats ===");
  console.log(atsStats);
}

processLineByLine();
