import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectInstruments} from '../scripts/monitor.mjs';
const config=JSON.parse(await readFile(new URL('../config/monitor.json',import.meta.url),'utf8'));
test('대형주 범위와 별개로 섹터 11개를 수집한다',()=>{
  for(const n of [20,50,100,200]){
    const rows=selectInstruments(config,n);
    assert.equal(rows.filter(r=>r.group==='섹터 ETF').length,11);
    assert.equal(rows.length,n+22);
    assert.equal(new Set(rows.map(r=>r.symbol)).size,rows.length);
  }
});
test('섹터 초과와 잘못된 그룹은 거부한다',()=>{
  const extra={group:'섹터 ETF',symbol:'TEST',name:'test',unit:'USD'};
  assert.throws(()=>selectInstruments({...config,instruments:[...config.instruments,extra]},20));
  assert.throws(()=>selectInstruments({...config,instruments:config.instruments.map((r,i)=>i? r:{...r,group:'unknown'})},20));
});
