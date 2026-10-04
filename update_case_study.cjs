const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages/member-portal-overhaul.html');
let content = fs.readFileSync(filePath, 'utf8');

const oldSection = `          <ul>
            <li>
              <strong>Parallel rebrand:</strong> A third-party consultant was evolving i4cp's visual identity at the same time. Instead of rebuilding tokens from scratch, I mapped the new direction to the existing token structure so the MVP could keep moving.
            </li>
            <li>
              <strong>MVP scope:</strong> A full IA overhaul touches nearly every portal surface, so I phased the work deliberately. The MVP ships restructured navigation and a refreshed visual system, with deeper workflow improvements already designed and ticketed for post-MVP.
            </li>
          </ul>`;

const newSection = `          <div class="constraints-grid" data-cascade>
            <div class="constraint-card x-ray-card">
              <div class="constraint-content">
                <span class="constraint-label">Constraint</span>
                <h3 class="constraint-title">Parallel Rebrand</h3>
                <p class="constraint-body">A third-party consultant was evolving i4cp's visual identity simultaneously, creating a moving target for the core design system.</p>
              </div>
              
              <div class="constraint-solution x-ray-reveal">
                <span class="constraint-label solution-label">Solution</span>
                <h3 class="constraint-title">Token Mapping</h3>
                <p class="constraint-body">I abstracted our UI into strict design tokens, allowing the consultant's new identity to map globally without rebuilding components.</p>
              </div>
            </div>

            <div class="constraint-card x-ray-card">
              <div class="constraint-content">
                <span class="constraint-label">Constraint</span>
                <h3 class="constraint-title">Massive MVP Scope</h3>
                <p class="constraint-body">A full IA overhaul touches nearly every portal surface, creating deployment risk and threatening the project timeline.</p>
              </div>
              
              <div class="constraint-solution x-ray-reveal">
                <span class="constraint-label solution-label">Solution</span>
                <h3 class="constraint-title">Phased Rollout</h3>
                <p class="constraint-body">Shipped restructured navigation and a refreshed visual system in Phase 1, ticketing deeper workflow and AI enhancements for post-MVP.</p>
              </div>
            </div>
          </div>`;

content = content.replace(oldSection, newSection);
fs.writeFileSync(filePath, content);
console.log('Done replacing constraints section');
