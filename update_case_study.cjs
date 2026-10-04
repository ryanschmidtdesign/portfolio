const fs = require('fs');
let html = fs.readFileSync('pages/member-portal-overhaul.html', 'utf8');

const newTLDR = `        <header class="tldr" aria-label="Executive summary">
          <h1 id="title" data-parallax="0.06">Member Portal Growth Overhaul</h1>
          <p class="lead">
            For a research membership business, complex information architecture is a primary bottleneck to growth. Our legacy taxonomy was so dense that members assumed we lacked content tailored to their specific industry or role, leading to severe engagement drop-offs and churn risks.
            <br><br>I overhauled the portal's IA and core experience to accelerate Time-to-Value (TTV). By replacing traditional search with an AI-first discovery engine and progressive disclosure, we guided members directly to their "Aha!" moment—finding insights perfectly curated for their daily HR mental models.
          </p>

          <div class="tldr-meta">
            <div class="tldr-role">
              <p class="tldr-label label" data-reveal>My role</p>
              <p>
                <strong>Lead UX Designer/PM (sole designer)</strong> <br>
                Owning IA, growth strategy, and project management while partnering with product, engineering, and a third-party rebrand consultant.
              </p>
            </div>

            <div class="tldr-kpis">
              <p class="tldr-label label">Impact</p>
              <ul class="kpis kpis--hero">
                <li>
                  <strong class="metric status-label--done">+500%</strong>
                  <span class="metric-label">increase in AI feature adoption</span>
                </li>
                <li>
                  <strong class="metric status-label--done">Shipped</strong>
                  <span class="metric-label">live in production Sept 2026</span>
                </li>
              </ul>
            </div>
          </div>
        </header>

        <section class="case-study-summary" aria-label="Case study summary">
          <h2 class="case-study-summary__label">At a glance</h2>
          <ul class="case-study-summary__list">
            <li><strong>Business Problem:</strong> Engagement was suffering because the portal exposed too much complexity upfront. Many members weren't using the site at all, falsely assuming we lacked content curated for their specific role, industry, or company size.</li>
            <li><strong>My Hypothesis:</strong> If we aligned the navigation directly to how HR leaders speak and think in their day-to-day, and pushed our AI assistant (Ahri) to the forefront of the discovery flow, we could drastically reduce their time-to-value.</li>
            <li><strong>Outcomes:</strong> Shipped in September 2026. AI discovery usage skyrocketed by 500%, allowing us to completely sunset the legacy traditional search with zero member complaints.</li>
          </ul>
        </section>

        <section id="problem" aria-label="Problem & goals">
          <div class="section-divider">
            <h2 data-reveal>Problem</h2>
          </div>
          <p>
            Members came to i4cp for reports, benchmarks, and peer insights, but the portal's information architecture made that value incredibly hard to reach. The friction was so high that many members simply stopped logging in—assuming we didn't have content curated for their specific roles or company sizes.
          </p>
          <p>
            Analytics backed this up: our AI discovery feature (Ahri) was seeing abysmal adoption, with the vast majority of users relying on a traditional keyword search bar as a crutch to bypass the broken navigation. My challenge was translating a massive repository into an intuitive growth funnel that accelerated a member's journey to finding their first relevant insight.
          </p>

          <h3>Goals</h3>
          <ul>
            <li><strong>Accelerate Time-to-Value (TTV):</strong> Align the portal's structure to match how members actually think and speak in their day-to-day HR roles.</li>
            <li><strong>Drive feature activation:</strong> Shift user behavior away from traditional search and into our high-value AI discovery tool.</li>
            <li><strong>Ship a meaningful MVP:</strong> Improve navigation, hierarchy, and visual clarity immediately without waiting for every portal surface to be redesigned.</li>
          </ul>`;

// We use regex to replace from <header class="tldr" to </ul>\n          </section> (right before the before/after slider)
// Actually, it's safer to just replace everything between <header class="tldr" and <!-- Design Highlights:
html = html.replace(/<header class="tldr"[\s\S]*?<!-- Design Highlights:/, newTLDR + '\n\n          <!-- Design Highlights:');

fs.writeFileSync('pages/member-portal-overhaul.html', html);
console.log('Replaced first half');
