import {collectInstruments} from './monitor.mjs';
import {assessTechnical} from './market-analysis.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export function validateAsia(config){
 if(!Array.isArray(config?.instruments)||!config.instruments.length||config.instruments.length>12)throw Error('아시아 지수 설정 오류');
 const seen=new Set();
 for(const r of config.instruments){if(r.group!=='지수'||r.market_region!=='ASIA'||typeof r.market!=='string'||!r.market||typeof r.symbol!=='string'||seen.has(r.symbol))throw Error('아시아 지수 중복/구분 오류');seen.add(r.symbol);}
 return config.instruments;
}
export async function collectAsia(config,collector=collectInstruments){
 const items=validateAsia(config),rows=await collector(items,3);
 for(const row of rows)row.analysis=assessTechnical(row);
 const now=new Date();
 return {collected_at_utc:now.toISOString(),collected_at_kst:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'medium'}).format(now)+' KST',rows};
}
export async function readAsiaReport(fallback){try{return JSON.parse(await readFile(resolve(root,'reports/asia-latest.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
export async function main(){
 const config=JSON.parse(await readFile(resolve(root,'config/asia.json'),'utf8'));
 const data=await collectAsia(config);await mkdir(resolve(root,'reports'),{recursive:true});
 await writeFile(resolve(root,'reports/asia-latest.json'),JSON.stringify(data,null,2)+'\n');
 console.log('아시아 지수 수집 '+data.rows.filter(r=>r.status==='ok').length+'/'+data.rows.length+' · '+data.collected_at_kst);
 for(const r of data.rows)console.log(r.symbol+' '+r.name+' '+r.status+(r.status==='ok'?' '+r.close:' '+r.error));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
