import {pwaControls,bindPwaControls} from './pwa';
import {enhanceGameSelects,closeGameSelect} from './game-select';
type Character={id:string;name:string;job:string;level:number;slot:number};
let entered=false;
let activeCharacter:Character|undefined;
export const enteredCharacter=()=>activeCharacter;
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
async function request(path:string,body?:unknown){
 const response=await fetch(path,{...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'The realm is unavailable. Please try again.');return data;
}
/** Resolves only after a deliberate Start. Never create a renderer or connect before this gate. */
export async function requireGameAccount():Promise<void>{
 if(entered)return;
 const app=document.querySelector<HTMLDivElement>('#app')!;
 let accountUsername='';
 const practice=new URLSearchParams(location.search).get('practice')==='1';
 const shell=(title:string,content:string)=>{closeGameSelect();app.innerHTML=`<main class="account-screen"><section class="account-card"><img src="/icons/hero.png" alt="" width="64" height="64"><p class="account-wordmark">MOSSVALE ONLINE</p><h1>${title}</h1>${content}${pwaControls()}</section></main>`;bindPwaControls(app);};
 const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Please try again.';
 await new Promise<void>(resolve=>{
  const start=()=>{entered=true;closeGameSelect();resolve()};
  const busy=()=>app.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=true);
  const error=(e:unknown)=>{const node=app.querySelector('#account-error');if(node)node.textContent=errorMessage(e);app.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=false);const startButton=app.querySelector<HTMLButtonElement>('#character-start');if(startButton)startButton.disabled=!app.querySelector('[data-character][aria-pressed="true"]')};
  const logout=async()=>{busy();try{await request('/api/auth/logout',{});login()}catch(e){error(e)}};
  async function roster(preferredId?:string){
   shell('Choose your adventurer','<p role="status">Loading your characters…</p>');
   try{
    const data=await request('/api/characters');const characters:Character[]=data.characters;let selected=characters.find(c=>c.id===preferredId)?.id||characters.find(c=>c.id===data.selectedId)?.id||characters[0]?.id;
    shell('Choose your adventurer',`<p class="account-note">Signed in as <strong>${escape(accountUsername)}</strong></p><p>Three slots. A world of adventures.</p><div class="character-roster" role="group" aria-label="Character slots">${[1,2,3].map(slot=>{const c=characters.find(c=>c.slot===slot);return c?`<button type="button" class="character-slot" data-character="${escape(c.id)}" aria-pressed="${c.id===selected}"><img src="/icons/${c.job==='mage'?'sparkles':c.job==='archer'?'wind':'swords'}.png" alt=""><strong>${escape(c.name)}</strong><span>Lv. ${c.level} · ${escape(c.job)}</span><small>Slot ${slot}</small></button>`:`<div class="character-slot empty"><span>＋</span><strong>Empty slot</strong><small>Slot ${slot}</small></div>`}).join('')}</div><p id="account-error" role="alert" aria-live="polite"></p><button id="character-start" class="account-primary" ${selected?'':'disabled'}>Start adventure</button>${characters.length<3?`<form id="character-create"><h2>Create an adventurer</h2><label for="character-name">Character name</label><input id="character-name" name="name" maxlength="24" required autocomplete="off" placeholder="Your adventurer’s name"><label for="character-job">Class</label><select id="character-job" name="job" aria-label="Class"><option value="swordsman">Swordsman</option><option value="mage">Mage</option><option value="archer">Archer</option></select><button type="submit">Create character</button></form>`:'<p class="account-note">All three character slots are occupied.</p>'}<div class="account-links"><button id="roster-logout" type="button">Log out</button><a href="?practice=1">Device practice</a></div>`);
    enhanceGameSelects(app);
    app.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(button=>button.onclick=()=>{selected=button.dataset.character||'';app.querySelectorAll('[data-character]').forEach(b=>b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.character===selected)));});
    app.querySelector<HTMLButtonElement>('#character-start')!.onclick=async()=>{if(!selected)return;busy();try{await request('/api/characters/select',{id:selected});activeCharacter=characters.find(c=>c.id===selected);start()}catch(e){error(e)}};
    app.querySelector<HTMLButtonElement>('#roster-logout')!.onclick=()=>void logout();
    app.querySelector<HTMLFormElement>('#character-create')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget as HTMLFormElement;if(!form.reportValidity())return;const name=(form.elements.namedItem('name') as HTMLInputElement).value.trim();if(!name){error(new Error('Enter a character name.'));return;}busy();try{const created=await request('/api/characters',{name,job:(form.elements.namedItem('job') as HTMLSelectElement).value});await roster(created.character?.id)}catch(e){error(e)}});
   }catch(e){shell('Unable to load characters',`<p id="account-error" role="alert">${escape(errorMessage(e))}</p><button id="account-retry">Try again</button><button id="roster-logout">Log out</button>`);app.querySelector<HTMLButtonElement>('#account-retry')!.onclick=()=>void roster();app.querySelector<HTMLButtonElement>('#roster-logout')!.onclick=()=>void logout()}
  }
  function login(registering=false){
   shell(registering?'Create your account':'Your adventure awaits',`<p>Log in to keep your adventurers on the server.</p><form id="account-form"><label for="account-username">Username</label><input id="account-username" name="username" autocomplete="username" minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]{3,24}" required placeholder="3–24 letters, numbers or underscore"><label for="account-password">Password</label><input id="account-password" name="password" type="password" autocomplete="${registering?'new-password':'current-password'}" minlength="10" maxlength="128" required placeholder="At least 10 characters">${registering?'<label for="account-confirm">Confirm password</label><input id="account-confirm" name="confirm" type="password" autocomplete="new-password" required>':''}<p id="account-error" role="alert" aria-live="polite"></p><button id="account-login" type="submit">${registering?'Create account':'Log in'}</button><button id="account-register" type="button">${registering?'Back to login':'Create account'}</button></form><p class="account-note">Your existing online hero stays in slot 1. Keep your password safe; password recovery is not available yet.</p><a href="?practice=1">Device practice</a>`);
   const form=app.querySelector<HTMLFormElement>('form')!;
   form.onsubmit=async e=>{e.preventDefault();if(!form.reportValidity())return;const password=(form.elements.namedItem('password') as HTMLInputElement).value;if(registering&&(form.elements.namedItem('confirm') as HTMLInputElement).value!==password){error(new Error('Passwords must match'));return;}busy();try{const signedIn=await request('/api/auth/'+(registering?'register':'login'),{username:(form.elements.namedItem('username') as HTMLInputElement).value,password});accountUsername=signedIn.account?.username||(form.elements.namedItem('username') as HTMLInputElement).value;await roster()}catch(e){error(e)}};
   app.querySelector<HTMLButtonElement>('#account-register')!.onclick=()=>login(!registering);
  }
  if(practice){shell('Device practice','<p>Practice with your saved device hero. Progress stays on this browser.</p><button id="practice-start" class="account-primary">Start practice</button><p><a href="/">Back to online accounts</a></p>');app.querySelector<HTMLButtonElement>('#practice-start')!.onclick=start;return;}
  const status=async()=>{shell('Welcome, adventurer','<p role="status">Checking your account…</p>');try{const data=await request('/api/auth/status');if(data.account){accountUsername=data.account.username;await roster()}else login()}catch(e){shell('Account service unavailable',`<p id="account-error" role="alert">${escape(errorMessage(e))}</p><button id="account-retry">Try again</button><p><a href="?practice=1">Device practice</a></p>`);app.querySelector<HTMLButtonElement>('#account-retry')!.onclick=()=>void status()}};
  void status();
 });
}
