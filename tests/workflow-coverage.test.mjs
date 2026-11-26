import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {tmpdir} from 'node:os';import {join} from 'node:path';import {publishMarket,scheduledMarket} from '../scripts/pages-mode.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Three schedules and manual choices route only to the requested market',()=>{
 for(const [cron,market] of [['37 22 * * *','us'],['30 8 * * 1-5','asia'],['0 23 * * 5','gurus']]){assert.equal(scheduledMarket(cron),market);assert.equal(publishMarket('schedule',[],'all',cron),market);}
 for(const market of ['us','asia','gurus','all','reuse'])assert.equal(publishMarket('workflow_dispatch',[],market),market);
 assert.equal(publishMarket('workflow_dispatch'),'reuse');assert.equal(publishMarket('push',['templates/dashboard.css']),'reuse');assert.equal(publishMarket('push',['config/asia.json']),'asia');assert.equal(publishMarket('push',['config/gurus.json']),'gurus');assert.equal(publishMarket('push',['config/monitor.json','config/asia.json']),'all');
 for(const cron of ['', '5 * * * *','0 0 * * *'])assert.throws(()=>publishMarket('schedule',[],'us',cron));assert.throws(()=>publishMarket('workflow_dispatch',[],'invalid'));assert.throws(()=>publishMarket('pull_request'));
});
test('Actual schedule CLI writes the intended market instead of defaulting every cron to US',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'market-routing-'));try{for(const [cron,market] of [['37 22 * * *','us'],['30 8 * * 1-5','asia'],['0 23 * * 5','gurus']]){const output=join(dir,market);execFileSync(process.execPath,['scripts/pages-mode.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,GITHUB_EVENT_NAME:'schedule',EVENT_CRON:cron,PUBLISH_MARKET:'all',GITHUB_OUTPUT:output},stdio:'pipe'});assert.match(await readFile(output,'utf8'),new RegExp('market='+market+'\\n'));}}finally{await rm(dir,{recursive:true,force:true});}
});
test('Only four workflows remain; all publishing routes use the same publisher and lock',async()=>{
 const files=(await readdir(new URL('../.github/workflows/',import.meta.url))).filter(p=>p.endsWith('.yml')).sort();assert.deepEqual(files,['daily-pages.yml','daily-telegram.yml','market-monitor.yml','publish-market.yml']);
 const ui=await read('.github/workflows/daily-pages.yml'),publisher=await read('.github/workflows/publish-market.yml');const times=JSON.parse(await read('config/batch-schedules.json'));
 for(const key of ['us','asia','gurus'])assert.ok(ui.includes("cron: '"+times[key].cron+"'"));assert.equal((ui.match(/cron:/g)||[]).length,3);assert.ok(ui.includes('EVENT_CRON: ${{ github.event.schedule }}'));assert.ok(ui.includes('uses: ./.github/workflows/publish-market.yml'));assert.ok(!ui.includes('group: market-pages'));
 for(const text of ['group: market-pages','cancel-in-progress: false','node --test tests/*.test.mjs','node scripts/verify-public-site.mjs'])assert.ok(publisher.includes(text));for(const scope of ['scripts','config','tests'])assert.ok(ui.includes("'"+scope+"/**'"));
 assert.equal(times.us.time,'07:37');assert.equal(times.asia.time,'17:30');assert.equal(times.gurus.time,'08:00');
});
test('Telegram runs validation by default; connect and send require explicit selections',async()=>{
 const yaml=await read('.github/workflows/daily-telegram.yml');assert.ok(yaml.includes('options: [validate, connect, send]'));assert.ok(yaml.includes('default: validate'));assert.ok(!yaml.includes('  schedule:'));assert.ok(!yaml.includes('  push:'));assert.ok(!yaml.includes('TELEGRAM_DELIVERY_ENABLED'));
 for(const [job,operation] of [['brief','send'],['connect','connect'],['validate','validate']])assert.match(yaml,new RegExp('  '+job+':\\r?\\n    if: inputs.operation == \\x27'+operation+'\\x27'));
 const validation=yaml.slice(yaml.indexOf('  validate:'));assert.ok(!validation.includes('secrets.'));assert.ok(!validation.includes('send-telegram.mjs'));assert.ok(!validation.includes('telegram-connect.mjs'));assert.ok(validation.includes('tests/telegram.test.mjs'));
});