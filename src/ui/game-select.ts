/** Custom game dropdowns. Native selects retain values/events for existing gameplay bindings only. */
let active:{select:HTMLSelectElement;button:HTMLButtonElement;list:HTMLDivElement;index:number}|undefined;
const widgets=new WeakMap<HTMLSelectElement,HTMLButtonElement>();
let serial=0;
export function closeGameSelect(){if(!active)return;active.button.setAttribute('aria-expanded','false');active.button.removeAttribute('aria-activedescendant');active.list.remove();active=undefined;}
function addOptionIcon(target:HTMLElement,path:string|undefined){if(!path||!path.startsWith('/icons/'))return;const img=document.createElement('img');img.src=path;img.className='game-icon';img.alt='';img.setAttribute('aria-hidden','true');target.prepend(img);}
function sync(select:HTMLSelectElement,button:HTMLButtonElement){const text=select.selectedOptions[0]?.textContent||'Choose…';if(button.textContent!==text||button.dataset.icon!==(select.selectedOptions[0]?.dataset.icon||'')){button.textContent=text;button.dataset.icon=select.selectedOptions[0]?.dataset.icon||'';addOptionIcon(button,button.dataset.icon);}button.disabled=select.disabled;button.title=button.textContent;}
function highlight(index:number){if(!active)return;const options=Array.from(active.list.querySelectorAll<HTMLElement>('[role="option"]'));if(!options.length)return;active.index=Math.max(0,Math.min(options.length-1,index));options.forEach((o,n)=>o.classList.toggle('highlighted',n===active!.index));const option=options[active.index];active.button.setAttribute('aria-activedescendant',option.id);option.scrollIntoView({block:'nearest'});}
function commit(index:number){if(!active)return;const {select,button,list}=active,option=list.querySelectorAll<HTMLElement>('[role="option"]')[index];if(!option)return;select.value=option.dataset.value!;closeGameSelect();sync(select,button);button.focus();select.dispatchEvent(new Event('change',{bubbles:true}));}
function open(select:HTMLSelectElement,button:HTMLButtonElement){
 closeGameSelect();if(select.disabled)return;
 const list=document.createElement('div');list.className='game-select-menu';list.id=button.getAttribute('aria-controls')!;list.role='listbox';list.setAttribute('aria-label',button.getAttribute('aria-label')!);
 const enabled=Array.from(select.options).filter(o=>!o.disabled);
 enabled.forEach((option,index)=>{const row=document.createElement('div');row.role='option';row.id=list.id+'-'+index;row.dataset.value=option.value;row.textContent=option.text;addOptionIcon(row,option.dataset.icon);row.setAttribute('aria-selected',String(option.selected));row.onpointerdown=e=>{e.preventDefault();e.stopPropagation();commit(index)};row.onpointermove=()=>highlight(index);list.append(row)});
 document.body.append(list);

 active={select,button,list,index:Math.max(0,enabled.findIndex(o=>o.selected))};button.setAttribute('aria-expanded','true');positionGameSelect();highlight(active.index);
}
function positionGameSelect(){
 if(!active)return;const {button,list}=active,rect=button.getBoundingClientRect();
 const width=Math.min(innerWidth-16,Math.max(rect.width,220));list.style.width=width+'px';list.style.left=Math.max(8,Math.min(innerWidth-width-8,rect.left))+'px';
 const below=innerHeight-rect.bottom-12,above=rect.top-12,height=Math.min(280,Math.max(40,below,above));list.style.maxHeight=height+'px';list.style.top=(below>=Math.min(280,list.scrollHeight)?rect.bottom+5:Math.max(8,rect.top-Math.min(height,list.scrollHeight)-5))+'px';
}
export function enhanceGameSelects(root:ParentNode=document){root.querySelectorAll<HTMLSelectElement>('select').forEach(select=>{
 const previous=widgets.get(select);if(previous){sync(select,previous);return;}
 const button=document.createElement('button');button.type='button';button.className='game-select-trigger';button.role='combobox';button.id=select.id?select.id+'-trigger':'game-select-'+(++serial);button.setAttribute('aria-controls',button.id+'-options');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
 const label=select.getAttribute('aria-label')||select.closest('label')?.childNodes[0]?.textContent?.trim()||select.id.replaceAll('-',' ')||'Choose an option';button.setAttribute('aria-label',label);
 select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.classList.add('game-select-native');select.after(button);widgets.set(select,button);sync(select,button);
 button.onclick=e=>{e.preventDefault();e.stopPropagation();if(active?.button===button)closeGameSelect();else open(select,button)};
 let search='',searchAt=0;
 button.onkeydown=e=>{
  if(e.key==='Tab'){closeGameSelect();return;}
  if(e.key==='Escape'){if(active){e.stopPropagation();e.preventDefault();closeGameSelect();}return;}
  e.stopPropagation();
  if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)){e.preventDefault();if(!active||active.button!==button){open(select,button);return;}if(e.key==='Enter'||e.key===' ')commit(active.index);else highlight(e.key==='Home'?0:e.key==='End'?999:active.index+(e.key==='ArrowDown'?1:-1));}
  else if(e.key.length===1){e.preventDefault();if(!active||active.button!==button)open(select,button);if(!active)return;search=performance.now()-searchAt>700?e.key:search+e.key;searchAt=performance.now();const index=Array.from(active.list.children).findIndex(o=>o.textContent?.toLowerCase().startsWith(search.toLowerCase()));if(index>=0)highlight(index);}
 };
 select.addEventListener('change',()=>sync(select,button));
});}
export function observeGameSelects(){
 const observer=new MutationObserver(()=>{if(active&&!active.select.isConnected)closeGameSelect();enhanceGameSelects();});observer.observe(document.getElementById('panel-root')!,{childList:true,subtree:true});
 // Do not re-write DOM on every scan: changing textContent unnecessarily would trigger the observer again.
 window.addEventListener('resize',closeGameSelect);document.addEventListener('pointerdown',e=>{if(active&&!active.list.contains(e.target as Node)&&!active.button.contains(e.target as Node))closeGameSelect()});
 document.addEventListener('scroll',e=>{if(active&&!active.list.contains(e.target as Node))positionGameSelect()},true);
}
