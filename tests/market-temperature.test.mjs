import {readFile} from 'node:fs/promises';
import {readDashboardTemplate} from '../scripts/dashboard-template.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const template=await readDashboardTemplate();
const source=template.split('// TEMPERATURE_MODEL_START')[1].split('// TEMPERATURE_MODEL_END')[0];
const calculate=vm.runInNewContext(source+';calculateTemperature');
function rows({vix=12,close=120,ma=100,btc=110,down=0}={}){
 return [{symbol:'^VIX',status:'ok',close:vix},...['^GSPC','^NDX'].map(symbol=>({symbol,status:'ok',close,sma20:ma,sma50:ma,sma200:ma})),{symbol:'BTC-USD',status:'ok',close:btc,sma20:100},...Array.from({length:20},(_,i)=>({symbol:'S'+i,group:'대형주',snapshot_rank:i+1,status:'ok',change_1d_pct:i<down?-1:1}))];
}
test('위험이 낮은/높은 입력의 양 끝값과 가중치',()=>{
 const calm=calculate(rows());assert.equal(calm.score,0);assert.equal(calm.label,'안정');
 const fear=calculate(rows({vix:40,close:80,btc:85,down:20}));assert.equal(fear.score,100);assert.equal(fear.label,'공포');
 assert.equal(fear.components.reduce((s,c)=>s+c.weight,0),100);
});
test('중간 입력을 독립 계산값과 대조한다',()=>{
 const r=rows({vix:22.91,close:80,btc:87.94,down:16});r.find(r=>r.symbol==='^GSPC').sma200=70;
 // 51.64*.45 + 80*.25 + 80*.20 + 88.24*.10 = 68.062
 assert.equal(calculate(r).score,68);assert.equal(calculate(r).label,'불안');
});
test('누락/오류/제로 평균을 안정 점수로 처리하지 않는다',()=>{
 assert.equal(calculate(rows().filter(r=>r.symbol!=='BTC-USD')).score,null);
 const r=rows();r[0].close=null;assert.equal(calculate(r).score,null);
 const z=rows();z.find(r=>r.symbol==='^NDX').sma200=0;assert.equal(calculate(z).score,null);
 const e=rows();e[0].status='error';assert.equal(calculate(e).score,null);
});
test('대형주 표본은 최소 15개, 20위 밖은 포함하지 않는다',()=>{
 assert.equal(calculate(rows().slice(0,-6)).score,null);
 assert.notEqual(calculate(rows().slice(0,-5)).score,null);
 const r=rows();r.push({symbol:'OUT',group:'대형주',snapshot_rank:21,status:'ok',change_1d_pct:-50});assert.equal(calculate(r).sample,20);
});
test('금리·환율의 방향은 점수에 직접 반영하지 않는다',()=>{
 const r=rows();r.push({symbol:'^TNX',status:'ok',close:8},{symbol:'KRW=X',status:'ok',close:1800});assert.equal(calculate(r).score,0);
});

test('수집 지연 시 정상 계산값이 있어도 온도 숫자를 표시하지 않는다',async()=>{
 const el={innerHTML:'',dataset:{},querySelector:()=>null};
 const renderSource=(await readFile(new URL('../templates/market-temperature.js',import.meta.url),'utf8')).split('function renderTemperature(){')[1];
 const context={calculateTemperature:calculate,data:{rows:rows(),collected_at_utc:'2026-11-17T08:00:00Z'},collectionHealth:()=>({late:true,invalid:false,expectedDay:'2026-11-16'}),priceHealth:()=> 'current',$:()=>el,esc:String,num:v=>String(v??'—'),localTime:String};
 vm.runInNewContext('function renderTemperature(){'+renderSource+';renderTemperature();',context);
 assert.match(el.innerHTML,/갱신 확인 필요/);assert.ok(!el.innerHTML.includes('aria-valuenow='));
});

