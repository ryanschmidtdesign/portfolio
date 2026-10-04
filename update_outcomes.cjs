const fs = require('fs');
let html = fs.readFileSync('pages/member-portal-overhaul.html', 'utf8');

const newOutcomes = `        <section id="outcomes" aria-label="Outcomes & Impact">
          <div class="section-divider">
            <h2>Outcomes & Impact</h2>
          </div>
          <p>
            The redesigned portal shipped to production in September 2026. By untangling the complex information architecture and aligning the navigation to our users' mental models, we successfully removed the friction that was causing early member churn.
          </p>
          <ul>
            <li><strong class="status-label--done">+500% AI Activation:</strong> By surfacing our AI discovery engine within the progressive disclosure flow, usage skyrocketed by 500% within the first month.</li>
            <li><strong class="status-label--done">Legacy Search Sunset:</strong> The new architecture successfully bridged the gap to the content so well that we were able to completely remove the traditional keyword search bar. We received virtually zero member complaints regarding its removal.</li>
            <li><strong class="status-label--done">Qualitative Feedback:</strong> Members directly interacting with the new browsing experience report that the architecture finally makes sense in how they think and speak in their day-to-day HR roles.</li>
          </ul>

          <h3>The "Aha!" Moment</h3>
          <p>
            For a premium research portal, the critical "Aha!" moment isn't just logging in—it's the exact moment a member successfully filters through thousands of documents to find a highly relevant benchmark or report perfectly curated for their specific sub-discipline, company size, and industry. 
          </p>
          <p>
            By solving the IA bottleneck, we dramatically shortened the time it takes a new member to reach that moment, actively driving long-term retention.
          </p>
        </section>`;

html = html.replace(/<section id="status"[\s\S]*?<\/section>/, newOutcomes);

fs.writeFileSync('pages/member-portal-overhaul.html', html);
console.log('Replaced second half');
