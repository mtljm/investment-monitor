import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pagesMode} from '../scripts/pages-mode.mjs';
test('설정·새 테스트가 배포 검사를 실행하고 전체 테스트를 검사한다',async()=>{
 const yml=await readFile(new URL('../.github/workflows/daily-pages.yml',import.meta.url),'utf8');
 const paths=yml.split('    paths:')[1].split('\npermissions:')[0];
 assert.ok(paths.includes("'config/**'"));assert.ok(paths.includes("'tests/**'"));assert.ok(paths.includes("'scripts/fetch-market.mjs'"));
 assert.ok(yml.includes('node --test tests/*.test.mjs'));
 assert.equal(pagesMode('push',['tests/new-indicator.test.mjs']),'reuse');
 assert.equal(pagesMode('push',['config/monitor.json']),'collect');
 assert.equal(pagesMode('push',['scripts/fetch-market.mjs']),'collect');
});
