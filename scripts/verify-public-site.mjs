import {createHash} from 'node:crypto';import {setTimeout} from 'node:timers/promises';
const expected=process.env.EXPECTED_SNAPSHOT_HASH;if(!/^[a-f0-9]{64}$/.test(expected||''))throw Error('게시 스냅샷 해시 없음');
let ok=false;
for(let i=0;i<15;i++){
 try{const url=new URL('latest.json',process.env.PAGES_BASE_URL);url.searchParams.set('verify',Date.now().toString());const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('HTTP '+response.status);const hash=createHash('sha256').update(new Uint8Array(await response.arrayBuffer())).digest('hex');if(hash===expected){ok=true;break;}}
 catch(e){console.log('공개 확인 재시도: '+e.message);}
 if(i<14)await setTimeout(6000);
}
if(!ok)throw Error('게시된 스냅샷이 예상 데이터와 일치하지 않습니다.');console.log('공개 스냅샷 해시 일치');
