import assert from 'node:assert/strict';
import test from 'node:test';
import { opponentProvider } from '../server/opponent-provider.mjs';
const teacher={role:'instructor'};
const cases={
  openai:['api.openai.com','/v1/responses',{output:[{content:[{type:'output_text',text:'[3]'}]}]}],
  google:['generativelanguage.googleapis.com','/v1beta/models/mock:generateContent',{candidates:[{content:{parts:[{text:'[3]'}]}}]}],
  cohere:['api.cohere.com','/v2/chat',{message:{content:[{text:'[3]'}]}}],
  mistral:['api.mistral.ai','/v1/chat/completions'],
  xai:['api.x.ai','/v1/chat/completions'],
  deepseek:['api.deepseek.com','/chat/completions'],
  moonshot:['api.moonshot.ai','/v1/chat/completions'],
  openrouter:['openrouter.ai','/api/v1/chat/completions'],
  alibaba:['dashscope-us.aliyuncs.com','/compatible-mode/v1/chat/completions']
};
for(const [provider,[host,path,reply]] of Object.entries(cases)) test(provider+' catalog and policy adapter',async()=>{
  const input={provider,key:'synthetic-key',model:'mock',count:1,productId:'shoes'};
  const request=async(address,options)=>{
    const url=new URL(address);
    assert.equal(url.hostname,host);
    assert.equal(options.headers[provider==='google'?'x-goog-api-key':'Authorization'],provider==='google'?input.key:'Bearer '+input.key);
    assert.equal(options.redirect,'error');
    if(options.method==='GET'){
      if(provider==='alibaba') return Response.json({output:{models:[{model:'mock'}],page_no:1,page_size:20,total:1}});
      if(provider==='cohere'||provider==='google') return Response.json({models:[{name:provider==='google'?'models/mock':'mock'}]});
      return Response.json({data:[{id:'mock'}]});
    }
    assert.equal(url.pathname,path);assert.ok(!options.body.includes(input.key));
    return Response.json(reply || {choices:[{message:{content:'[3]'}}]});
  };
  assert.deepEqual(await opponentProvider(teacher,input,'models',request),{models:['mock']});
  assert.deepEqual(await opponentProvider(teacher,input,'profiles',request),{provider,model:'mock',profiles:[3]});
});
test('provider failures leave credentials out of classroom error messages',async()=>{
 const input={provider:'openai',key:'test-secret-key',model:'mock',count:1,productId:'shoes'};
 await assert.rejects(opponentProvider(teacher,input,'profiles',async()=>new Response(input.key,{status:401})),e=>e.status===422&&!e.message.includes(input.key));
});
