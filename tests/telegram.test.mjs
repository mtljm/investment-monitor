import test from 'node:test';
import assert from 'node:assert/strict';
import {TelegramClient,privateTarget} from '../scripts/telegram-client.mjs';
import {sendBrief} from '../scripts/send-telegram.mjs';
import {connectionTarget} from '../scripts/telegram-connect.mjs';
import {makeBrief} from '../scripts/prepare-telegram.mjs';
import {createZip} from '../scripts/create-zip.mjs';

test('개인 대화만 허용하고 여러 연결 후보는 거부한다',()=>{
  assert.equal(privateTarget('1234'),'1234');
  assert.throws(()=>privateTarget('-1234'));
  const update=id=>({message:{chat:{type:'private',id},from:{id},text:'/connect_investment_monitor'}});
  assert.equal(connectionTarget([update(1234)]).id,1234);
  assert.throws(()=>connectionTarget([update(1),update(2)]));
  assert.throws(()=>connectionTarget([{message:{chat:{type:'group',id:1},text:'/connect_investment_monitor'}}]));
});
test('오류 메시지에 토큰이나 서버 오류 본문을 노출하지 않는다',async()=>{
  const token='123456:FAKE_TEST_TOKEN';
  const client=new TelegramClient(token,async()=>{throw new Error('URL contains '+token);});
  await assert.rejects(client.call('getMe'),e=>!e.message.includes(token));
  const denied=new TelegramClient(token,async()=>({ok:false,status:403,json:async()=>({ok:false,error_code:403,description:token})}));
  await assert.rejects(denied.call('getMe'),e=>!e.message.includes(token)&&e.message.includes('403'));
});
test('수신자 검사 후 ZIP 하나를 전송하고 그룹 대화는 거부한다',async()=>{
  const calls=[];
  const client={call:async(method,fields,file)=>{
    calls.push({method,fields,file});
    return method==='getChat'?{id:1234,type:'private'}:{chat:{id:1234},document:{file_id:'test'}};
  }};
  await sendBrief(client,'1234',{file:'brief.zip',caption:'브리핑'},Buffer.from('PK'));
  assert.deepEqual(calls.map(c=>c.method),['getChat','sendDocument']);
  assert.equal(calls[1].fields.chat_id,'1234');
  await assert.rejects(sendBrief({call:async()=>({id:1234,type:'group'})},'1234',
    {file:'brief.zip',caption:'x'},Buffer.from('PK')));
});
test('브리핑은 기준일과 실패 항목 수를 포함한다',()=>{
  const text=makeBrief({collected_at_utc:'2026-11-16T23:00:00Z',collected_at_kst:'2026-11-17 08:00 KST',
    rows:[{group:'지수',symbol:'^GSPC',name:'S&P 500',close:100,unit:'pt',change_1d_pct:1,status:'ok',bar_time_utc:'2026-11-16T14:30:00Z'},
    {group:'대형주',symbol:'TEST',status:'error'}]});
  assert.match(text,/2026-11-16/);assert.match(text,/실패 1개/);assert.match(text,/\+1.00%/);
});
test('ZIP 생성은 중복 파일명과 경로를 거부한다',()=>{
  const zip=createZip([{name:'briefing.txt',bytes:Buffer.from('한글 브리핑')}]);
  assert.equal(zip.readUInt32LE(0),0x04034b50);
  assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);
  assert.throws(()=>createZip([{name:'../secret',bytes:Buffer.alloc(0)}]));
  assert.throws(()=>createZip([{name:'same',bytes:Buffer.alloc(0)},{name:'same',bytes:Buffer.alloc(0)}]));
});
