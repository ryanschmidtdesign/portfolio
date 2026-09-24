const PAGE_PILLS = {
  '/dashboard.html': [ "How did you drive 71% more engagement?", "Walk me through your UX research process.", "What lessons did he learn?" ],
  '/inventory.html': [ "Why start with an MVP?", "How did you get stakeholder buy-in?", "What lessons did he learn?" ],
  '/ai-coding-portfolio.html': [ "What tools and workflow did you use?", "Why a database over a JSON file?", "What lessons did he learn?" ],
  '/about.html': [ "What does your mentorship work look like?", "What lessons did he learn?" ],
  '/member-portal-overhaul.html': [ "What was the biggest technical challenge?", "How did you validate the new architecture?", "What lessons did he learn?" ],
  '/': [ "Is Ryan a fit for my role?", "Show strongest proof points.", "Which case study should I read first?" ]
};

function canonicalPagePath(pathname = '') {
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  if (path === '/index.html') return '/';
  const pagesMatch = path.match(/^\/pages\/(.+)$/);
  if (pagesMatch) return '/' + pagesMatch[1];
  return path;
}

function getCurrentPagePills(pathname) {
  const path = canonicalPagePath(pathname);
  return PAGE_PILLS[path] || PAGE_PILLS['/'];
}

console.log('about.html:', getCurrentPagePills('/pages/about.html'));
console.log('index.html:', getCurrentPagePills('/index.html'));
