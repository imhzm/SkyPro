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
  const context={exports,URL,document:{title:'SkyPro'},window:{location:{origin:'https://example.test',pathname:options.path||'/auth/register',search:'?email=private@example.test&token=secret'},
    ...(options.noProvider?{}:{gtag:(...args)=>{if(options.throwProvider)throw Error('unavailable');calls.push(args);}})},
    localStorage:{getItem:()=>{if(options.blockedStorage)throw Error('blocked');return consent;}}};
  vm.runInNewContext(code,context);
  return {track:exports.trackProductEvent,calls,api:exports,client:context.window};
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

test('guide CTAs are classified, private routes and lookalike destinations are not',()=>{
  const {productLinkEvent: classify}=sandbox(null).api, origin='https://example.test';
  assert.equal(classify('/guides','/auth/register',origin),'click_trial');
  assert.equal(classify('/guides/trial','https://wa.me/201029934356',origin),'click_whatsapp');
  assert.equal(classify('/platforms/facebook','tel:+201029934356',origin),'click_contact');
  assert.equal(classify('/','https://downloads.skywaveads.com/app.exe',origin),'click_download');
  assert.equal(classify('/','/app.exe',origin,true),'click_download');
  assert.equal(classify('/admin','/auth/register',origin),null);
  assert.equal(classify('/guides-secret','/auth/register',origin),null);
  assert.equal(classify('/guides','https://wa.me.evil.test/',origin),null);
  assert.equal(classify('/','https://evil.test/app.exe',origin,true),null);
  assert.equal(classify('/','javascript:alert(1)',origin),null);
});

test('account creation and actual activation use different backend-confirmed outcomes',()=>{
  const api=sandbox(null).api;
  const created={success:true,data:{userId:12,pendingVerification:true}};
  assert.equal(api.isCreatedRegistration(true,created),true);
  for(const value of [null,{}, {success:'true',data:created.data}, {success:true,data:{userId:0,pendingVerification:true}}, {success:true,data:{userId:'12',pendingVerification:true}}, {success:true,data:{userId:12}}]){
    assert.equal(api.isCreatedRegistration(true,value),false);
  }
  assert.equal(api.isCreatedRegistration(false,created),false);
  assert.equal(api.isConfirmedTrialActivation(true,{success:true}),true);
  for(const payload of [null,{}, {success:false},{success:'true'}])assert.equal(api.isConfirmedTrialActivation(true,payload),false);
  assert.equal(api.isConfirmedTrialActivation(false,{success:true}),false);
});

test('revoking consent disables an already loaded Google tag before denying consent',()=>{
  const s=sandbox('{"analytics":true}');
  s.api.applyGoogleAnalyticsConsent('G-TEST123',false);
  assert.equal(s.client['ga-disable-G-TEST123'],true);
  assert.equal(s.calls.at(-1)[0],'consent');
  assert.equal(s.calls.at(-1)[2].analytics_storage,'denied');
  s.api.applyGoogleAnalyticsConsent('G-TEST123',true);
  assert.equal(s.client['ga-disable-G-TEST123'],false);
  assert.equal(s.calls.at(-1)[2].analytics_storage,'granted');
  for(const key of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(s.calls.at(-1)[2][key],'denied');
  const before=s.calls.length;s.api.applyGoogleAnalyticsConsent('invalid tag',true);assert.equal(s.calls.length,before);
});

test('manual SPA pageviews remove query/hash secrets and exclude protected routes',()=>{
  const s=sandbox('{"analytics":true}',{path:'/guides'});
  assert.equal(s.api.trackPageView('https://example.test/auth/verify-email?token=secret#private'),true);
  const payload=s.calls.at(-1)[2];
  assert.equal(s.calls.at(-1)[1],'page_view');
  assert.equal(payload.page_location,'https://example.test/guides');
  assert.equal(payload.page_referrer,'https://example.test/auth/verify-email');
  assert(!JSON.stringify(s.calls).includes('secret'));
  assert.equal(sandbox('{"analytics":false}').api.trackPageView(''),false);
  const privatePage=sandbox('{"analytics":true}',{path:'/dashboard/billing'});
  assert.equal(privatePage.api.trackPageView(''),false);assert.equal(privatePage.track('complete_registration'),false);
  assert.equal(privatePage.calls.length,0);
});
