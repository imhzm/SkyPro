const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const analytics=compile('src/lib/product-analytics.ts');
const hook=compile('src/components/analytics/useConfirmedConversion.ts');
function setup(){
 let consent=true,provider=false,cleanup;
 const listeners=new Map(),calls=[],api={};
 const client={location:{origin:'https://example.test',pathname:'/auth/verify-email'},
  addEventListener(name,fn){listeners.set(name,fn);},
  removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);}};
 Object.defineProperty(client,'gtag',{get:()=>provider?((...args)=>calls.push(args)):undefined});
 const context={exports:api,URL,document:{title:'SkyPro'},window:client,localStorage:{getItem:()=>JSON.stringify({analytics:consent})}};
 vm.runInNewContext(analytics,context);
 const exports={};
 vm.runInNewContext(hook,{...context,exports,require:name=>name==='react'?{
  useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>{cleanup=fn();}
 }:api});
 return {record:exports.useConfirmedConversion(),calls,ready(){provider=true;listeners.get('skypro:analytics-ready')?.();},withdraw(){consent=false;listeners.get('skypro:consent-changed')?.();},unmount(){cleanup();},listeners};
}
test('backend-confirmed activation survives delayed provider readiness and is sent once',()=>{
 const s=setup();s.record('trial_activated');assert.equal(s.calls.length,0);
 s.ready();s.ready();assert.equal(s.calls.length,1);assert.equal(s.calls[0][1],'trial_activated');
 assert.equal(s.calls[0][2].page_location,'https://example.test/auth/verify-email');
});
test('withdrawal before provider readiness discards the confirmed event',()=>{
 const s=setup();s.record('trial_activated');s.withdraw();s.ready();assert.equal(s.calls.length,0);
 const denied=setup();denied.withdraw();denied.record('complete_registration');denied.ready();assert.equal(denied.calls.length,0);
});
test('provider readiness alone never creates a conversion; unmount removes pending work',()=>{
 const s=setup();s.ready();assert.equal(s.calls.length,0);
 const pending=setup();pending.record('complete_registration');pending.unmount();pending.ready();assert.equal(pending.calls.length,0);assert.equal(pending.listeners.size,0);
});
