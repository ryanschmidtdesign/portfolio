// Local tester for Netlify function handler
(async function(){
  try {
    const fn = require('../netlify/functions/portfolio-chat.js');
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'What has Ryan built related to AI?' }], pageContext: { url: '/ai-coding-portfolio.html' } })
    };
    const res = await fn.handler(event);
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', res.body);
  } catch (e) {
    console.error('ERROR', e);
  }
})();
