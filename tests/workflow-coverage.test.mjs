import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {pagesMode} from '../scripts/pages-mode.mjs';
test('All routes share one publisher and one lock, while schedules stay separate',async()=>{
 const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
 const [ui,us,asia,publisher]=await Promise.all(['.github/workflows/daily-pages.yml','.github/workflows/daily-us.yml','.github/workflows/daily-asia.yml','.github/workflows/publish-market.yml'].map(read));
 for(const caller of [ui,us,asia]){assert.ok(caller.includes('uses: ./.github/workflows/publish-market.yml'));assert.ok(!caller.includes('group: market-pages'));}
 assert.ok(publisher.includes('group: market-pages'));assert.ok(publisher.includes('cancel-in-progress: false'));assert.ok(publisher.includes('node --test tests/*.test.mjs'));assert.ok(publisher.includes('node scripts/verify-public-site.mjs'));assert.ok(!ui.includes('  schedule:'));
 const times=JSON.parse(await read('config/batch-schedules.json'));assert.ok(us.includes("cron: '"+times.us.cron+"'"));assert.ok(asia.includes("cron: '"+times.asia.cron+"'"));assert.equal(times.us.time,'07:15');assert.equal(times.asia.time,'17:30');
 assert.ok(ui.includes("'config/**'"));assert.ok(ui.includes("'tests/**'"));assert.ok(ui.includes("'scripts/**'"));assert.equal(pagesMode('push',['config/monitor.json']),'collect');
});
