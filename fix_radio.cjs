const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/src/ats/greenhouse.js';
let content = fs.readFileSync(file, 'utf8');

const radioLogic = `
  // 5. Radio Buttons
  const radioGroups = await container.$$('fieldset:has(input[type="radio"]), div.question:has(input[type="radio"]), div.field:has(input[type="radio"])');
  for (const group of radioGroups) {
    const labelText = await group.evaluate(el => {
      const legend = el.querySelector('legend, label, h3, h4');
      return legend ? legend.innerText.trim() : '';
    });
    
    if (!labelText) continue;
    
    // Check if any radio is already selected
    const isSelected = await group.evaluate(el => !!el.querySelector('input[type="radio"]:checked'));
    if (isSelected) continue;
    
    const radios = await group.$$('input[type="radio"]');
    
    if (/authorized to work|legal right to work/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /yes/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/sponsorship|visa/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /no/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/worked for|previously employed|contractor|worked.*before/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /no/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/veteran/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /no|not a veteran/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/disability/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /no|do not have/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/gender|sex/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /male|man/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/race|ethnicity/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /white|caucasian/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else {
      // Fallback for custom radio buttons (just pick the first option that isn't 'None' or 'No', or just pick the first option if it's required)
      const isRequired = await group.evaluate(el => el.innerText.includes('*') || !!el.querySelector('input[required], [aria-required="true"]'));
      if (isRequired && radios.length > 0) {
        let checked = false;
        for (const r of radios) {
          const text = await r.evaluate(el => el.parentElement.innerText);
          if (/yes|agree|accept/i.test(text)) {
            await r.check({ force: true }).catch(()=>{});
            checked = true;
            break;
          }
        }
        if (!checked) await radios[0].check({ force: true }).catch(()=>{});
      }
    }
  }
`;

// Insert before the console.log for Before Phone
content = content.replace(
  '  console.log(`[Greenhouse] Before Phone`);',
  radioLogic + '\n  console.log(`[Greenhouse] Before Phone`);'
);

fs.writeFileSync(file, content);
console.log("Replaced radio logic!");
