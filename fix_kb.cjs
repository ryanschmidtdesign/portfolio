const fs = require('fs');

let kb = JSON.parse(fs.readFileSync('assets/portfolio-kb.json', 'utf8'));

// Update Member Portal
const mp = kb.case_studies.find(c => c.id === 'member-portal-overhaul');
if (mp) {
  mp.status = 'live';
  mp.title = 'i4cp Member Portal Growth Overhaul';
  mp.short_title = 'Member Portal Overhaul';
  mp.audience = 'Enterprise members consuming research insights';
  mp.problem = 'The old taxonomy was so tangled that members assumed we just didn\'t have content for their specific roles or industries. Many just stopped logging in.';
  mp.proof_points = [
    'Overhauled the portal\'s architecture and core experience so members could actually find what they were paying for.',
    'Replaced the traditional search bar with an AI discovery engine (Ahri) acting as an omnibar.',
    'Designed fallback logic into the AI itself to handle traditional keyword searches, avoiding stakeholder pushback.',
    'Drove a 500% jump in AI usage in the first month by putting AI discovery front and center.'
  ];
  mp.constraints = ['Stakeholder fear of removing traditional search', 'Complex legacy taxonomy'];
  mp.role = 'Lead UX Designer / PM';
  mp.summary_short = 'Untangled a confusing architecture to help members find what they pay for, driving a 500% jump in AI usage.';
  mp.outcomes = [
    { metric: '**AI Activation**', value: '**+500%**', note: 'AI usage jumped 500% in the first month' },
    { metric: '**Legacy Search Sunset**', value: '**100%**', note: 'Removed the traditional keyword search bar with almost zero complaints' }
  ];
  mp.impact_narrative = 'By untangling the architecture, Ryan made it significantly faster for members to reach their "Aha!" moment, protecting long-term retention and driving a 500% jump in AI usage.';
}

// Update Dashboard
const db = kb.case_studies.find(c => c.id === 'dashboard');
if (db) {
  db.problem = 'Users ignored static default dashboards while leadership wanted an AI-first UX. Research revealed users needed trustworthy KPI anchors before adopting AI insights.';
  db.proof_points = [
    'Designed customizable, role-based dashboards as the core anchor, layering AI summaries on top of verified metrics rather than replacing dashboards.',
    'To prevent hallucination and maintain trust, constrained the LLM\'s context window exclusively to the JSON output of the user\'s active widgets.',
    'Governed the UI closely with 4 engineering partners without a strict component library, relying on repeatable widget patterns to keep velocity high.',
    'Turned an ignored dashboard feature into the main way teams track their work, driving a 71% jump in adoption.'
  ];
  db.constraints = ['No mature design system', 'Executive push for AI vs User need for trust'];
  db.role = 'Lead Product Designer & Acting PM';
  db.summary_short = 'Turned an ignored dashboard feature into the main way teams track their work, driving a 71% jump in adoption.';
  db.outcomes = [
    { metric: '**Dashboard Engagement**', value: '**+71%**', note: 'Increase in feature navigation' },
    { metric: '**Multi-dashboard users**', value: '**62%**', note: 'Beta adoption' },
    { metric: '**Interaction depth**', value: '**2.0**', note: 'Avg. during beta' }
  ];
  db.impact_narrative = 'Drove a 71% increase in navigation clicks to the dashboard, transformed static reporting into an interactive sales-demo highlight, and established a trusted foundation for AI features.';
}

// Update Inventory
const inv = kb.case_studies.find(c => c.id === 'inventory');
if (inv) {
  inv.problem = 'Customers managed inventory in external spreadsheets, causing tracking errors and blocking enterprise sales deals.';
  inv.proof_points = [
    'Designed a unified inventory model across purchasing, projects, and locations. Prioritized data accuracy over complex automation for the MVP.',
    'Fought for a dual-track UX: Quantity-first by default for smaller teams, but included a detailed power-user layer for asset-level tracking.',
    'Unblocked larger enterprise clients who required asset-level tracking before purchasing.',
    'Compromised with engineering to ship a manual "refresh/sync" button instead of websockets to get the feature out and capture revenue faster.'
  ];
  inv.constraints = ['Engineering timeline prevented real-time websockets', 'Conflicting needs of small vs enterprise users'];
  inv.summary_short = 'Replaced messy spreadsheets with a real-time inventory system that unblocked enterprise deals and drove +18% MRR.';
  inv.outcomes = [
    { metric: '**Recurring Revenue**', value: '**+18%**', note: 'Within the first year' },
    { metric: '**Product Adoption**', value: '**+8%**', note: 'Within the first year' }
  ];
  inv.impact_narrative = 'Helped drive an 8% increase in product adoption and an 18% increase in recurring revenue within the first year, largely by unblocking enterprise deals.';
}

fs.writeFileSync('assets/portfolio-kb.json', JSON.stringify(kb, null, 2));
console.log('Fixed KB');
