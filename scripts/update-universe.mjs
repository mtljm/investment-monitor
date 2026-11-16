import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const UNIVERSE_SOURCE='https://stockanalysis.com/list/largest-us-companies/?count=500';
export function parseUniverse(html,limit=200) {
  const items=[],seenNames=new Set(),seenSymbols=new Set();
  for(const segment of html.split(/(?=\{no:\d+,s:)/).filter(s=>s.startsWith('{no:'))) {
    const field=key=>{
      const match=segment.match(new RegExp('(?:^|[,\\{])'+key+':("(?:\\\\.|[^"\\\\])*")'));
      return match?JSON.parse(match[1]):null;
    };
    const name=field('n'),sourceSymbol=field('s'),country=field('country');
    const cap=Number(segment.match(/marketCapUSD:([\d.]+)/)?.[1]);
    if(country!=='United States'||field('subtype')!=='stock'||
      !/isPrimaryListing:true/.test(segment)||!name||!sourceSymbol||!Number.isFinite(cap)||cap<=0)continue;
    if(!/^[A-Z][A-Z0-9.-]{0,14}$/.test(sourceSymbol))continue; // OTC 등 경로형 티커 제외
    const symbol=sourceSymbol.replaceAll('.','-');
    const company=name.toLowerCase().replace(/\s+/g,' ').trim();
    if(seenNames.has(company)||seenSymbols.has(symbol))continue;
    seenNames.add(company);seenSymbols.add(symbol);
    items.push({group:'대형주',symbol,name,unit:'USD',market_cap_usd:cap,
      country,provider_rank:Number(segment.match(/^\{no:(\d+)/)?.[1])});
  }
  items.sort((a,b)=>b.market_cap_usd-a.market_cap_usd);
  if(items.length<limit)throw new Error('미국 기업 순위가 '+limit+'개 미만입니다. 기존 목록을 유지합니다: '+items.length);
  return items.slice(0,limit).map((item,i)=>({...item,snapshot_rank:i+1}));
}
export async function updateUniverse() {
  const response=await fetch(UNIVERSE_SOURCE,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('순위 조회 HTTP '+response.status);
  const stocks=parseUniverse(await response.text());
  const path=resolve(root,'config/monitor.json');
  const config=JSON.parse(await readFile(path,'utf8'));
  config.universe_date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',dateStyle:'short'}).format(new Date());
  config.universe_source=UNIVERSE_SOURCE;
  config.universe_note='출처 목록 중 country=United States, stock, primary listing인 회사만 시가총액순으로 정렬. OTC 등 경로형 티커 제외, 동일 회사 대표 티커 1개. 확인일 기준 상위 200개 스냅샷.';
  config.stock_limit=200;
  config.instruments=[...config.instruments.filter(r=>r.group!=='대형주'),...stocks];
  await writeFile(path,JSON.stringify(config,null,2)+'\n');
  console.log(JSON.stringify({count:stocks.length,date:config.universe_date,first:stocks[0].symbol,last:stocks.at(-1).symbol}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  updateUniverse().catch(e=>{console.error(e.message);process.exitCode=1;});
