const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('src/lib/product-analytics.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
function sandbox(consent,options={}){
  const calls=[],exports={};
  const context={exports,window:{location:{origin:'https://example.test',pathname:'/auth/register',search:'?email=private@example.test&token=secret'},
    ...(options.noProvider?{}:{gtag:(...args)=>{if(options.throwProvider)throw Error('unavailable');calls.push(args);}})},
    localStorage:{getItem:()=>{if(options.blockedStorage)throw Error('blocked');return consent;}}};
  vm.runInNewContext(code,context);
  return {track:exports.trackProductEvent,calls};
}
test('no analytics event without affirmative consent and an available provider',()=>{
  for(const consent of [null,'{','{}','{"analytics":false}','{"analytics":"true"}']){
    const s=sandbox(consent);assert.equal(s.track('click_trial'),false);assert.equal(s.calls.length,0);
  }
  for(const options of [{noProvider:true},{blockedStorage:true},{throwProvider:true}]){
    const s=sandbox('{"analytics":true}',options);assert.equal(s.track('click_trial'),false);assert.equal(s.calls.length,0);
  }
});
test('events omit query strings, form values and unsafe platform identifiers',()=>{
  const s=sandbox('{"analytics":true}');
  for(const event of ['view_platform','view_product_gallery','click_trial','start_registration','complete_registration','click_download','click_whatsapp']){
    assert.equal(s.track(event,'private@example.test'),true);
  }
  assert.equal(s.calls.length,7);
  for(const [command,,payload]of s.calls){
    assert.equal(command,'event');assert.deepEqual(Object.keys(payload).sort(),['page_location','page_path']);
    assert.equal(payload.page_location,'https://example.test/auth/register');
    assert(!JSON.stringify(payload).includes('secret'));assert(!JSON.stringify(payload).includes('private@'));
  }
  assert.equal(s.track('view_platform','facebook'),true);assert.equal(s.calls.at(-1)[2].platform,'facebook');
});
