// Pass this self-contained function to the documented CUA read-only evaluate API.
function collectRenderedMain(){
 const mains=[...document.querySelectorAll('main')].filter(node=>!node.querySelector('main'));
 if(mains.length!==1)throw Error('Expected one innermost main, found '+mains.length);
 const main=mains[0],excludedTags=new Set(['SCRIPT','STYLE','NAV','FOOTER','ASIDE','DIALOG','BUTTON','INPUT','SELECT','TEXTAREA']);
 const excluded=[];
 function text(node){
  if(node.nodeType===3)return node.nodeValue||'';
  if(node.nodeType!==1)return '';
  const style=getComputedStyle(node),classes=typeof node.className==='string'?node.className:'';
  if(excludedTags.has(node.tagName)||node.getAttribute('aria-hidden')==='true'||style.display==='none'||style.visibility==='hidden'||/__cta(?:\s|$)|__articleCta(?:\s|$)/i.test(classes)){excluded.push({tag:node.tagName,reason:'navigation/control/hidden/CTA'});return '';}
  return [...node.childNodes].map(text).join(' ');
 }
 const body=text(main).replace(/\s+/g,' ').trim();
 return {path:location.pathname,title:document.title,canonical:document.querySelector('link[rel=canonical]')?.getAttribute('href'),h1:main.querySelector('h1')?.textContent?.trim(),mainContent:{text:body,scope:'One innermost semantic main; text nodes counted once, including intro/cards/offscreen mounted text; navigation/control/hidden/CTA excluded',headings:[...main.querySelectorAll('h2,h3')].map(h=>h.textContent?.trim()).filter(Boolean),articleCards:main.querySelectorAll('article h3').length,excluded}};
}
module.exports={collectRenderedMain};
