(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const injectTarget = document.querySelector('#prototyping ul');
    if (!injectTarget) return;

    // Build HTML
    const wrapper = document.createElement('figure');
    wrapper.className = 'case-study-media interactive-prototype-wrapper';
    wrapper.innerHTML = `
      <div class="interactive-header">
        <h4>Live KPI Component</h4>
        <div class="interactive-controls">
          <button class="time-toggle active" data-days="7">7 Days</button>
          <button class="time-toggle" data-days="30">30 Days</button>
        </div>
      </div>
      <div class="interactive-chart-container" id="proto-chart">
        <div class="chart-y-axis">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <div class="chart-bars" id="chart-bars-container"></div>
        <div id="chart-tooltip" class="chart-tooltip">
          <span class="tooltip-date">Oct 12</span>
          <span class="tooltip-val">84</span>
        </div>
      </div>
      <figcaption style="margin-top:0; padding:1rem; border-top:1px solid var(--gray-300); background:var(--gray-100);">Hover to interact. Custom component built in vanilla JS/CSS to demonstrate execution ability.</figcaption>
    `;

    injectTarget.parentNode.insertBefore(wrapper, injectTarget);

    // Logic
    const container = document.getElementById('chart-bars-container');
    const tooltip = document.getElementById('chart-tooltip');
    const dateLabel = tooltip.querySelector('.tooltip-date');
    const valLabel = tooltip.querySelector('.tooltip-val');
    const chartArea = document.getElementById('proto-chart');
    const toggles = document.querySelectorAll('.time-toggle');

    function generateData(days) {
      const data = [];
      for (let i = 0; i < days; i++) {
        // Generate random-looking but stable data
        const val = Math.floor(Math.sin(i) * 30 + 50 + (Math.random() * 20));
        data.push({ val: Math.min(100, Math.max(0, val)), label: 'Day ' + (i+1) });
      }
      return data;
    }

    let activeData = generateData(7);

    function renderBars() {
      container.innerHTML = '';
      activeData.forEach((d, i) => {
        const group = document.createElement('div');
        group.className = 'chart-bar-group';
        
        const bg = document.createElement('div');
        bg.className = 'chart-bar-bg';
        
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = '0%'; // animate in

        group.appendChild(bg);
        group.appendChild(bar);
        container.appendChild(group);

        // Hover events
        bg.addEventListener('mouseenter', (e) => {
          const rect = bar.getBoundingClientRect();
          const chartRect = chartArea.getBoundingClientRect();
          
          tooltip.style.left = \`\${rect.left - chartRect.left + (rect.width/2)}px\`;
          tooltip.style.top = \`\${rect.top - chartRect.top}px\`;
          
          dateLabel.textContent = d.label;
          valLabel.textContent = d.val;
          tooltip.classList.add('visible');
        });

        bg.addEventListener('mouseleave', () => {
          tooltip.classList.remove('visible');
        });

        // Trigger animation
        setTimeout(() => {
          bar.style.height = \`\${d.val}%\`;
        }, 50 * i);
      });
    }

    toggles.forEach(btn => {
      btn.addEventListener('click', (e) => {
        toggles.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const days = parseInt(e.target.getAttribute('data-days'), 10);
        activeData = generateData(days);
        renderBars();
        tooltip.classList.remove('visible');
      });
    });

    // Initial render via intersection observer (so it animates when scrolled to)
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        renderBars();
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    
    observer.observe(wrapper);
  });
})();
