/* Keeps the web version's Supabase project awake. Free projects pause after a quiet week, and "a few user requests
   to the database each day" count as activity. This reads live content the way a signed-out visitor does, three
   times, using WEB from js/config.js. It exits with an error if the database doesn't answer, so a failed scheduled
   run (and GitHub's email about it) is also the first sign the web version is down.
   Usage: node dev/keep-awake.js   (run by .github/workflows/keep-awake.yml) */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const WEB = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8') + '\n;WEB', {});
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  for (let i = 1; i <= 3; i++){
    const res = await fetch(WEB.url + '/rest/v1/rpc/doc_list', { method: 'POST', headers: { apikey: WEB.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ c: 'content' }) });
    const body = await res.text();
    if (!res.ok) throw new Error('The web database answered ' + res.status + ': ' + body.slice(0, 300));
    console.log('Read ' + JSON.parse(body).length + ' live content documents (' + i + '/3)');
    if (i < 3) await sleep(5000);
  }
})().catch(e => { console.error(e.message || e); process.exit(1); });
