import {technicalIndicators} from './technical-indicators.mjs';
import { writeDashboard } from './render-dashboard.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function summarize(bars) {
  const valid = bars.filter(b => Number.isFinite(b.close)).sort((a,b) => a.time-b.time);
  if (valid.length < 2) throw new Error('유효한 일봉 2개 미만');
  const last = valid.at(-1), previous = valid.at(-2);
  const change = n => valid.length > n && valid.at(-1-n).close !== 0
    ? (last.close / valid.at(-1-n).close - 1) * 100 : null;
  const sma = n => valid.length >= n
    ? valid.slice(-n).reduce((s,b) => s+b.close,0)/n : null;
  const priorVolumes = valid.slice(-21,-1).map(b=>b.volume).filter(v=>Number.isFinite(v)&&v>0);
  const avgVolume = priorVolumes.length === 20 ? priorVolumes.reduce((a,b)=>a+b,0)/20 : null;
  return {
    ...technicalIndicators(valid.map(b=>b.close)),
    bar_time_utc: new Date(last.time*1000).toISOString(),
    close:last.close, previous_close:previous.close,
    change:last.close-previous.close, change_1d_pct:change(1),
    change_5d_pct:change(5), change_20d_pct:change(20),
    sma20:sma(20), sma50:sma(50), sma200:sma(200),
    volume_ratio:avgVolume && Number.isFinite(last.volume) ? last.volume/avgVolume : null
  };
}
async function collect(item) {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(item.symbol) + '?range=2y&interval=1d';
  const response = await fetch(url, {
    headers:{'User-Agent':'investment-monitor/0.1'},
    signal:AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error('HTTP '+response.status);
  const body = await response.json();
  const chart = body.chart?.result?.[0];
  if (!chart || body.chart?.error) throw new Error('시세 응답 없음');
  const quote = chart.indicators?.quote?.[0];
  if (!quote) throw new Error('일봉 없음');
  const bars = (chart.timestamp || []).map((time,i)=>({
    time,close:quote.close?.[i],volume:quote.volume?.[i]
  }));
  const stats = summarize(bars);
  return {...item,status:'ok',...stats,
    history:bars.filter(b=>Number.isFinite(b.close)).slice(-90).map(b=>({time:b.time,close:Number(b.close.toFixed(4))})),
    currency:chart.meta?.currency,
    exchange_timezone:chart.meta?.exchangeTimezoneName,
    quote_time_utc: chart.meta?.regularMarketTime
      ? new Date(chart.meta.regularMarketTime*1000).toISOString() : null,
    stale_calendar_days: Math.floor((Date.now()/1000-bars.filter(b=>Number.isFinite(b.close)).at(-1).time)/86400),
    source:url};
}
function fmt(value) { return Number.isFinite(value) ? value.toFixed(2) : '미확인'; }
function render(result) {
  const lines = ['# 시장 모니터링',
    '', '수집 시각: '+result.collected_at_kst,
    '대형주 목록 기준일: '+result.universe_date,
    '', '일봉 최신 값이며 장중에는 미완성 봉일 수 있습니다. 실시간 매매 신호가 아닙니다.',
    '가격은 API의 Close 값을 사용하며 Adj Close를 별도로 적용하지 않습니다. 배당을 포함한 총수익률과 다릅니다.',
    '금리는 % 단위이며 일간 변화는 bp, VIX는 pt, 환율은 KRW/USD로 표시합니다.',
    '5일·20일은 거래 관측치 기준 변화율입니다. 거래량 배수는 직전 20개 관측치 평균 대비입니다.',
    '거래일별 차이와 휴일을 감안해 각 행의 봉 시각·시세 시각을 확인하세요.',
    '', '| 구분 | 티커 | 이름 | 값 | 단위 | 일간 변화 | 5일 % | 20일 % | MA20 | MA50 | MA200 | 거래량 배수 | 봉 시각 UTC | 시세 시각 UTC | 상태 |',
    '|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|'];
  for (const r of result.rows) {
    const daily = r.symbol==='^TNX' ? fmt(r.change*100)+' bp'
      : r.symbol==='^VIX' ? fmt(r.change)+' pt' : fmt(r.change_1d_pct)+'%';
    const state = r.status==='ok' ? (r.stale_calendar_days>4?'오래된 데이터 확인':'수집됨') : '수집 실패';
    lines.push('| '+[r.group,r.symbol,r.name,fmt(r.close),r.unit,
      r.status==='ok'?daily:'미확인',
      ...[r.change_5d_pct,r.change_20d_pct,r.sma20,r.sma50,r.sma200,
        ['대형주','지수 ETF','섹터 ETF'].includes(r.group)?r.volume_ratio:null].map(fmt),
      r.bar_time_utc||'미확인',r.quote_time_utc||'미확인',state].join(' | ')+' |');
  }
  lines.push('', '## 수집 실패');
  const failures = result.rows.filter(r=>r.status!=='ok');
  lines.push(...(failures.length?failures.map(r=>'- '+r.symbol+': '+r.error):['없음']));
  lines.push('', '## 확인할 사항', '- 지수의 이동평균 대비 위치와 최근 변화',
    '- 대형주 상승·하락의 확산 여부', '- 금리·VIX·환율의 변화',
    '', '대형주 선정 출처: '+result.universe_source,
    '가격 출처: Yahoo Finance chart API (비공식 엔드포인트, 지연·차단·변경 가능)');
  return lines.join('\n')+'\n';
}
export function selectInstruments(config,requested) {
  const limit=Number(requested??config.stock_limit??200);
  if(![20,50,100,200].includes(limit))throw new Error('종목 범위는 20, 50, 100, 200 중 선택하세요.');
  if(!Array.isArray(config.instruments)||config.instruments.length>222)throw new Error('수집 대상은 대형주 200개와 지수·지표·ETF 22개 이하여야 합니다.');
  const symbols=new Set();
  for(const item of config.instruments) {
    if(!item||typeof item.symbol!=='string'||!item.symbol||symbols.has(item.symbol))throw new Error('잘못되거나 중복된 티커');
    symbols.add(item.symbol);
    if(!['대형주','지수 ETF','섹터 ETF','지수','시장지표'].includes(item.group))throw new Error('지원하지 않는 그룹');
  }
  for(const [group,max] of [['지수',4],['시장지표',3],['지수 ETF',4],['섹터 ETF',11]]){
    if(config.instruments.filter(r=>r.group===group).length>max)throw new Error(group+' 최대 '+max+'개를 초과했습니다.');
  }
  const stocks=config.instruments.filter(r=>r.group==='대형주');
  const ranks=stocks.map(r=>r.snapshot_rank);
  if(stocks.length>200||ranks.some(r=>!Number.isInteger(r)||r<1||r>200)||new Set(ranks).size!==ranks.length)throw new Error('대형주 순위가 잘못되었습니다.');
  if(stocks.length<limit||Array.from({length:limit},(_,i)=>i+1).some(r=>!ranks.includes(r)))throw new Error('선택 범위의 순위 목록이 부족합니다. update-universe.mjs를 실행하세요.');
  return config.instruments.filter(r=>r.group!=='대형주'||r.snapshot_rank<=limit);
}
export async function collectInstruments(items,workerCount=4) {
  const results=new Array(items.length);
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(workerCount,items.length)},async()=>{
    while(cursor<items.length){
      const i=cursor++,item=items[i];
      try{results[i]=await collect(item);}
      catch(e){results[i]={...item,status:'error',error:e.message};}
    }
  }));
  return results;
}

export async function main() {
  const config = JSON.parse(await readFile(resolve(root,'config/monitor.json'),'utf8'));
  const flag=process.argv.indexOf('--limit');
  const requested=flag>=0?process.argv[flag+1]:undefined;
  if(flag>=0&&!requested)throw new Error('--limit 값이 필요합니다.');
  const items=selectInstruments(config,requested);
  const rows=await collectInstruments(items);
  const now = new Date();
  const result = {collected_at_utc:now.toISOString(),
    collected_at_kst:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'medium'}).format(now)+' KST',
    universe_date:config.universe_date,universe_source:config.universe_source,sector_source:config.sector_source,rows};
  const out = resolve(root,'reports');
  await mkdir(out,{recursive:true});
  const stamp = now.toISOString().replace(/[:.]/g,'-');
  const markdown = render(result);
  await writeFile(resolve(out,stamp+'.json'),JSON.stringify(result,null,2)+'\n');
  await writeFile(resolve(out,stamp+'.md'),markdown);
  await writeFile(resolve(out,'latest.md'),markdown);
  await writeFile(resolve(out,'latest.json'),JSON.stringify(result,null,2)+'\n');
  await writeDashboard(result);
  console.log(markdown);
  if (rows.some(r=>r.status!=='ok')) process.exitCode=1;
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(e=>{ console.error(e.message); process.exitCode=1; });
}
