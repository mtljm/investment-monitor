import {setTimeout as sleepDefault} from 'node:timers/promises';

// Three bounded attempts keep a 43-item run within the six-minute collection job.
export async function fetchMarketJson(url,{fetcher=fetch,sleep=sleepDefault,onRetry=()=>{}}={}){
 for(let attempt=1;attempt<=3;attempt++){
  let retryable=false,delay=attempt*1000;
  try{
   const response=await fetcher(url,{headers:{'User-Agent':'investment-monitor/0.1'},signal:AbortSignal.timeout(8000)});
   if(!response.ok){
    retryable=[408,425,429].includes(response.status)||response.status>=500&&response.status<=599;
    const after=response.headers?.get('retry-after');
    if(after){
     const ms=/^\d+(\.\d+)?$/.test(after)?Number(after)*1000:Date.parse(after)-Date.now();
     // Do not retry earlier than the server asks or extend the job indefinitely.
     if(Number.isFinite(ms)&&ms>2000)retryable=false;
     else if(Number.isFinite(ms))delay=Math.max(delay,ms);
    }
    throw new Error('HTTP '+response.status);
   }
   return await response.json();
  }catch(error){
   const network=error instanceof TypeError||['TimeoutError','AbortError'].includes(error?.name);
   if(attempt===3||!retryable&&!network)throw error;
   onRetry({attempt,nextAttempt:attempt+1,delay});
   await sleep(delay);
  }
 }
}
