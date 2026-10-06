/** Runs before Babylon creates a renderer. Device practice remains available. */
export async function requireGameAccount():Promise<void>{
 const response=await fetch('/api/auth/status',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Account service unavailable');
 if((await response.json()).account)return;
 const app=document.querySelector<HTMLDivElement>('#app')!;
 app.innerHTML=`<main class="account-screen"><section class="account-card"><img src="/icons/hero.png" alt="" width="76" height="76"><p class="account-wordmark">MOSSVALE ONLINE</p><h1>Your adventure awaits</h1><p>Log in or create a game account to keep your hero on the server.</p><form id="account-form"><label for="account-username">Username</label><input id="account-username" name="username" autocomplete="username" minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]{3,24}" required placeholder="3–24 letters, numbers or underscore"><label for="account-password">Password</label><input id="account-password" name="password" type="password" autocomplete="current-password" minlength="10" maxlength="128" required placeholder="At least 10 characters"><p id="account-error" role="alert" aria-live="polite"></p><button id="account-login" type="submit">Log in</button><button id="account-register" type="button">Create account</button></form><p class="account-note">Your first account on this Sites identity keeps your existing online hero. Additional accounts start a new hero. Keep your password safe; password recovery is not available yet.</p><a href="?practice=1">Play device practice</a></section></main>`;
 await new Promise<void>(()=>{
 const form=app.querySelector<HTMLFormElement>('form')!,error=app.querySelector<HTMLElement>('#account-error')!;
 let registering=false;
 const submit=async(action:string)=>{if(!form.reportValidity())return;if(action==='register'&&(form.querySelector<HTMLInputElement>('#account-confirm')!.value!==(form.elements.namedItem('password') as HTMLInputElement).value)){error.textContent='Passwords must match';return};const buttons=Array.from(form.querySelectorAll('button'));buttons.forEach(b=>b.disabled=true);error.textContent='';try{const response=await fetch('/api/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:(form.elements.namedItem('username') as HTMLInputElement).value,password:(form.elements.namedItem('password') as HTMLInputElement).value})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to sign in');location.reload()}catch(e){error.textContent=e instanceof Error?e.message:'Unable to sign in';buttons.forEach(b=>b.disabled=false)}};
 form.addEventListener('submit',e=>{e.preventDefault();void submit(registering?'register':'login')});
 app.querySelector('#account-register')!.addEventListener('click',()=>{
  registering=!registering;error.textContent='';const password=form.querySelector<HTMLInputElement>('#account-password')!;
  password.autocomplete=registering?'new-password':'current-password';
  form.querySelector('#account-login')!.textContent=registering?'Create account':'Log in';form.querySelector('#account-register')!.textContent=registering?'Back to login':'Create account';
  if(registering)password.insertAdjacentHTML('afterend','<label id="account-confirm-label" for="account-confirm">Confirm password</label><input id="account-confirm" type="password" autocomplete="new-password" required>');
  else{form.querySelector('#account-confirm')?.remove();form.querySelector('#account-confirm-label')?.remove()}
 });
 });
}
