import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {readDashboardTemplate} from '../scripts/dashboard-template.mjs';
import {publicHtml} from '../scripts/prepare-pages.mjs';
test('분리 소스를 독립 실행 가능한 HTML로 조립한다',async()=>{
 const shell=await readFile(new URL('../templates/dashboard.html',import.meta.url),'utf8');
 assert.ok(!shell.includes('function render('));assert.ok(!shell.includes('.analysis-table{'));
 const html=publicHtml(await readDashboardTemplate(),{rows:[]});
 assert.ok(!html.includes('__DASHBOARD_'));assert.ok(!html.includes('src="dashboard.js"'));
 assert.ok(html.includes('function renderTemperature('));assert.ok(html.includes('function sectorRects('));
 new vm.Script(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
});
