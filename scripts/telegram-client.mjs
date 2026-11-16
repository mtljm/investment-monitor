export class TelegramError extends Error {}
export class TelegramClient {
  constructor(token,request=fetch) {
    if(typeof token!=='string'||!/^\d+:[A-Za-z0-9_-]+$/.test(token))
      throw new TelegramError('TELEGRAM_BOT_TOKEN 설정을 확인하세요.');
    this.token=token;this.request=request;
  }
  async call(method,fields={},file) {
    if(!['getMe','getWebhookInfo','getUpdates','getChat','sendDocument'].includes(method))
      throw new TelegramError('지원하지 않는 Telegram 메서드');
    let body,headers;
    if(file){
      body=new FormData();
      for(const [key,value] of Object.entries(fields))body.set(key,String(value));
      body.set('document',new Blob([file.bytes],{type:'application/zip'}),file.name);
    }else{body=JSON.stringify(fields);headers={'Content-Type':'application/json'};}
    let response,payload;
    try{
      response=await this.request('https://api.telegram.org/bot'+this.token+'/'+method,
        {method:'POST',body,headers,signal:AbortSignal.timeout(45000)});
      payload=await response.json();
    }catch{throw new TelegramError('Telegram 네트워크 응답을 확인할 수 없습니다. 중복 전송을 피하려고 자동 재시도하지 않습니다.');}
    if(!response.ok||!payload.ok)
      throw new TelegramError('Telegram '+method+' 실패: HTTP '+response.status+
        (Number.isInteger(payload.error_code)?', API '+payload.error_code:''));
    return payload.result;
  }
}
export function privateTarget(value){
  const id=String(value??'').trim();
  if(!/^[1-9]\d*$/.test(id))throw new TelegramError('개인 대화의 TELEGRAM_CHAT_ID를 설정하세요.');
  return id;
}
