import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateHtml() {
  const dbPath = path.join(__dirname, 'src/storage/db.json');
  if (!fs.existsSync(dbPath)) {
    console.log("No db.json found yet.");
    return;
  }
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const totalApps = db.applications.filter(a => a.status === 'SUBMITTED' || a.status === 'DRY_RUN_COMPLETED').length;
  const failedApps = db.applications.filter(a => a.status === 'FAILED').length;
  
  const weeklyBudget = 500000;
  const tokensUsed = db.tokenUsage ? db.tokenUsage.tokensUsed : 0;
  const tokenPct = ((tokensUsed / weeklyBudget) * 100).toFixed(1);

  let appRows = '';
  const recentApps = [...db.applications].reverse().slice(0, 100);
  for (const app of recentApps) {
    const isSuccess = app.status === 'SUBMITTED' || app.status === 'DRY_RUN_COMPLETED';
    const statusColor = isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    const dateStr = new Date(app.appliedAt || app.recordedAt).toLocaleString();
    
    appRows += `
      <tr class="border-b">
        <td class="p-3 text-sm text-gray-700">${dateStr}</td>
        <td class="p-3 text-sm font-medium text-gray-900">${app.title}</td>
        <td class="p-3 text-sm text-gray-700 uppercase">${app.atsType}</td>
        <td class="p-3 text-sm"><span class="px-2 py-1 rounded-full text-xs font-semibold ${statusColor}">${app.status}</span></td>
        <td class="p-3 text-sm text-gray-600 truncate max-w-xs" title="${(app.failureReason || '').replace(/"/g, '&quot;')}">${app.failureReason || '-'}</td>
        <td class="p-3 text-sm text-blue-600 hover:underline"><a href="${app.url}" target="_blank">Link</a></td>
      </tr>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Agent Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 p-8 font-sans">
  <div class="max-w-6xl mx-auto">
    <header class="mb-8 flex justify-between items-center">
      <h1 class="text-3xl font-bold text-gray-900">Job Agent Dashboard</h1>
      <p class="text-sm text-gray-500 italic">Auto-updates while agent is running</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 class="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Applications</h3>
        <p class="text-4xl font-bold text-gray-900 mt-2">${totalApps}</p>
      </div>
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 class="text-gray-500 text-sm font-medium uppercase tracking-wide">Failed Attempts</h3>
        <p class="text-4xl font-bold text-gray-900 mt-2">${failedApps}</p>
      </div>
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 class="text-gray-500 text-sm font-medium uppercase tracking-wide">Success Rate</h3>
        <p class="text-4xl font-bold text-gray-900 mt-2">${totalApps + failedApps > 0 ? ((totalApps / (totalApps + failedApps)) * 100).toFixed(1) : 0}%</p>
        <p class="text-xs text-gray-500 mt-1">${totalApps} / ${totalApps + failedApps} attempts</p>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 class="text-lg font-semibold text-gray-800">Recent Activity</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b">
              <th class="p-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
              <th class="p-3 text-xs font-semibold text-gray-600 uppercase">Role</th>
              <th class="p-3 text-xs font-semibold text-gray-600 uppercase">ATS</th>
              <th class="p-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th class="p-3 text-xs font-semibold text-gray-600 uppercase">Reason (If Failed)</th>
              <th class="p-3 text-xs font-semibold text-gray-600 uppercase">Job Link</th>
            </tr>
          </thead>
          <tbody>
            ${appRows}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, 'dashboard.html'), html);
  console.log("Generated dashboard.html");
}

generateHtml();
