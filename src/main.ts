import {craftingMaterials,isCraftMaterial,materialCount,materialRarity,gearRecipe,craftCost} from './game/crafting';
import {craftingConfig,economy,refinement,equipmentConfig,progression} from './config/balance';
import { WORLD_BOUNDS, PORTAL_POSITION } from './game/map-data';
import {enhanceGameSelects,observeGameSelects,closeGameSelect} from './ui/game-select';
import {EXP_CHARM,EXP_TOME,itemCategories,itemCategory,itemCatalog} from './game/items';
import {refineBonus,refineChance,refineLevel,refineCost,refineSuccess,refineStones,type StoneTier} from './game/refinement';
import "./style.css";
import "./game-theme.css";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/nunito/latin-900.css";
import { species, type Simulation, type Item } from "./simulation";
import { startSimulation, NetworkSimulation, RealmConnectionError } from "./game/network";
import { World } from "./world";
import { FeedbackAudio } from "./game/audio";
import { zones, species as catalogSpecies, questDefinitions, type ZoneId } from "./game/content";
import { equipment, gearById, gearByName, type GearSlot, type Bonuses, gearSlots, BAG_CAPACITY, itemBonuses, itemRarity, rarityLabels, rarityOrder, statLabels, formatStat, gearSets, setBonuses } from "./game/equipment";
import { classes, MAX_LEVEL, skillBranches, auxiliaryItems, isAuxiliaryItem, type ClassId } from "./game/classes";
import type { GameWorld } from "./render/contracts";
const iconAliases: Record<string, string> = {
  sprout: "sprout",
  heart: "health-potion",
  "chevron-right": "arrow-right",
  sparkles: "sparkles",
  "map-pin": "map-pin",
  "maximize-2": "expand",
  moon: "moon",
  "volume-x": "sound-off",
  "volume-2": "sound-on",
  "scroll-text": "quest",
  minus: "minus",
  "arrow-right": "arrow-right",
  x: "close",
  backpack: "backpack",
  "wand-sparkles": "sparkles",
  "user-round": "hero",
  anvil: "anvil",
  store: "store",
  "chevron-down": "arrow-down",
  "message-circle": "quest",
  "mouse-pointer-2": "cursor",
  crosshair: "crosshair",
  swords: "swords",
  wind: "wind",
  "flask-conical": "health-potion",
  droplets: "mana-potion",
  hand: "hand",
  "repeat-2": "auto",
  coins: "coins",
  focus: "focus",
  "settings-2": "settings",
  "circle-help": "help",
  map: "map",
  plus: "plus",
  save: "save",
};
const icon = (name: string) =>
  `<img class="game-icon" src="/icons/${iconAliases[name] || name}.png" alt="" aria-hidden="true" draggable="false">`;
const itemIcon = (name: string) =>
  icon(gearByName(name)?.icon ||
    (
      {
        [EXP_CHARM.name]:EXP_CHARM.icon,[EXP_TOME.name]:EXP_TOME.icon,"Common refine stone":"ice-shard","Rare refine stone":"crystal-dust",
        "Red potion": "health-potion",
        "Blue potion": "mana-potion",
        "Dew jelly": "jelly",
        "Forest mushroom": "mushroom",
        "Verdant leaf": "leaf",
        "Honey drop":"honey","Golden honey":"honey","Soft fur":"fur","Boar tusk":"tusk","Amber antler":"antler","Wisp essence":"wisp-essence","Shade essence":"wisp-essence","Crystal dust":"crystal-dust","Ice shard":"ice-shard","Frost fang":"frost-fang","Sky feather":"feather","Rootheart core":"root-core","Amber leaf":"leaf","Marsh reed":"leaf","Ancient root":"leaf","Living vine":"leaf","Amber spore":"mushroom","Snow spore":"mushroom","Crystal jelly":"jelly","Rune stone":"ice-shard","Warden stone":"ice-shard",
      } as Record<string, string>
    )[name] || "chest",
  );
const portrait = `<img class="hero-portrait" src="/icons/hero.png" alt="Sprout the adventurer" draggable="false">`;
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<canvas id="game" aria-label="3D game world: click the ground to move, click a monster to attack"></canvas><div id="labels"></div><div id="floats"></div>
<header class="identity"><div class="portrait">${portrait}<b id="level-badge">1</b></div><div class="identity-info"><div class="name-line"><strong>Sprout</strong><span id="class-name">SWORDSMAN</span>${icon("sprout")}</div><div class="resource hp"><i id="hp-fill"></i><span>HP <b id="hp-text"></b></span></div><div class="resource mp"><i id="mp-fill"></i><span>MP <b id="mp-text"></b></span></div><div class="xp-mini"><i id="xp-fill"></i></div></div><button class="identity-more" data-panel="character" title="Character status (C)">${icon("chevron-right")}</button></header>
<div class="world-heading"><div class="wordmark">${icon("sparkles")} MOSSVALE <span>ONLINE</span></div><div class="realm"><span></span> MOONLIT GLADE <b>·</b> <small>CHANNEL 01 · SOLO PROTOTYPE</small></div></div>
<div class="map-area"><div class="map-title">${icon("map-pin")} Moonlit Glade <button data-panel="map" title="Open map (M)">${icon("maximize-2")}</button></div><button class="minimap" data-panel="map" aria-label="Open map"><canvas id="mini" width="180" height="160"></canvas><span class="north">N</span><span class="map-coordinate" id="coords">0, 2</span></button><div class="map-footer"><span>${icon("moon")} A bright new adventure</span><button id="sound" title="Toggle ambient music">${icon("volume-x")}</button></div></div>
<div class="quest-tracker"><div class="quest-heading">${icon("scroll-text")} YOUR ADVENTURE <button id="quest-toggle" aria-label="Collapse quests">${icon("minus")}</button></div><div id="quest-content"><span class="quest-tag">BEGINNER QUEST</span><strong>A little courage</strong><p>The glade needs a helping hand.</p><div class="quest-objective"><span class="quest-dot"></span> Defeat woodland monsters <b id="quest-progress">0/5</b></div><div class="quest-progress"><i id="quest-fill"></i></div><button id="claim" hidden>Claim reward · 100 z ${icon("arrow-right")}</button><span class="quest-reward" id="quest-reward">REWARD <b>100 z</b> + 3 potions</span></div></div>
<div id="target-hud" hidden><div><span id="target-name">Dewdrop</span><small>Lv. 1 · Wild monster</small></div><div class="target-bar"><i id="target-fill"></i></div><button id="untarget" title="Clear target">${icon("x")}</button></div>
<nav class="side-menu" aria-label="Game menus"><button data-panel="inventory" title="Inventory (I)">${icon("backpack")}<span>Bag</span><kbd>I</kbd></button><button data-panel="skills" title="Skills (K)">${icon("wand-sparkles")}<span>Skills</span><kbd>K</kbd></button><button data-panel="character" title="Character (C)">${icon("user-round")}<span>Hero</span><kbd>C</kbd></button><button data-panel="forge" title="Upgrade equipment">${icon("anvil")}<span>Forge</span></button><button data-panel="shop" title="Potion merchant">${icon("store")}<span>Shop</span></button></nav>
<div class="chat"><div class="chat-tabs"><button class="active" data-chat="world">World</button><button data-chat="combat">Combat</button><span>LOCAL ADVENTURE</span><button id="chat-hide" aria-label="Hide activity log">${icon("chevron-down")}</button></div><div id="chat-log"><p><b class="system">System</b> Welcome to Mossvale, adventurer.</p><p><b class="guide">Guide</b> Click a monster to begin your adventure!</p></div><div class="chat-input">${icon("message-circle")}<input id="chat-input" placeholder="Leave a local note…" maxlength="100" aria-label="Local note"><span>↵</span></div></div>
<div class="bottom-center"><div id="combat-state" aria-live="polite"></div><div class="control-hint"><span>${icon("mouse-pointer-2")} Click to move & attack</span><b>·</b><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to walk</span></div><div class="action-bar"><button class="target-action" id="nearest" title="Select nearest monster (Tab)">${icon('crosshair')}<kbd>TAB</kbd></button><div class="action-divider"></div><div class="skill-hotbar" aria-label="Six skill slots">${Array.from({length:6},(_,n)=>`<button class="skill-slot gold" data-skill="${n}" data-hotbar="${n}" title="Skill ${n+1}"><kbd>${n+1}</kbd>${icon('plus')}<small>Empty</small><span class="cooldown"></span></button>`).join('')}</div><div class="action-divider"></div><div class="aux-hotbar" aria-label="Four auxiliary item slots">${Array.from({length:4},(_,n)=>`<button class="aux-slot" data-aux="${n}"><kbd>${[7,8,9,0][n]}</kbd>${icon('plus')}<small>Empty</small><span class="count"></span><span class="cooldown"></span></button>`).join('')}</div><button class="loot-action" id="loot" title="Pick up nearby loot (F)">${icon('hand')}<kbd>F</kbd><small>Loot</small></button><button id="auto" title="Auto-select and attack monsters">${icon('repeat-2')}<small>Auto</small></button></div><div class="experience"><span>BASE EXP</span><div><i id="exp-fill"></i></div><b id="exp-text">0 / 120</b></div></div>
<div class="bottom-right"><div class="community-shortcuts"><button data-panel="community" title="Party & friends">${icon("hero")} Party</button><button data-panel="market" title="Player market">${icon("store")} Market</button></div><div class="wallet">${icon("coins")}<b id="gold">120</b><span>z</span></div><div class="utility"><button id="camera" title="Reset camera">${icon("focus")}</button><button data-panel="settings" title="Settings">${icon("settings-2")}</button><button data-panel="help" title="How to play">${icon("circle-help")}</button></div><span class="save-indicator"><i></i> Adventure saved locally</span></div>
<aside id="item-tooltip" class="item-tooltip" role="tooltip" hidden></aside><aside id="secondary-popover" class="secondary-popover" role="region" aria-label="Secondary stats" hidden></aside><div id="toast" role="status"></div><div id="panel-root"></div><div class="touch-controls"><button data-touch="up" aria-label="Walk up"><span class="arrow-up">${icon("arrow-down")}</span></button><button data-touch="left" aria-label="Walk left"><span class="arrow-left">${icon("arrow-right")}</span></button><button data-touch="down" aria-label="Walk down">${icon("arrow-down")}</button><button data-touch="right" aria-label="Walk right">${icon("arrow-right")}</button></div>`;
async function boot(){
let sim: Simulation;
try { sim = await startSimulation(); } catch(error) {
  const signIn=error instanceof RealmConnectionError&&error.status===401;
  app.innerHTML = `<div class="graphics-error"><h1>${signIn?'Sign in to play online':'Realm unavailable'}</h1><p>${signIn?'Your online character belongs to your Sites account. Sign in to continue.':'Your online character is safe. Reload to reconnect.'}</p>${signIn?'<a class="primary-button" href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in with ChatGPT</a>':'<button onclick="location.reload()">Reconnect</button>'}<p><a href="?practice=1">Play practice with your existing device save</a></p></div>`;
  if(signIn)return;
  throw error;
}
const feedback = new FeedbackAudio();
window.addEventListener("pointerdown", () => feedback.unlock(), { once: true });
window.addEventListener("keydown", () => feedback.unlock(), { once: true });
let world: GameWorld;
try {
  world = new World(
    sim,
    document.querySelector("#game")!,
    document.querySelector("#labels")!,
  );
} catch (error) {
  app.innerHTML =
    '<div class="graphics-error"><h1>Graphics unavailable</h1><p>Mossvale needs WebGL. Enable hardware acceleration in your browser and reload.</p><button onclick="location.reload()">Try again</button></div>';
  throw error;
}
const nodes=new Map<string,HTMLElement>();
const $ = (s:string)=>{let node=nodes.get(s);if(!node?.isConnected){node=document.querySelector<HTMLElement>(s)!;nodes.set(s,node);}return node;};
let panel = "";
let toastTimer = 0;
let chatMode = "world";
const messages: { text: string; type: string }[] = [
  { text: "Welcome to Mossvale, adventurer.", type: "System" },
  { text: "Click a monster to begin your adventure!", type: "Guide" },
];
function activity(text: string, type = "System") {
  messages.push({ text, type });
  if (messages.length > 40) messages.shift();
  renderLog();
}
function renderLog() {
  const log = $("#chat-log");
  log.replaceChildren();
  messages
    .filter((m) => chatMode === "world" || m.type === "Combat")
    .slice(-5)
    .forEach((m) => {
      const p = document.createElement("p");
      const b = document.createElement("b");
      b.className = m.type.toLowerCase();
      b.textContent = m.type + " ";
      p.append(b, document.createTextNode(m.text));
      log.append(p);
    });
  log.scrollTop = log.scrollHeight;
}
sim.onEvent = (text, type = "system", x, z) => {
  if(type==="telegraph"){feedback.play("monster");return;}
  if(type==="npc"){if(titles[text])openPanel(text);return;}
  if(type==="zone"){closePanel();}
  if (type === "sync") { if(panel) renderPanel(); refreshHotbar(); return; }
  if (type === "chat") { activity(text, "World"); return; }
  if (type === "damage" || type === "hurt") {
    feedback.play(
      type === "hurt"
        ? "hurt"
        : sim.save.job === "mage"
          ? "magic"
          : sim.save.job === "archer"
            ? "arrow"
            : "hit",
    );
    if (x !== undefined && z !== undefined) {
      const p = world.project(x, z, 1.4);
      const el = document.createElement("div");
      el.className = "damage-float " + type;
      el.textContent = text;
      el.style.left = p.x + "px";
      el.style.top = p.y + "px";
      $("#floats").append(el);
      setTimeout(() => el.remove(), 850);
    }
    return;
  }
  if (type === "strike" || type === "whirl") {
    feedback.play(sim.save.job==='mage'?'magic':sim.save.job==='archer'?'arrow':'hit');world.effect(type, x!, z!);
    return;
  }
  $("#toast").textContent = text;
  $("#toast").className = "visible " + type;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => ($("#toast").className = ""), 3000);
  activity(text, ["reward", "level"].includes(type) ? "Combat" : "System");
  if (type === "level") {
    world.effect("level", sim.x, sim.z);
    feedback.play("level");
  }
  if (panel) renderPanel();
};
const descriptions: Record<string, string> = {
  "Red potion": `Restores ${economy.redPotion.heal} HP. A trusty adventurer’s companion.`,
  "Blue potion": `Restores ${economy.bluePotion.heal} MP. Bottled moonlight, probably.`,
  "Dew jelly": "A shimmering material dropped by Dewdrops.",
  "Forest mushroom": "A forest treasure dropped by Wildcaps.",
  "Verdant leaf": "A crafting material dropped by Leaflings.",
};
const titles: Record<string, [string, string]> = {
  inventory: ["backpack", "Inventory"],
  character: ["user-round", "Character"],
  skills: ["wand-sparkles", "Skills"],
  forge: ["anvil", "Moonlight forge"],
  shop: ["store", "Glade merchant"],
  map: ["map", "Moonlit Glade"],
  help: ["circle-help", "Adventurer’s handbook"],
  settings: ["settings-2", "Settings"],report:["quest","Report a bug"],
  admin: ["chest", "Admin item laboratory"],
  operations: ["settings-2", "Realm operations"],
  journal: ["quest", "Adventure journal"],
  community:["hero","Party & friends"],market:["store","Player market"],
};
let inventoryFilter="all",inventorySort="name",inventoryPage=0;
let selectedRefine='',selectedStone:StoneTier='common';
let selectedCraftRarity:typeof rarityOrder[number]='common';
let craftCategory='all',selectedRecipe='',secondaryPinned=false;
let secondaryHideTimer:ReturnType<typeof setTimeout>|undefined;
const escapeItemText=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const slotNames:Record<GearSlot,string>={weapon:'Weapon',helmet:'Helmet',armor:'Armor',pants:'Pants',boots:'Boots',accessory:'Charm'};
const slotIcons:Record<GearSlot,string>={weapon:'swords',helmet:'gear-helmet',armor:'field-coat',pants:'gear-pants',boots:'gear-boots',accessory:'leaf-charm'};
function inventoryItem(item:Item,worn=false){const gear=item.gearId?gearById(item.gearId):undefined,rarity=gear?itemRarity(item):isCraftMaterial(item.name)?materialRarity(item):item.name===refineStones.rare.name?'rare':'common';return `<button class="item rarity-${rarity} ${worn?'equipped':''}" data-item="${escapeItemText(item.id||item.name)}" aria-label="${escapeItemText(item.name)}${gear||isCraftMaterial(item.name)?' · '+rarityLabels[rarity]:''}${worn?' · equipped':''}"><span>${itemIcon(item.name)}</span><b>${gear?'+'+(item.refine||0):item.count}</b>${worn?'<small>E</small>':''}</button>`;}
function mainStatText(item:Item,key:keyof Bonuses,value:number){const base=itemBonuses({...item,secondary:{}},false)[key]||0;const extra=Math.round((value-base)*100)/100;return `${formatStat(key,value)}${extra>0?` <small class="refine-gain">(+${formatStat(key,extra)})</small>`:''}`;}
function characterRefineAttack(){return sim.save.items.filter(i=>i.id&&Object.values(sim.save.equipped).includes(i.id)).reduce((sum,i)=>{const refined=itemBonuses({...i,secondary:{}}),base=itemBonuses({...i,secondary:{}},false);const primary=sim.save.job==='archer'?'agi':'str';return sum+(refined.atk||0)-(base.atk||0)+2*((refined[primary]||0)-(base[primary]||0));},0);}
function hideItemTooltip(){const tip=document.getElementById('item-tooltip');if(tip)tip.hidden=true;}
function secondaryStatsMarkup(){return `<div class="secondary-character-stats">${Object.entries({critChance:sim.criticalChance*100,critDamage:sim.criticalMultiplier*100,damageBonus:sim.gearBonuses.damageBonus||0,skillDamage:sim.gearBonuses.skillDamage||0,lifesteal:Math.min(25,sim.gearBonuses.lifesteal||0),hpRegen:sim.hpRegenPercent,mpRegen:.7+(sim.gearBonuses.mpRegen||0),attackSpeed:Math.min(100,sim.gearBonuses.attackSpeed||0),moveSpeed:Math.min(50,sim.gearBonuses.moveSpeed||0),armorPen:Math.min(60,sim.gearBonuses.armorPen||0),damageReduction:Math.min(60,sim.gearBonuses.damageReduction||0),dodgeChance:Math.min(35,sim.gearBonuses.dodgeChance||0),expBonus:sim.gearBonuses.expBonus||0,goldBonus:sim.gearBonuses.goldBonus||0,healingBonus:Math.min(100,sim.gearBonuses.healingBonus||0),cooldownReduction:Math.min(40,sim.gearBonuses.cooldownReduction||0)}).map(([key,value])=>`<span>${statLabels[key as keyof Bonuses]}<b>${formatStat(key as keyof Bonuses,value)}</b></span>`).join('')}</div>`;}

function renderPanel() {
  document.body.classList.toggle('hotbar-editing',panel==='skills'||panel==='inventory');
  closeGameSelect();
  hideItemTooltip();
  clearTimeout(secondaryHideTimer);
  const restoreSecondary=panel==='character'&&!$('#secondary-popover').hidden&&(secondaryPinned||!!document.querySelector('.secondary-disclosure:hover')||$('#secondary-popover').matches(':hover')||document.activeElement?.id==='secondary-info');
  if(panel!=='character')secondaryPinned=false;
  $('#secondary-popover').hidden=true;
  if (!panel) {
    $("#panel-root").innerHTML = "";
    sim.paused = false;
    return;
  }
  sim.paused = true;
  const oldScroll=document.querySelector<HTMLElement>('.panel-body')?.scrollTop||0;
  const retained=Array.from(document.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>(`[data-open-panel="${panel}"] input[id],[data-open-panel="${panel}"] select[id],[data-open-panel="${panel}"] textarea[id]`)).map(e=>({id:e.id,value:e.value,focused:document.activeElement===e}));
  const s = sim.save;
  const [ic, baseTitle] = titles[panel];
  const title=panel==="map"?sim.zone.name:baseTitle;
  let body = "";
  if (panel === "inventory") {
    const items=s.items.filter(i=>i.count && (inventoryFilter==='all'||itemCategory(i)===inventoryFilter)).sort((a,b)=>inventorySort==='count'?b.count-a.count:a.name.localeCompare(b.name)||rarityOrder.indexOf(materialRarity(a))-rarityOrder.indexOf(materialRarity(b)));
    const visible=items.slice(inventoryPage*48,inventoryPage*48+48);
    body=`<div class="panel-sub"><span>${s.items.filter(i=>i.count).length} / ${BAG_CAPACITY} slots</span><span>${icon('coins')} ${s.gold} z</span></div><div class="bag-layout"><section class="worn-equipment" aria-label="Equipped gear"><div class="section-label">EQUIPPED</div><div class="worn-grid">${gearSlots.map(slot=>{const worn=s.items.find(i=>i.id===s.equipped[slot]);return `<div class="worn-slot"><label>${slotNames[slot]}</label>${worn?inventoryItem(worn,true):`<div class="item empty worn-empty" aria-label="Empty ${slotNames[slot]}">${icon(slotIcons[slot])}</div>`}${worn?`<button class="remove-gear" data-unequip="${slot}" aria-label="Remove ${slotNames[slot]}">Remove</button>`:'<span class="empty-slot-caption">Empty</span>'}</div>`}).join('')}</div><div class="worn-summary"><span>ATK <b>${sim.damage.toFixed(0)} <small class="refine-gain">(+${Math.round(characterRefineAttack()*100)/100})</small></b></span><span>DEF <b>${sim.defense.toFixed(0)}</b></span><span>HP <b>${sim.maxHp}</b></span><span>MP <b>${sim.maxMp}</b></span></div>${sim.activeSets.map(({set,pieces})=>`<div class="set-progress">${set.name} <b>${pieces}/6</b></div>`).join('')}<p class="bag-hint">Click gear in your bag to equip.<br>Hover or focus to compare.</p></section><section class="bag-storage" aria-label="Bag storage"><div class="bag-controls"><div class="item-category-tabs" role="tablist" aria-label="Item categories">${Object.entries({all:'All',...itemCategories}).map(([id,label])=>`<button role="tab" data-bag-category="${id}" aria-selected="${inventoryFilter===id}">${label} <small>${s.items.filter(i=>i.count>0&&(id==='all'||itemCategory(i)===id)).length}</small></button>`).join('')}</div><label>Sort <select id="bag-sort"><option value="name" ${inventorySort==='name'?'selected':''}>Name</option><option value="count" ${inventorySort==='count'?'selected':''}>Quantity</option></select></label></div><div class="inventory-grid" aria-label="Page ${inventoryPage+1} · 48 slots">${visible.map(i=>inventoryItem(i,Object.values(s.equipped).includes(i.id||''))).join('')}${Array.from({length:48-visible.length},()=>'<div class="item empty" aria-hidden="true"></div>').join('')}</div><nav class="bag-pages" aria-label="Inventory pages">${[0,1,2].map(p=>`<button data-bag-page="${p}" aria-label="Inventory page ${p+1}" aria-current="${p===inventoryPage?'page':'false'}">${p+1}</button>`).join('')}<span>PAGE ${inventoryPage+1} / 3</span></nav></section></div>`;
  }
  if (panel === "character") {
    body = `<div class="character-card"><div class="portrait">${portrait}</div><div><h2>Sprout</h2><span>Level ${s.level} / ${MAX_LEVEL} · ${sim.job.name}</span><p>${sim.job.role}</p></div></div><div class="class-picker">${(Object.entries(classes) as [ClassId, (typeof classes)[ClassId]][]).map(([id, job]) => `<button data-class="${id}" aria-pressed="${s.job === id}" ${sim.target !== null ? "disabled" : ""}>${icon(job.icon)}<strong>${job.name}</strong><small>${job.role}</small></button>`).join("")}</div><div class="stat-pair"><span>Max HP <b>${sim.maxHp}</b></span><span>Max MP <b>${sim.maxMp}</b></span><span>Attack <b>${sim.damage.toFixed(1)} <small class="refine-gain">(+${Math.round(characterRefineAttack()*100)/100})</small></b></span><span>Defense <b>${sim.defense}</b></span></div><div class="secondary-disclosure"><span>Combat details</span><button id="secondary-info" class="info-button" aria-label="Show secondary stats" aria-expanded="false" aria-controls="secondary-popover">i</button></div><div class="section-label">ATTRIBUTES <span>${s.points} points available</span></div>${(["str", "vit", "agi"] as const).map((k, i) => `<div class="stat-row"><span>${[s.job === "mage" ? "Focus" : "Strength", "Vitality", "Agility"][i]}<small>${[s.job === "archer" ? "Melee strength" : "Increase attack power", "Increase health and defense", s.job === "archer" ? "Increase bow attack, attack speed and critical chance" : "Increase attack speed and critical chance"][i]}</small></span><b>${s.stats[k]}</b><button data-stat="${k}" ${s.points ? "" : "disabled"}>${icon("plus")}</button></div>`).join("")}<div class="section-label">EQUIPMENT</div>${gearSlots.map(slot=>{const item=s.items.find(i=>i.id===s.equipped[slot]);return `<div class="stat-row"><span>${slot}<small>${item?.name||'Basic class equipment'}</small></span>${item?`<button data-unequip="${slot}">Remove</button>`:''}</div>`}).join('')}<div class="panel-note">Change class outside combat. Each equipment item keeps its own refinement. Each level grants 3 attribute points. Skills unlock at levels 10, 20 … 100.</div>`;
  }
  if (panel === "skills") {
    const choices=s.skillChoices[s.job],branches=skillBranches[s.job];
    body=`<div class="panel-sub"><span>${sim.job.name.toUpperCase()} · TWO PATHS</span><span>${sim.unlockedSkills.length} / 10 learned</span></div><div class="section-label">SKILLS · KEYS 1–6</div><div class="loadout-grid">${s.hotbar.map((id,n)=>{const skill=sim.skillList.find(k=>k.id===id);return `<div class="loadout-slot" data-hotbar="${n}"><kbd>${n+1}</kbd>${icon(skill?.icon||'plus')}<strong>${skill?.name||'Empty'}</strong><small>Skills only</small>${id?`<button data-clear-skill="${n}" aria-label="Clear skill slot ${n+1}">×</button>`:''}</div>`}).join('')}</div><div class="section-label">AUXILIARY · KEYS 7–0</div><div class="auxiliary-loadout">${s.auxiliary.map((name,n)=>`<label class="auxiliary-loadout-slot" data-aux="${n}"><kbd>${[7,8,9,0][n]}</kbd>${icon(name?auxiliaryItems[name].icon:'plus')}<select id="auxiliary-${n}" aria-label="Auxiliary slot ${n+1}"><option value="">Empty</option>${Object.keys(auxiliaryItems).map(item=>`<option value="${item}" ${name===item?'selected':''}>${item} · ${s.items.find(i=>i.name===item)?.count||0}</option>`).join('')}</select></label>`).join('')}</div><p class="muted">Choose one skill at each level milestone. Mix either path; learn stages in order. Drag learned skills to 1–6. Drag recovery items or the passive EXP Charm from Bag to 7–0. EXP Charm grants EXP ×${EXP_CHARM.multiplier} while slotted; it is never consumed.</p><button id="reset-skills">Reset this class's choices · free during prototype</button><div class="skill-branch-headings"><strong>${branches[0]}</strong><strong>${branches[1]}</strong></div><div class="skill-tree">${Array.from({length:10},(_,stage)=>`<section class="skill-stage" aria-label="Skill stage ${stage+1}"><h3>STAGE ${stage+1} · LEVEL ${Math.min(...sim.skillList.filter(k=>k.stage===stage+1).map(k=>k.level))} · PICK ONE</h3><div class="skill-options">${[0,1].map(branch=>{const skill=sim.skillList.find(k=>k.stage===stage+1&&k.branch===branch)!,learned=choices[stage]===skill.id,eligible=s.level>=skill.level&&!choices[stage]&&(stage===0||!!choices[stage-1]);return `<article class="skill-card ${learned?'skill-learned':'skill-locked'}" data-skill-id="${skill.id}" draggable="${learned}"><span class="skill-art purple">${icon(skill.icon)}</span><div><h3>${skill.name} <small>LV ${skill.level}</small></h3><p>${skill.description}${['heal','guard','fury'].includes(skill.effect)?' Shares support with nearby party members.':''}</p><span>${skill.mp} MP · ${skill.cooldown}s · ${skill.range}m</span>${learned?`<strong class="learned-tag">✓ Learned</strong><div class="skill-assignment"><select aria-label="Hotbar slot for ${skill.name}" data-slot-for="${skill.id}">${[1,2,3,4,5,6].map((key,n)=>`<option value="${n}">Key ${key}</option>`).join('')}</select><button data-assign="${skill.id}">Assign</button></div>`:`<button data-learn="${skill.id}" ${eligible?'':'disabled'}>${choices[stage]?'Other path chosen':s.level<skill.level?'Requires Lv '+skill.level:stage>0&&!choices[stage-1]?'Choose previous stage':'Learn '+skill.name}</button>`}</div></article>`}).join('')}</div></section>`).join('')}</div><div class="panel-note">Six skill slots accept learned skills only. Four auxiliary slots accept recovery items and the passive EXP Charm; potions share a ${economy.potionCooldown}s cooldown. Reset outside combat after cooldowns and buffs expire. Choice progress is saved separately for each class.</div>`;
  }
  if (panel === "forge") {
    const refineItems=s.items.filter(i=>i.gearId&&gearById(i.gearId)&&i.id&&i.count===1);
    if(!refineItems.some(i=>i.id===selectedRefine))selectedRefine=refineItems.find(i=>i.id===s.equipped.weapon)?.id||refineItems[0]?.id||'';
    const refining=refineItems.find(i=>i.id===selectedRefine),current=refineLevel(refining?.refine),next=Math.min(10,current+1);
    const stoneCount=(tier:StoneTier)=>s.items.find(i=>i.name===refineStones[tier].name)?.count||0;
    const ready=refining&&current<refinement.cap&&stoneCount(selectedStone)>0&&s.gold>=refineCost(current);
    const preview=refining?Object.entries(itemBonuses({...refining,secondary:{}})).map(([key,val])=>`<span>${statLabels[key as keyof Bonuses]} <b>${mainStatText(refining,key as keyof Bonuses,val)} → ${mainStatText({...refining,refine:next},key as keyof Bonuses,itemBonuses({...refining,refine:next,secondary:{}})[key as keyof Bonuses]||0)}</b></span>`).join(''):'';
    const stoneRecipe={...gearById('sprout-blade')!,id:'rare-refine-stone',name:refineStones.rare.name,icon:refineStones.rare.icon,slot:'material' as const,job:undefined,level:1,rarity:'rare' as const,bonuses:{},cost:0,materials:[[refineStones.common.name,refinement.stoneCraftCount]] as [string,number][],description:`Combine ${refinement.stoneCraftCount} Common stones into 1 Rare stone. No zeny cost.`};
    const recipes=[...equipment.filter(g=>!g.job||g.job===s.job).map(g=>({...g,rarity:selectedCraftRarity,materials:gearRecipe(g),cost:craftCost(g),bonuses:itemBonuses({gearId:g.id,rarity:selectedCraftRarity},false)})),stoneRecipe];
    const categories=[['weapon','Weapons'],['helmet','Helmets'],['armor','Armor'],['pants','Pants'],['boots','Boots'],['accessory','Charms'],['material','Materials']] as const;
    const visible=recipes.filter(g=>craftCategory==='all'||g.slot===craftCategory);
    if(!visible.some(g=>g.id===selectedRecipe))selectedRecipe=visible[0]?.id||'';
    const recipe=visible.find(g=>g.id===selectedRecipe);
    const ownedMaterial=(name:string)=>isCraftMaterial(name)?materialCount(s.items,name,selectedCraftRarity):s.items.find(i=>i.name===name)?.count||0;
    const freed=recipe?.materials.reduce((n,[name,count])=>n+s.items.filter(i=>i.count>0&&i.name===name&&(!isCraftMaterial(name)||materialRarity(i)===selectedCraftRarity)&&i.count<=count).length,0)||0;
    const enough=recipe&&s.level>=recipe.level&&s.gold>=recipe.cost&&(s.items.filter(i=>i.count>0).length-freed<BAG_CAPACITY||recipe.slot==='material'&&stoneCount('rare')>0)&&recipe.materials.every(([name,count])=>ownedMaterial(name)>=count);
    body=`<section class="refine-system" aria-label="Equipment refinement"><div class="section-label">REFINE EQUIPMENT · MAX +${refinement.cap}</div><label class="refine-selection">Equipment <select id="refine-item">${refineItems.length?refineItems.map(i=>`<option value="${i.id}" ${i.id===selectedRefine?'selected':''}>${escapeItemText(i.name)} +${refineLevel(i.refine)} · ${slotNames[gearById(i.gearId!)!.slot]}</option>`).join(''):'<option value="">Craft or collect equipment first</option>'}</select></label><div class="refine-stones">${(['common','rare'] as const).map(tier=>`<button data-refine-stone="${tier}" aria-pressed="${selectedStone===tier}">${icon(refineStones[tier].icon)}<strong>${tier==='common'?'Common':'Rare'}</strong><small>${stoneCount(tier)} owned · ${tier==='rare'?refinement.rareMultiplier+'×':'1×'} success</small></button>`).join('')}</div><div class="refine-summary"><strong>${refining?escapeItemText(refining.name):'No equipment selected'} · +${current}${current<refinement.cap?' → +'+next:' · MAX'}</strong><span>Total base-stat bonus: +${refineBonus(current)}%${current<refinement.cap?' → +'+refineBonus(next)+'%':''}</span><b class="refine-odds">Success: ${Math.round(refineChance(current,selectedStone)*100)}%</b><p>${current>=refinement.cap?'This item is fully refined.':`On failure: ${Math.round(refinement.downgradeChance*100)}% chance to ${selectedStone==='common'?'reset to +0':'drop to +'+Math.max(0,current-refinement.rareDowngradeLevels)}. Otherwise it stays +${current}.`}</p><div class="equipment-compare refine-preview">${preview}</div></div><button class="primary-button" id="refine" aria-label="Refine equipment" ${ready?'':'disabled'}>${current>=refinement.cap?'Maximum +'+refinement.cap:'Refine · 1 '+(selectedStone==='common'?'Common':'Rare')+' stone + '+refineCost(current)+' z'}</button><details class="refine-rates"><summary>Level bonuses & success rates</summary><table><thead><tr><th>Level</th><th>Added</th><th>Total</th><th>Common</th><th>Rare</th></tr></thead><tbody>${refineSuccess.map((chance,i)=>`<tr><td>+${i+1}</td><td>+${refineBonus(i+1)-refineBonus(i)}%</td><td>+${refineBonus(i+1)}%</td><td>${Math.round(chance*100)}%</td><td>${Math.round(Math.min(1,chance*refinement.rareMultiplier)*100)}%</td></tr>`).join('')}</tbody></table></details><p class="bag-hint">Each attempt consumes one stone and zeny, including failures. Secondary affixes are unchanged.</p></section><section class="material-upgrades" aria-label="Material upgrades"><div class="section-label">UPGRADE MATERIALS · ${craftingConfig.upgradeCount} → 1</div>${craftingMaterials.map(name=>`<div class="material-upgrade-row">${itemIcon(name)}<strong>${name}</strong>${rarityOrder.slice(0,-1).map(r=>{const next=rarityOrder[rarityOrder.indexOf(r)+1],owned=materialCount(s.items,name,r);return `<button data-material-upgrade="${name}" data-material-rarity="${r}" ${owned<craftingConfig.upgradeCount?'disabled':''}>${rarityLabels[r]} (${owned}) → ${rarityLabels[next]}</button>`}).join('')}<small>Legend: ${materialCount(s.items,name,'legend')} · maximum</small></div>`).join('')}<p class="bag-hint">All monsters and bosses in every area can drop these materials. Upgrades require the same material and rarity.</p></section><div class="section-label">CRAFT EQUIPMENT <span>${s.gold} z</span></div><nav class="craft-tabs" aria-label="Craft rarity">${rarityOrder.map(r=>`<button data-craft-rarity="${r}" aria-pressed="${selectedCraftRarity===r}">${rarityLabels[r]}</button>`).join('')}</nav><nav class="craft-tabs" aria-label="Craft categories">${[['all','All'],...categories].map(([id,label])=>`<button data-craft-category="${id}" aria-pressed="${craftCategory===id}">${label}<small>${id==='all'?recipes.length:recipes.filter(g=>g.slot===id).length}</small></button>`).join('')}</nav><div class="craft-layout"><div class="craft-catalog">${categories.filter(([id])=>craftCategory==='all'||craftCategory===id).map(([id,label])=>{const group=visible.filter(g=>g.slot===id);return `<section class="craft-group" aria-label="${label}"><h3>${label}</h3><div class="craft-grid inventory-grid">${group.map(g=>`<button class="item rarity-${g.rarity} ${g.id===selectedRecipe?'selected-recipe':''} ${s.level<g.level?'level-locked':''}" data-recipe="${g.id}" aria-label="${g.name} · Lv ${g.level}" aria-pressed="${g.id===selectedRecipe}" title="${g.name}">${icon(g.icon)}<b>${g.level}</b></button>`).join('')}${Array.from({length:(8-group.length%8)%8},()=>'<div class="item empty" aria-hidden="true"></div>').join('')}</div></section>`}).join('')}<p class="bag-hint">Select a recipe to inspect its stats and materials.<br>Monster-drop sets can be found through the Bag tooltips.</p></div><aside class="craft-details" aria-label="Recipe details">${recipe?`<div class="recipe-title">${icon(recipe.icon)}<strong>${recipe.name}</strong><small>${rarityLabels[recipe.rarity]} · ${recipe.slot==='material'?'Material':slotNames[recipe.slot]} · Lv ${recipe.level}</small></div><p>${recipe.description}</p><div class="tooltip-section">MAIN STATS</div><div class="equipment-compare">${Object.entries(recipe.bonuses).map(([key,val])=>`<span>${statLabels[key as keyof Bonuses]}<b>+${formatStat(key as keyof Bonuses,val)}</b></span>`).join('')}</div><small class="recipe-affixes">${recipe.slot==='material'?'Refining material':recipe.rarity==='common'?'No secondary affixes':'Random secondary affixes: '+equipmentConfig.secondaryCounts[recipe.rarity]}</small><div class="tooltip-section">MATERIALS</div><div class="recipe-materials">${recipe.materials.map(([name,count])=>{const owned=ownedMaterial(name);return `<div class="recipe-material ${owned>=count?'ready':''}">${itemIcon(name)}<span>${name}${isCraftMaterial(name)?' · '+rarityLabels[selectedCraftRarity]:''}</span><b>${owned}/${count}</b></div>`}).join('')}</div><button class="primary-button" data-craft="${recipe.id}" ${enough?'':'disabled'}>Craft · ${recipe.slot==='material'?refinement.stoneCraftCount+' Common → 1 Rare':recipe.cost+' z'}</button><p class="craft-requirement">${s.level<recipe.level?'Requires Lv '+recipe.level:!enough?'Gather materials, zeny and a free bag slot.':'Ready to craft'}</p>`:'<p>No recipes in this category.</p>'}</aside></div>`;
  }
  if (panel === "shop") {
    body = `<p class="muted">A few essentials for the road ahead.</p>${[
      ["Red potion", "🧪", economy.redPotion.cost, `Restores ${economy.redPotion.heal} HP`],
      ["Blue potion", "💠", economy.bluePotion.cost, `Restores ${economy.bluePotion.heal} MP`],
    ]
      .map(
        ([name, _emoji, cost, desc]) =>
          `<div class="shop-row"><span>${itemIcon(String(name))}</span><div><h3>${name}</h3><small>${desc}</small></div><button data-buy="${name}">Buy · ${cost} z</button></div>`,
      )
      .join(
        "",
      )}<div class="section-label">SELL GATHERED MATERIALS</div><button id="sell" class="primary-button">Sell all monster drops · 6 z each</button><div class="panel-note">Your wallet: ${s.gold} z</div>`;
  }
  if (panel === "map") {
    body = `<canvas id="large-map" width="480" height="360"></canvas><div class="map-legend" style="flex-wrap:wrap"><span><i style="background:#edce78"></i>You</span><span><i style="background:#ff596d"></i>Monsters</span><span><i style="background:#ffbf45;border-radius:0;transform:rotate(45deg)"></i>Boss</span><span><i style="background:#c997ff;border-radius:0;transform:rotate(45deg)"></i>Mini-boss</span><span><i style="background:#8decd3"></i>Camp</span></div><p class="muted center">Click the map to walk. Reach the glowing north portal to change area.</p><div class="area-list">${(Object.entries(zones) as [ZoneId,(typeof zones)[ZoneId]][]).map(([id,zone])=>`<article><h3>${zone.name} <small>${id==='town'?'SAFE CENTER':id==='ruins'?'PARTY DUNGEON':'Lv '+zone.level+'–'+zone.maxLevel}</small></h3><p>${zone.description}</p><div class="area-materials">${zone.species.map(kind=>`<span>${kind} · ${catalogSpecies[kind].drop}</span>`).join('')}</div><button data-travel="${id}" ${id===s.zone||s.level<zone.level?'disabled':''}>${id===s.zone?'Current area':s.level<zone.level?'Reach Lv '+zone.level:'Travel'}</button></article>`).join('')}</div>`;
  }
  if(panel==='journal') {
    const steps=[['move','Walk with WASD or click the ground.'],['attack','Select a creature and defeat it. Read the red windup and step away.'],['collect','Walk to a drop and press F to collect it.'],['talk','Speak to an NPC near the north camp or in Sprout Town.'],['craft','Open Forge, gather a recipe’s materials and craft equipment.'],['equip','Open Bag and equip what you crafted.'],['refine','Refine your weapon at the forge.'],['travel','Use the north portal to visit a new area.'],['skill','Reach Lv10, assign your first skill, and use it.']];
    body=`<h3>Learn by adventuring</h3><ol class="tutorial-steps">${steps.map(([id,text])=>`<li class="${s.tutorial.includes(id)?'done':''}">${s.tutorial.includes(id)?'✓ ':''}${text}</li>`).join('')}</ol><button id="skip-tutorial">${s.tutorial.includes('skip')?'Show tutorial hints':'Hide tutorial hints'}</button><div class="section-label">QUEST BOARD</div>${questDefinitions.map(q=>{const state=s.quests[q.id]||{progress:0,claimed:false};return `<article class="quest-card"><h3>${q.name}</h3><p>${q.description}</p><strong>${state.progress}/${q.target}</strong><small>Reward ${q.gold} z · ${q.xp} EXP · ${q.count} ${q.item}</small><button data-claim-quest="${q.id}" ${state.claimed||state.progress<q.target?'disabled':''}>${state.claimed?'Completed':'Claim reward'}</button></article>`}).join('')}`;
  }
  if (panel === "help") {
    body = `<button id="open-journal" class="primary-button">Quest board & tutorial</button><div class="handbook-intro">A little world.<br><em>A grand adventure.</em></div><p class="muted">Explore the Moonlit Glade, defeat creatures, gather materials, and grow stronger.</p><div class="help-rows">${[
      ["Mouse", "Click ground to walk; click a monster to attack"],
      ["W A S D", "Move your character"],
      ["Tab / Space", "Select the nearest monster / attack"],
      ["1–6", "Assigned class skills (unlock every 10 levels)"],
      ["7 / 8", "Health potion / Mana potion"],
      ["F", "Pick up nearby drops"],
      ["I / K / C", "Inventory / Skills / Character"],
      ["M / Esc", "Map / close window"],
      ["Mouse wheel", "Zoom camera"],
    ]
      .map(([key, desc]) => `<div><kbd>${key}</kbd><span>${desc}</span></div>`)
      .join(
        "",
      )}</div><div class="panel-note">${sim.online ? "Online realm. Progress is saved on the server. The world continues while windows are open." : "Practice mode. Progress is saved in this browser. Opening a window pauses the world."} Respawns: regular monsters 13 seconds · mini-bosses 60 seconds · bosses 180 seconds.</div>`;
  }
  if (panel === 'admin') {
    body=sim.admin?`<p class="panel-note">Testing tools · items are generated and saved by the server. Every grant is recorded.</p><form id="spawn-form"><label>Category <select id="spawn-category">${Object.entries(itemCategories).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><label>Item <select id="spawn-item"></select></label><div id="spawn-preview"></div><label>Quantity <input id="spawn-count" type="number" min="1" max="20" value="1" required></label><div id="spawn-equipment"><label>Rarity <select id="spawn-rarity">${rarityOrder.map(r=>`<option value="${r}">${rarityLabels[r]}</option>`).join('')}</select></label><label>Refinement <input id="spawn-refine" type="number" min="0" max="10" value="0" required></label></div><button class="primary-button" type="submit">${icon('chest')} Spawn into my bag</button></form><button data-panel="inventory">Open inventory</button>`:'<p>Admin access required.</p>';
  }
  if (panel === "operations") {
    body = `<p>Inspect progression, bug reports and economy transactions. Restore and balance changes require the realm to be in maintenance.</p><button id="backup-realm">Create server backup</button><button id="export-realm">Export current realm</button><button id="maintenance-on">Pause realm for maintenance</button><button id="maintenance-off">Reopen realm</button><h3>Recovery</h3><select id="restore-backup"><option>Loading backups…</option></select><button id="restore-realm">Restore selected backup</button><h3>Monster balance</h3><select id="balance-kind">${Object.keys(catalogSpecies).map(k=>`<option>${k}</option>`).join('')}</select><select id="balance-stat">${['hp','atk','defense','xp','gold'].map(k=>`<option>${k}</option>`).join('')}</select><input id="balance-value" type="number" min="0" value="100"><button id="update-balance">Apply monster value</button><pre id="operations-report">Loading realm report…</pre>`;
  }
  if(panel==='community') {
    const c=sim.community,party=c?.party,trade=c?.trade;
    body=!c?'<p>Sign in to the online realm to play with other adventurers.</p>':`<h3>${party?'Your party · '+party.members.length+'/'+economy.party.maxMembers:'Find your adventuring party'}</h3><p>Nearby party members share EXP and gold equally. Material drops rotate between members. Level ${economy.party.dungeonLevel}+ parties of ${economy.party.dungeonMinMembers}–${economy.party.maxMembers} can enter Rootheart Ruins through the north portal.</p>${party?`<div class="party-members">${party.members.map(p=>`<span>${p.name} · Lv ${p.level} · ${p.online?'Online':'Offline'}</span>`).join('')}</div><button data-community="partyLeave">Leave party</button>`:'<button data-community="partyCreate">Create party</button>'}<h3>Nearby adventurers</h3>${sim.remotePlayers.map(p=>`<div class="community-row"><b>${p.name}</b><button data-community="partyInvite" data-id="${p.id}">Invite</button><button data-community="friendRequest" data-id="${p.id}">Friend</button><button data-community="tradeInvite" data-id="${p.id}">Trade</button></div>`).join('')||'<p>Other players in this area will appear here.</p>'}${c.invitations.map(i=>`<div class="community-row">${i.leader.name} invited you <button data-community="partyAccept" data-id="${i.id}">Join</button></div>`).join('')}<h3>Friends</h3>${c.friends.map(p=>`<div class="community-row">${p.name} · ${p.online?'Online':'Offline'} <button data-community="friendRemove" data-id="${p.id}">Remove</button></div>`).join('')||'<p>No friends yet.</p>'}${c.requests.map(p=>`<div class="community-row">${p.name} sent a request <button data-community="friendAccept" data-id="${p.id}">Accept</button></div>`).join('')}${trade?`<h3>Trade</h3><p>Both players set an offer and confirm it. Changing either offer clears both confirmations. Stay nearby until the exchange completes.</p>${!trade.accepted?(trade.players[1]===c.self?`<button data-community="tradeAccept" data-id="${trade.id}">Accept trade request</button>`:'<p>Waiting for the invited player to accept.</p>'):`<div class="trade-offers">${trade.players.map(id=>{const o=trade.offers[id];return `<p>${id===c.self?'You':'Partner'}: ${o?`${o.count} × ${trade.offeredItems[id]?.name||'Gold only'}${trade.offeredItems[id]&&isCraftMaterial(trade.offeredItems[id]!.name)?' · '+rarityLabels[materialRarity(trade.offeredItems[id]!)]:''} · ${o.gold} z`:'No offer'} ${trade.confirmed.includes(id)?'✓ Confirmed':''}</p>`}).join('')}</div><label>Item <select id="trade-item"><option value="">Gold only</option>${s.items.filter(i=>i.count&&!Object.values(s.equipped).includes(i.id||'')).map(i=>`<option value="${i.id||i.name}">${i.name}${isCraftMaterial(i.name)?' · '+rarityLabels[materialRarity(i)]:''} × ${i.count}</option>`).join('')}</select></label><label>Quantity <input id="trade-count" type="number" min="0" value="1"></label><label>Gold <input id="trade-gold" type="number" min="0" value="0"></label><button id="set-trade-offer" data-id="${trade.id}">Set offer</button><button data-community="tradeConfirm" data-id="${trade.id}">Confirm exchange</button>`}<button data-community="tradeCancel" data-id="${trade.id}">Cancel trade</button>`:''}`;
  }
  if(panel==='market') {
    const c=sim.community;
    body=!c?'<p>The player market is available in the online realm.</p>':`<h3>Trade with adventurers</h3><p>Listed items are held by the server. Completed sales have a ${Math.round(economy.marketFee*100)}% gold fee. Cancel your listing to reclaim its item.</p><label>Item <select id="market-item">${s.items.filter(i=>i.count&&!Object.values(s.equipped).includes(i.id||'')).map(i=>`<option value="${i.id||i.name}">${i.name}${isCraftMaterial(i.name)?' · '+rarityLabels[materialRarity(i)]:''} × ${i.count}</option>`).join('')}</select></label><label>Quantity <input id="market-count" type="number" min="1" value="1"></label><label>Total price <input id="market-price" type="number" min="1" value="20"></label><button id="list-market">List item</button><div class="recipe-list">${c.listings.map(l=>`<article class="recipe-card">${itemIcon(l.item.name)}<div><h3>${l.item.name} × ${l.item.count}</h3><small>${l.sellerName} · ${l.price} z${l.item.gearId?' · '+rarityLabels[itemRarity(l.item)]+' · +'+(l.item.refine||0):isCraftMaterial(l.item.name)?' · '+rarityLabels[materialRarity(l.item)]:''}</small></div><button data-community="${l.seller===c.self?'marketCancel':'marketBuy'}" data-id="${l.id}">${l.seller===c.self?'Cancel':'Buy'}</button></article>`).join('')||'<p>The market is empty. List the first item!</p>'}</div>`;
  }
  if(panel==='report')body='<p>Describe what happened and what you expected. The report includes your character and area.</p><textarea id="bug-text" maxlength="500" rows="5" aria-label="Bug description"></textarea><button id="submit-bug">Send bug report</button>';
  if (panel === "settings") {
    body = `<h3>Make yourself at home.</h3><div class="setting-row"><span>Sound effects</span><button id="sfx-panel">${feedback.enabled ? "On" : "Off"}</button></div><div class="setting-row"><span>Ambient music</span><button id="sound-panel">${music ? "On" : "Off"}</button></div><div class="setting-row"><span>Graphics quality</span><select id="graphics-quality">${["auto","high","low"].map(q=>`<option ${world.quality===q?"selected":""}>${q}</option>`).join("")}</select></div><div class="setting-row"><span>Camera zoom</span><input id="zoom" type="range" min="0.65" max="1.6" step="0.05" value="${world.zoom}" aria-label="Camera zoom"></div><div class="panel-note">Graphics: ${world.diagnostics.drawCalls} draw calls · ${world.diagnostics.fps.toFixed(0)} FPS · p95 ${world.diagnostics.frameP95.toFixed(1)} ms</div>${sim.admin ? '<button data-panel="admin" class="primary-button">Admin: spawn items</button><button id="realm-tools" class="primary-button">Realm operations</button>' : ""}<button data-panel="report">Report a bug</button><button id="save-now" class="primary-button">${icon("save")} ${sim.online ? "Check server connection" : "Save adventure"}</button><div class="panel-note">Mossvale v0.4 · Babylon.js alpha<br>Playable heroes: KayKit Adventurers by Kay Lousberg (CC0).<br>World and monsters: original project-authored assets.<br>${sim.online ? "Server-authoritative realm · Sites account" : "Practice mode · local save"}</div>`;
  }
  $("#panel-root").innerHTML =
    `<div class="panel-backdrop"></div><section data-open-panel="${panel}" class="game-panel ${panel === "map" ? "wide" : panel === "inventory" ? "bag-panel" : panel === "forge" ? "craft-panel" : panel === "skills" ? "skills-panel" : ""}" role="dialog" aria-modal="true" aria-label="${title}"><div class="panel-heading">${icon(ic)}<h2>${title}</h2><span>${sim.online ? "LIVE" : "PAUSED"}</span><button id="close-panel" aria-label="Close window">${icon("x")}</button></div><div class="panel-body">${body}</div><div class="panel-footer">${icon("sparkles")} MOSSVALE <span>ESC to return to adventure</span></div></section>`;
  for(const retainedInput of retained){const element=document.getElementById(retainedInput.id) as HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|null;if(element){element.value=retainedInput.value;if(retainedInput.focused)element.focus();}}
  document.querySelectorAll<HTMLElement>(".game-panel [data-panel]").forEach(b=>b.onclick=()=>openPanel(b.dataset.panel!));
  $("#close-panel").onclick = closePanel;
  $(".panel-backdrop").onclick = closePanel;
  document.querySelectorAll<HTMLElement>("[data-stat]").forEach(
    (b) =>
      (b.onclick = () => {
        sim.stat(b.dataset.stat as "str" | "vit" | "agi");
        renderPanel();
      }),
  );
  if(panel==='inventory') {
    document.querySelectorAll<HTMLElement>('[data-bag-category]').forEach(b=>b.onclick=()=>{inventoryFilter=b.dataset.bagCategory!;inventoryPage=0;renderPanel()});
    $('#bag-sort').onchange=e=>{inventorySort=(e.target as HTMLSelectElement).value;renderPanel()};
    document.querySelectorAll<HTMLElement>('[data-bag-page]').forEach(button=>button.onclick=()=>{inventoryPage=Number(button.dataset.bagPage);renderPanel()});
    document.querySelectorAll<HTMLElement>('[data-item]').forEach(button=>{
      const item=s.items.find(i=>(i.id||i.name)===button.dataset.item)!,gear=item.gearId?gearById(item.gearId):undefined;
      if(isAuxiliaryItem(item.name)){button.draggable=true;button.ondragstart=e=>{document.body.classList.add('dragging-hotbar');e.dataTransfer?.setData('application/x-mossvale-item',item.name);hideItemTooltip()};}
      let tipWidth=0,tipHeight=0;
      const position=(x:number,y:number)=>{const tip=$('#item-tooltip');tip.style.left=`${Math.max(8,Math.min(innerWidth-tipWidth-8,x+16))}px`;tip.style.top=`${Math.max(8,Math.min(innerHeight-tipHeight-8,y+16))}px`;};
      const show=(event?:MouseEvent)=>{
        const tip=$('#item-tooltip');
        if(gear){const rarity=itemRarity(item),bonuses=itemBonuses(item,true),worn=s.items.find(i=>i.id===s.equipped[gear.slot]),current=worn?itemBonuses(worn,true):{};
          const rows=Object.entries(bonuses).map(([key,value])=>{const stat=key as keyof Bonuses,difference=value-(current[stat]||0);return `<span>${statLabels[stat]} <b>+${formatStat(stat,value)}</b><em class="${difference>=0?'positive':'negative'}">${difference>=0?'+':''}${formatStat(stat,difference)}</em></span>`}).join('');
          const lost=Object.entries(current).filter(([key])=>!(key in bonuses)).map(([key,value])=>`<span>${statLabels[key as keyof Bonuses]} <b>0</b><em class="negative">−${formatStat(key as keyof Bonuses,value)}</em></span>`).join('');
          const set=gearSets.find(set=>set.id===gear.setId),sources=set?`Monsters Lv ${set.level===10?'1–29':set.level+'–'+(set.level===90?'100':set.level+19)}${set.level===90?' · FrostWolf & Rootheart Ruins':''}`:'Craft at the forge';
          tip.className=`item-tooltip rarity-${rarity}`;tip.innerHTML=`<div class="tooltip-title">${icon(gear.icon)}<div><strong>${escapeItemText(item.name)} +${item.refine||0}</strong><small>${rarityLabels[rarity]} · ${slotNames[gear.slot]} · Lv ${gear.level}${gear.job?' · '+classes[gear.job].name:''}</small></div></div><p>${escapeItemText(gear.description)}</p><small>Refinement +${refineLevel(item.refine)} · Total base-stat bonus +${refineBonus(item.refine||0)}%</small><div class="tooltip-section">MAIN STATS</div><div class="equipment-compare">${Object.entries(itemBonuses({...item,secondary:{}},true)).map(([key,value])=>`<span>${statLabels[key as keyof Bonuses]} <b>${mainStatText(item,key as keyof Bonuses,value)}</b></span>`).join('')}</div><div class="tooltip-section">SECONDARY STATS · ${Object.keys(item.secondary||{}).length}</div><div class="equipment-compare secondary-stats">${Object.entries(item.secondary||{}).map(([key,value])=>`<span>${statLabels[key as keyof Bonuses]} <b>+${formatStat(key as keyof Bonuses,value)}</b></span>`).join('')||'<span>No secondary stats</span>'}</div><div class="tooltip-section">vs equipped · ${worn?escapeItemText(worn.name):'empty slot'}</div><div class="equipment-compare">${rows}${lost}</div>${set?`<div class="tooltip-section">${set.name} SET · ${sim.activeSets.find(s=>s.set.id===set.id)?.pieces||0}/6</div>${[2,4,6].map(pieces=>`<small class="set-bonus">${pieces} pieces: ${Object.entries(setBonuses(set.id,pieces)).filter(([key,value])=>value!==(setBonuses(set.id,pieces-2)[key as keyof Bonuses]||0)).map(([key,value])=>statLabels[key as keyof Bonuses]+' +'+formatStat(key as keyof Bonuses,value)).join(' · ')}</small>`).join('')}`:''}<small class="drop-source">${sources}</small><p class="tooltip-instruction">${s.equipped[gear.slot]===item.id?'Currently equipped':s.level<gear.level?'Requires level '+gear.level:gear.job&&gear.job!==s.job?'Requires '+classes[gear.job].name:'Click to equip'}</p>`;
        } else {const sources=(Object.keys(catalogSpecies) as (keyof typeof catalogSpecies)[]).filter(k=>catalogSpecies[k].drop===item.name);tip.className='item-tooltip rarity-'+(isCraftMaterial(item.name)?materialRarity(item):item.name===refineStones.rare.name?'rare':'common');tip.innerHTML=`<div class="tooltip-title">${itemIcon(item.name)}<strong>${escapeItemText(item.name)}${isCraftMaterial(item.name)?' · '+rarityLabels[materialRarity(item)]:''}</strong></div><p>${isCraftMaterial(item.name)?`Craft equipment of the same rarity. Combine ${craftingConfig.upgradeCount} identical materials of the same rarity to upgrade; Legend is maximum.`:item.name===refineStones.common.name?`Used for normal refinement. Craft ${refinement.stoneCraftCount} into 1 Rare stone.`:item.name===refineStones.rare.name?`Multiplies success chance by ${refinement.rareMultiplier} (up to 100%). A downgrade after failure loses ${refinement.rareDowngradeLevels} level(s).`:item.name===EXP_CHARM.name?`Passive: gameplay EXP ×${EXP_CHARM.multiplier} while equipped in any auxiliary slot. Does not stack or consume.`:item.name===EXP_TOME.name?`Grants ${EXP_TOME.experience.toLocaleString()} EXP. Kept at level 100.`:descriptions[item.name]||'A crafting material.'}</p><small>${isCraftMaterial(item.name)||item.name.includes('refine stone')?'Dropped by all monsters and bosses':item.name===EXP_TOME.name?'Admin testing item':sources.length?'Dropped by: '+sources.join(', '):'Available from merchants and quests'}</small>${item.name===EXP_CHARM.name?'<p class="tooltip-instruction">Click to equip · drag to auxiliary slots 7–0</p>':itemCategory(item)==='consumable'?'<p class="tooltip-instruction">Click to use</p>':''}`;}
        tip.hidden=false;const bounds=tip.getBoundingClientRect();tipWidth=bounds.width;tipHeight=bounds.height;const anchor=button.getBoundingClientRect();position(event?.clientX??anchor.right,event?.clientY??anchor.top);
      };
      button.onmouseenter=show;button.onmousemove=event=>position(event.clientX,event.clientY);button.onmouseleave=hideItemTooltip;button.onfocus=()=>show();button.onblur=hideItemTooltip;
      button.onclick=()=>{if(gear){if(s.equipped[gear.slot]!==item.id)sim.equip(item.id!);}else if(item.name===EXP_CHARM.name){const slot=s.auxiliary.includes(item.name)?s.auxiliary.indexOf(item.name):s.auxiliary.indexOf(null);if(slot>=0)sim.assignAuxiliary(slot,item.name);else sim.onEvent('Choose an auxiliary slot in Skills for EXP Charm.');refreshHotbar();}else if(itemCategory(item)==='consumable')sim.useItem(item.name);renderPanel();};
    });
    document.querySelector('.panel-body')?.addEventListener('scroll',hideItemTooltip,{passive:true});
  }
  document.querySelectorAll<HTMLElement>('[data-craft-rarity]').forEach(b=>b.onclick=()=>{selectedCraftRarity=b.dataset.craftRarity as typeof selectedCraftRarity;renderPanel()});
  document.querySelectorAll<HTMLElement>('[data-material-upgrade]').forEach(b=>b.onclick=()=>{sim.upgradeMaterial(b.dataset.materialUpgrade!,b.dataset.materialRarity as typeof selectedCraftRarity);renderPanel()});
  document.querySelectorAll<HTMLElement>('[data-craft-category]').forEach(b=>b.onclick=()=>{craftCategory=b.dataset.craftCategory!;selectedRecipe='';renderPanel()});
  document.querySelectorAll<HTMLElement>('[data-recipe]').forEach(b=>b.onclick=()=>{selectedRecipe=b.dataset.recipe!;renderPanel()});
  if(panel==='character'){
    const button=$('#secondary-info'),popover=$('#secondary-popover'),wrap=button.parentElement!;
    popover.innerHTML=`<div class="section-label">SECONDARY STATS</div>${secondaryStatsMarkup()}<p>HP regeneration is based on Max HP. Base: ${progression.hpRegenPercent}%/s.</p>`;
    const show=(visible:boolean)=>{popover.hidden=!visible;button.setAttribute('aria-expanded',String(visible));if(visible){const anchor=button.getBoundingClientRect(),bounds=popover.getBoundingClientRect();const top=anchor.bottom+8+bounds.height<=innerHeight-8?anchor.bottom+8:Math.max(8,anchor.top-bounds.height-8);popover.style.top=top+'px';popover.style.left=Math.max(8,Math.min(innerWidth-bounds.width-8,anchor.right-bounds.width))+'px';}};
    button.onmouseenter=()=>show(true);button.onfocus=()=>show(true);
    const hideSoon=()=>{clearTimeout(secondaryHideTimer);secondaryHideTimer=setTimeout(()=>{if(!secondaryPinned&&!wrap.matches(':hover')&&!popover.matches(':hover'))show(false)},150)};
    wrap.onmouseleave=hideSoon;popover.onmouseleave=hideSoon;popover.onmouseenter=()=>clearTimeout(secondaryHideTimer);
    wrap.addEventListener('focusout',e=>{if(!secondaryPinned&&!wrap.contains(e.relatedTarget as Node))show(false)});
    button.onclick=()=>{secondaryPinned=!secondaryPinned;show(secondaryPinned)};
    if(restoreSecondary||secondaryPinned)show(true);
  }
  document.querySelectorAll<HTMLElement>('[data-craft]').forEach(b=>b.onclick=()=>{sim.craft(b.dataset.craft!,selectedCraftRarity);renderPanel()});
  document.querySelectorAll<HTMLElement>('[data-unequip]').forEach(b=>b.onclick=()=>{sim.unequip(b.dataset.unequip as GearSlot);renderPanel()});
  document.querySelectorAll<HTMLElement>('[data-travel]').forEach(b=>b.onclick=()=>{if(sim.travel(b.dataset.travel as ZoneId))closePanel()});
  document.querySelectorAll<HTMLElement>('[data-claim-quest]').forEach(b=>b.onclick=()=>{sim.claimQuest(b.dataset.claimQuest!);renderPanel()});
  if(panel==='report')$('#submit-bug').onclick=()=>{sim.communityAction('reportBug',($('#bug-text') as HTMLTextAreaElement).value);closePanel()};
  document.querySelectorAll<HTMLElement>('[data-community]').forEach(b=>b.onclick=()=>sim.communityAction(b.dataset.community!,...(b.dataset.id?[b.dataset.id]:[])));
  if(document.getElementById('set-trade-offer'))$('#set-trade-offer').onclick=()=>{const item=($('#trade-item') as HTMLSelectElement).value;sim.communityAction('tradeOffer',$('#set-trade-offer').dataset.id,{item,count:item?Number(($('#trade-count') as HTMLInputElement).value):0,gold:Number(($('#trade-gold') as HTMLInputElement).value)});};
  if(document.getElementById('list-market'))$('#list-market').onclick=()=>sim.communityAction('marketList',($('#market-item') as HTMLSelectElement).value,Number(($('#market-count') as HTMLInputElement).value),Number(($('#market-price') as HTMLInputElement).value));
  if(panel==='journal')$('#skip-tutorial').onclick=()=>{sim.toggleTutorial();renderPanel()};
  if (panel === "forge")
    $("#refine-item").onchange=e=>{selectedRefine=(e.target as HTMLSelectElement).value;renderPanel()};
  document.querySelectorAll<HTMLElement>('[data-refine-stone]').forEach(b=>b.onclick=()=>{selectedStone=b.dataset.refineStone as StoneTier;renderPanel()});
  if(panel==='forge') $("#refine").onclick = () => {
      sim.upgrade(selectedRefine,selectedStone);
      renderPanel();
    };
  document.querySelectorAll<HTMLElement>("[data-class]").forEach(
    (button) =>
      (button.onclick = () => {
        sim.setClass(button.dataset.class as ClassId);
        renderPanel();
        refreshHotbar();
      }),
  );
  document.querySelectorAll<HTMLElement>('[data-learn]').forEach(button=>button.onclick=()=>{sim.chooseSkill(button.dataset.learn!);renderPanel();refreshHotbar()});
  document.querySelectorAll<HTMLElement>('[data-clear-skill]').forEach(button=>button.onclick=()=>{sim.assignSkill(Number(button.dataset.clearSkill),'');renderPanel();refreshHotbar()});
  if(panel==='skills'){
    $('#reset-skills').onclick=()=>{sim.resetSkills();renderPanel();refreshHotbar()};
    for(let n=0;n<4;n++)$('#auxiliary-'+n).onchange=e=>{sim.assignAuxiliary(n,(e.target as HTMLSelectElement).value||null);refreshHotbar()};
  }
  document.querySelectorAll<HTMLElement>("[data-assign]").forEach(
    (button) =>
      (button.onclick = () => {
        const id = button.dataset.assign!;
        const select = document.querySelector<HTMLSelectElement>(
          `[data-slot-for="${id}"]`,
        )!;
        if (sim.assignSkill(Number(select.value), id)) {
          renderPanel();
          refreshHotbar();
        }
      }),
  );
  document.querySelectorAll<HTMLElement>("[data-skill-id]").forEach(
    (card) =>
      (card.ondragstart = (event) => {
        if (card.draggable){document.body.classList.add('dragging-hotbar');event.dataTransfer?.setData("text/plain", card.dataset.skillId!); }
      }),
  );
  bindSkillDrops();
  if (panel === "shop") {
    document.querySelectorAll<HTMLElement>("[data-buy]").forEach(
      (b) =>
        (b.onclick = () => {
          sim.buy(b.dataset.buy!);
          renderPanel();
        }),
    );
    $("#sell").onclick = () => {
      sim.sell();
      renderPanel();
    };
  }
  if (panel === "map") {
    drawMap($("#large-map") as HTMLCanvasElement);
    $("#large-map").onclick = (e) => {
      const r = $("#large-map").getBoundingClientRect();
      sim.goTo(WORLD_BOUNDS.minX+(e.clientX-r.left)/r.width*(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX),WORLD_BOUNDS.minZ+(e.clientY-r.top)/r.height*(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ));
      closePanel();
    };
  }
  if(panel==='admin'&&sim.admin){
    const updateItem=()=>{const entry=itemCatalog.find(i=>i.id===($('#spawn-item') as HTMLSelectElement).value)!;$('#spawn-preview').innerHTML=`${icon(entry.icon)}<strong>${entry.name}</strong>`;$('#spawn-equipment').hidden=!entry.gearId&&!isCraftMaterial(entry.name);const count=$('#spawn-count') as HTMLInputElement;count.max=entry.gearId?'20':'9999';count.value='1';};
    const updateCategory=()=>{const category=($('#spawn-category') as HTMLSelectElement).value;$('#spawn-item').innerHTML=itemCatalog.filter(i=>i.category===category).map(i=>`<option value="${escapeItemText(i.id)}">${i.name}</option>`).join('');updateItem();};
    $('#spawn-category').onchange=updateCategory;$('#spawn-item').onchange=updateItem;updateCategory();
    $('#spawn-form').onsubmit=e=>{e.preventDefault();sim.spawnItem(($('#spawn-item') as HTMLSelectElement).value,Number(($('#spawn-count') as HTMLInputElement).value),($('#spawn-rarity') as HTMLSelectElement).value as typeof rarityOrder[number],Number(($('#spawn-refine') as HTMLInputElement).value));};
  }
  if (panel === "operations") {
    void fetch('/api/operations').then(async response=>{
      if(!response.ok)throw new Error('Operator report unavailable');
      const report=await response.json(); const output=document.getElementById('operations-report');
      if(output) output.textContent=JSON.stringify({revision:report.revision,maintenance:report.maintenance,players:report.players,ledger:report.ledger,metrics:report.metrics,reports:report.reports,balance:report.balance},null,2);
      const select=document.getElementById('restore-backup');if(select){select.replaceChildren(...report.backups.map((b:{id:string;at:number;revision:number})=>{const option=document.createElement('option');option.value=b.id;option.textContent=new Date(b.at).toLocaleString()+' · revision '+b.revision;return option;}));}
    }).catch(()=>{const output=document.getElementById('operations-report');if(output)output.textContent='Could not load realm report. Reopen to retry.';});
    const operate=async(input:Record<string,unknown>)=>{const response=await fetch('/api/operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});const data=await response.json();sim.onEvent(response.ok?'Realm operation saved.':data.error||'Operation failed.');if(response.ok)renderPanel();};
    $('#maintenance-on').onclick=()=>void operate({action:'maintenance',enabled:true});$('#maintenance-off').onclick=()=>void operate({action:'maintenance',enabled:false});
    $('#restore-realm').onclick=()=>void operate({action:'restore',backupId:($('#restore-backup') as HTMLSelectElement).value});
    $('#update-balance').onclick=()=>void operate({action:'balance',kind:($('#balance-kind') as HTMLSelectElement).value,values:{[($('#balance-stat') as HTMLSelectElement).value]:Number(($('#balance-value') as HTMLInputElement).value)}});
    $("#backup-realm").onclick=async()=>{
      const response=await fetch('/api/operations',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      sim.onEvent(response.ok?'Server backup created.':'Backup unavailable. Try again.');
    };
    $("#export-realm").onclick=async()=>{
      const response=await fetch('/api/operations');if(!response.ok){sim.onEvent('Export unavailable');return;}
      const report=await response.json();const url=URL.createObjectURL(new Blob([JSON.stringify(report.backup,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download=`mossvale-realm-${report.revision}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  }
  if (panel === "settings") {
    if(document.getElementById('realm-tools')) $("#realm-tools").onclick=()=>openPanel('operations');
    $("#sfx-panel").onclick = () => {
      feedback.toggle();
      renderPanel();
    };
    $("#save-now").onclick = () => {
      sim.persist();
      sim.onEvent(sim.online ? sim.connection : "Adventure saved!");
    };
    $("#sound-panel").onclick = () => {
      toggleMusic();
      renderPanel();
    };
    $("#graphics-quality").onchange=()=>world.setQuality(($("#graphics-quality") as HTMLSelectElement).value as "auto"|"high"|"low");
    $("#zoom").oninput = (e) => {
      world.zoom = Number((e.target as HTMLInputElement).value);
      world.resize();
    };
  }
  if(document.getElementById("open-journal"))$("#open-journal").onclick=()=>openPanel("journal");
  enhanceGameSelects();
  bindSkillDrops();
  $(".panel-body").scrollTop=oldScroll;
  $("#close-panel").focus();
}
function closePanel() {
  panel = "";
  renderPanel();
}
function openPanel(name: string) {
  feedback.play("ui");
  keys.clear();
  panel = panel === name ? "" : name;
  renderPanel();
}
document.addEventListener("dragend",()=>document.body.classList.remove("dragging-hotbar"));
document.addEventListener("drop",()=>document.body.classList.remove("dragging-hotbar"));
observeGameSelects();
const keys = new Set<string>();
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "escape") {
    closePanel();
    return;
  }
  if (panel && k === "tab") {
    e.preventDefault();
    const f = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".game-panel button:not(:disabled),.game-panel input",
      ),
    );
    const i = f.indexOf(document.activeElement as HTMLElement);
    f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
    return;
  }
  if ((e.target as HTMLElement).tagName === "INPUT") return;
  const shortcut: Record<string, string> = {
    i: "inventory",
    k: "skills",
    c: "character",
    m: "map",
    h: "help",
  };
  if (shortcut[k] && !e.repeat) {
    openPanel(shortcut[k]);
    return;
  }
  if (panel) return;
  if (k === "tab" || k === " ") {
    e.preventDefault();
    if (k === "tab" || sim.target === null) sim.nearest();
  } else if ("123456".includes(k)) sim.skill(Number(k) - 1);
  else if("7890".includes(k))sim.useAuxiliary("7890".indexOf(k));
  else if (k === "f") sim.collect();
  keys.add(k);
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  sim.persist();
});
document.addEventListener("visibilitychange", () => {
  keys.clear();
  sim.persist();
});
document
  .querySelectorAll<HTMLElement>("[data-panel]")
  .forEach((b) => (b.onclick = () => openPanel(b.dataset.panel!)));
document
  .querySelectorAll<HTMLElement>("[data-skill]")
  .forEach((b) => (b.onclick = () => {if(!panel)sim.skill(Number(b.dataset.skill))}));
document.querySelectorAll<HTMLElement>(".action-bar [data-aux]").forEach(b=>b.onclick=()=>{if(!panel)sim.useAuxiliary(Number(b.dataset.aux))});
$("#nearest").onclick = () => sim.nearest();
$("#loot").onclick = () => sim.collect();
$("#auto").onclick = () => {
  sim.setAuto(!sim.auto);
  $("#auto").classList.toggle("active", sim.auto);
  sim.onEvent(sim.auto ? "Auto hunt enabled" : "Auto hunt stopped");
};
$("#untarget").onclick = () => sim.clearTarget();
$("#claim").onclick = () => sim.claim();
$("#camera").onclick = () => {
  world.angle = 0;
  world.zoom = 1;
  world.resize();
  sim.onEvent("Camera reset");
};
$("#quest-toggle").onclick = () => {
  $("#quest-content").hidden = !$("#quest-content").hidden;
};
$("#chat-hide").onclick = () => $(".chat").classList.toggle("collapsed");
document.querySelectorAll<HTMLElement>("[data-chat]").forEach(
  (b) =>
    (b.onclick = () => {
      chatMode = b.dataset.chat!;
      document
        .querySelectorAll("[data-chat]")
        .forEach((c) => c.classList.toggle("active", c === b));
      renderLog();
    }),
);
$("#chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const input = e.target as HTMLInputElement;
    if (input.value.trim()) {
      if (sim instanceof NetworkSimulation) sim.chat(input.value.trim());
      else activity(input.value.trim(), "You");
    }
    input.value = "";
    input.blur();
  }
});
document.querySelectorAll<HTMLElement>("[data-touch]").forEach((b) => {
  const map: Record<string, string> = {
    up: "w",
    down: "s",
    left: "a",
    right: "d",
  };
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    keys.add(map[b.dataset.touch!]);
  };
  b.onpointerup = b.onpointercancel = () => keys.delete(map[b.dataset.touch!]);
});
let music = false;
let audio: AudioContext | null = null;
let musicTimer = 0;
function toggleMusic() {
  music = !music;
  $("#sound").innerHTML = icon(music ? "volume-2" : "volume-x");
  if (music) {
    audio ??= new AudioContext();
    void audio.resume();
    let n = 0;
    const notes = sim.zone.music;
    const play = () => {
      if (!music || !audio) return;
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.type = sim.save.zone==='ruins'?'triangle':'sine';
      osc.frequency.value = sim.zone.music[n++ % sim.zone.music.length];
      gain.gain.setValueAtTime(0, audio.currentTime);
      gain.gain.linearRampToValueAtTime(0.025, audio.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 1.8);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 2);
      musicTimer = window.setTimeout(play,sim.save.zone==='frost'?850:sim.save.zone==='ruins'?500:650);
    };
    play();
  } else clearTimeout(musicTimer);
}
$("#sound").onclick = toggleMusic;
function drawMap(canvas: HTMLCanvasElement) {
  const c = canvas.getContext("2d")!,
    w = canvas.width,
    h = canvas.height;
  const sizeX=WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX,sizeZ=WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ;
  const x=(v:number)=>(v-WORLD_BOUNDS.minX)/sizeX*w,z=(v:number)=>(v-WORLD_BOUNDS.minZ)/sizeZ*h;
  c.fillStyle='#'+sim.zone.ground.toString(16).padStart(6,'0');c.fillRect(0,0,w,h);
  c.fillStyle='#'+sim.zone.path.toString(16).padStart(6,'0');
  for(const lane of [-32,0,32]){c.fillRect(x(lane-1.5),0,w*3/sizeX,h);c.fillRect(0,z(lane+.5),w,h*3/sizeZ);}
  c.strokeStyle='rgba(255,255,255,.17)';c.lineWidth=1;
  for(const edge of [-16,16]){c.beginPath();c.moveTo(x(edge),0);c.lineTo(x(edge),h);c.moveTo(0,z(edge));c.lineTo(w,z(edge));c.stroke();}
  c.fillStyle='#9498b1';world.blocking.forEach(b=>{c.beginPath();c.arc(x(b.x),z(b.z),Math.max(1,b.r*w/sizeX),0,Math.PI*2);c.fill();});
  c.fillStyle='#bd8bff';c.fillRect(x(PORTAL_POSITION.x)-3,z(PORTAL_POSITION.z)-3,6,6);
  for(const npc of sim.zone.npcs){c.fillStyle='#79fff0';c.fillRect(x(npc.x)-2,z(npc.z)-2,4,4);if(w>=200){c.font='11px Nunito';c.fillText(npc.name,x(npc.x)+5,z(npc.z));}}
  for(const m of sim.monsters.filter(m=>m.alive)){
    const spec=species[m.kind],elite=spec.boss||spec.miniBoss,r=spec.boss?6:spec.miniBoss?4.5:w<200?2:3;
    c.fillStyle=m.id===sim.target?'#fff4a9':spec.boss?'#ffbf45':spec.miniBoss?'#c997ff':'#ff596d';c.beginPath();
    if(elite){c.moveTo(x(m.x),z(m.z)-r);c.lineTo(x(m.x)+r,z(m.z));c.lineTo(x(m.x),z(m.z)+r);c.lineTo(x(m.x)-r,z(m.z));c.closePath();}else c.arc(x(m.x),z(m.z),r,0,Math.PI*2);
    c.fill();if(elite){c.strokeStyle='#352543';c.stroke();if(w>=200){c.font='bold 11px Nunito';c.fillText((spec.boss?'BOSS · ':'MINI · ')+m.kind,x(m.x)+8,z(m.z)+3);}}
  }
  c.beginPath();
  c.fillStyle = "#ffe297";
  c.arc(x(sim.x), z(sim.z), w < 200 ? 4 : 7, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#fff3ca";
  c.lineWidth = 2;
  c.stroke();
}
let hotbarSignature = "";
function bindSkillDrops() {
  document.querySelectorAll<HTMLElement>("[data-hotbar]").forEach((slot) => {
    slot.ondragover = (event) => event.preventDefault();
    slot.ondrop = (event) => {
      event.preventDefault();
      const id = event.dataTransfer?.getData("text/plain");
      if (id && sim.assignSkill(Number(slot.dataset.hotbar), id)) {
        renderPanel();
        refreshHotbar();
      }
    };
  });
  document.querySelectorAll<HTMLElement>('[data-aux]').forEach(slot=>{slot.ondragover=e=>e.preventDefault();slot.ondrop=e=>{e.preventDefault();const name=e.dataTransfer?.getData('application/x-mossvale-item')||e.dataTransfer?.getData('text/plain');if(isAuxiliaryItem(name)&&sim.assignAuxiliary(Number(slot.dataset.aux),name)){renderPanel();refreshHotbar()}};});

}
function refreshHotbar() {
  const signature = `${sim.save.job}:${sim.save.level}:${sim.save.hotbar.join(",")}:${sim.save.auxiliary.join(",")}:${sim.save.skillChoices[sim.save.job].join(",")}`;
  if (signature === hotbarSignature) return;
  hotbarSignature = signature;
  $("#class-name").textContent = sim.job.name.toUpperCase();
  [0,1,2,3,4,5].forEach((key, index) => {
    const button = document.querySelector<HTMLButtonElement>(
      `.action-bar [data-skill="${key}"]`,
    )!;
    const skill = sim.skillList.find(
      (skill) => skill.id === sim.save.hotbar[index],
    );
    const locked = !skill || !sim.unlockedSkills.some(k=>k.id===skill.id);
    button.classList.toggle("locked", locked);
    button.dataset.hotbar = String(index);
    button.title = skill
      ? `${skill.name} · ${skill.mp} MP · ${locked ? "Unlocks at level " + skill.level : skill.cooldown + "s cooldown"}`
      : "Assign a skill in the Skills window";
    button.innerHTML = `<kbd>${key + 1}</kbd>${icon(skill?.icon || "plus")}<small>${skill?.name || "Empty"}</small><span class="cooldown">${locked && skill ? "Lv " + skill.level : ""}</span>`;
  });
  document.querySelectorAll<HTMLElement>('.action-bar [data-aux]').forEach(button=>{const n=Number(button.dataset.aux),name=sim.save.auxiliary[n];button.title=name===EXP_CHARM.name?`EXP Charm · Passive EXP ×${EXP_CHARM.multiplier} while slotted · never consumed`:name||'Assign an approved item in Skills';button.classList.toggle('locked',!name);button.innerHTML=`<kbd>${[7,8,9,0][n]}</kbd>${icon(name?auxiliaryItems[name].icon:'plus')}<small>${name==='Red potion'?'HP':name==='Blue potion'?'MP':name===EXP_CHARM.name?'×'+EXP_CHARM.multiplier:'Empty'}</small><span class="count"></span><span class="cooldown"></span>`;});
  bindSkillDrops();
}
refreshHotbar();
let last = performance.now(),
  hudClock = 0,
  saveClock = 0;
let animationFrame = 0;
let footstepTimer = 0;
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  const dx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0),
    dz = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);
  const oldX = sim.x,
    oldZ = sim.z;
  let remaining = dt;
  while (remaining > 0) {
    const step = Math.min(remaining, 0.025);
    sim.tick(step, dx, dz);
    remaining -= step;
  }
  world.update(sim.paused && !sim.online ? 0 : dt);
  footstepTimer -= dt;
  if (
    !sim.paused &&
    Math.hypot(sim.x - oldX, sim.z - oldZ) > 0.01 &&
    footstepTimer <= 0
  ) {
    feedback.play("step");
    footstepTimer = 0.3;
  }
  hudClock += dt;
  saveClock += dt;
  if (saveClock > 5) {
    sim.persist();
    saveClock = 0;
  }
  if (hudClock > 0.08) {
    hudClock = 0;
    $(".save-indicator").textContent = sim.connection;
    $(".realm").childNodes[1].textContent = " "+sim.zone.name.toUpperCase()+" ";
    $(".map-title").childNodes[1].textContent = " "+sim.zone.name+" ";
    $(".realm small").textContent = sim.online ? `CHANNEL 01 · ${sim.remotePlayers.length + 1} ONLINE` : "PRACTICE · DEVICE SAVE";
    $(".chat-tabs span").textContent = sim.online ? "REALM CHAT" : "LOCAL ADVENTURE";
    const chatInput = $("#chat-input") as HTMLInputElement;
    chatInput.placeholder = sim.online ? "Say something to the realm…" : "Leave a local note…";
    const s = sim.save;
    $("#hp-text").textContent = `${Math.ceil(s.hp)} / ${sim.maxHp}`;
    $("#mp-text").textContent = `${Math.floor(s.mp)} / ${sim.maxMp}`;
    $("#hp-fill").style.width = (s.hp / sim.maxHp) * 100 + "%";
    $("#mp-fill").style.width = (s.mp / sim.maxMp) * 100 + "%";
    $("#xp-fill").style.width = $("#exp-fill").style.width =
      (s.level === MAX_LEVEL ? 100 : (s.xp / sim.maxXp) * 100) + "%";
    document.querySelector('.experience>span')!.textContent=sim.experienceMultiplier>1?'EXP ×'+EXP_CHARM.multiplier:'BASE EXP';
    $("#exp-text").textContent =
      s.level === MAX_LEVEL ? "MAX LEVEL" : `${s.xp} / ${sim.maxXp}`;
    refreshHotbar();
    $("#combat-state").textContent = sim.cast
      ? `Casting ${sim.skillList.find((skill) => skill.id === sim.cast!.skillId)?.name} · ${sim.cast.remaining.toFixed(1)}s`
      : [
          sim.guard.time > 0 ? `Guard ${Math.ceil(sim.guard.time)}s` : "",
          sim.fury.time > 0 ? `Attack boost ${Math.ceil(sim.fury.time)}s` : "",
        ]
          .filter(Boolean)
          .join(" · ");
    $("#gold").textContent = s.gold.toLocaleString();
    $("#level-badge").textContent = String(s.level);
    document.querySelectorAll<HTMLElement>('.action-bar [data-aux]').forEach(button=>{const n=Number(button.dataset.aux),name=s.auxiliary[n];button.querySelector('.count')!.textContent=name?String(s.items.find(i=>i.name===name)?.count||0):'';const cd=button.querySelector<HTMLElement>('.cooldown')!;cd.textContent=name!==EXP_CHARM.name&&sim.cooldowns[n+6]>0?String(Math.ceil(sim.cooldowns[n+6])):'';cd.classList.toggle('cooling',name!==EXP_CHARM.name&&sim.cooldowns[n+6]>0);});
    const nextHint=[['move','Walk with WASD or click the path.'],['attack','Defeat a creature. Step away from red attack warnings.'],['collect','Walk to a drop and press F.'],['craft','Gather materials and craft equipment in Forge.'],['equip','Equip your crafted gear in Bag.'],['travel','Reach the north portal and open Map to travel.']].find(([id])=>!s.tutorial.includes(id));
    $('.quest-tracker p').textContent=!s.tutorial.includes('skip')&&nextHint?nextHint[1]:'Visit NPC guides for your next adventure.';
    $("#coords").textContent = `${Math.round(sim.x)}, ${Math.round(sim.z)}`;
    $("#quest-progress").textContent = `${Math.min(5, s.kills)}/5`;
    $("#quest-fill").style.width = Math.min(100, (s.kills / 5) * 100) + "%";
    $("#claim").hidden = s.kills < 5 || s.questClaimed;
    $("#quest-reward").textContent = s.questClaimed
      ? "✓ QUEST COMPLETE"
      : "REWARD   100 z + 3 potions";
    document
      .querySelectorAll<HTMLElement>(".action-bar [data-skill]")
      .forEach((b) => {
        const i = Number(b.dataset.skill);
        const c = b.querySelector<HTMLElement>(".cooldown")!;
        c.textContent =
          sim.cooldowns[i] > 0
            ? Math.ceil(sim.cooldowns[i]).toString()
            : b.classList.contains("locked")
              ? sim.skillList.find(
                  (skill) =>
                    skill.id === sim.save.hotbar[i],
                )?.level
                ? "Lv " +
                  sim.skillList.find(
                    (skill) =>
                      skill.id === sim.save.hotbar[i],
                  )!.level
                : ""
              : "";
        c.classList.toggle("cooling", sim.cooldowns[i] > 0);
      });
    const target = sim.monsters.find((m) => m.id === sim.target && m.alive);
    $("#target-hud").hidden = !target;
    if (target) {
      $("#target-name").textContent = target.kind;
      $("#target-hud small").textContent = `Lv ${species[target.kind].level} · ${species[target.kind].boss?"Boss":species[target.kind].miniBoss?"Mini-boss":"Wild monster"}`;
      $("#target-fill").style.width =
        (target.hp / species[target.kind].hp) * 100 + "%";
    }
    drawMap($("#mini") as HTMLCanvasElement);
  }
  animationFrame = requestAnimationFrame(frame);
}
animationFrame = requestAnimationFrame(frame);
// Read-only diagnostic snapshot for automated playtesting; no gameplay cheats.
Object.defineProperty(window, "mossvale", {
  value: {
    previewSkill: (id:string,age?:number) => world.previewSkill(id,age),
    clearSkillPreview: () => world.clearSkillPreview(),
    snapshot: () => ({
      zone:sim.save.zone,equipped:{...sim.save.equipped},tutorial:[...sim.save.tutorial],community:structuredClone(sim.community),
      job: sim.save.job,
      hotbar: [...sim.save.hotbar],auxiliary:[...sim.save.auxiliary],skillChoices:structuredClone(sim.save.skillChoices),
      unlockedSkills: sim.unlockedSkills.map((skill) => skill.id),
      defense: sim.defense,
      cooldowns: [...sim.cooldowns],
      skillCooldowns: { ...sim.skillCooldowns },
      cast: sim.cast ? { ...sim.cast } : null,
      renderX:sim.renderX,renderZ:sim.renderZ,
      x: sim.x,
      z: sim.z,
      level: sim.save.level,
      hp: sim.save.hp,
      mp: sim.save.mp,
      kills: sim.save.kills,
      items: structuredClone(sim.save.items),
      gold: sim.save.gold,
      weapon: sim.save.weapon,
      target: sim.target,
      loot: sim.loot.length,
      paused: sim.paused,
      monsters: sim.monsters.map((m) => ({
        ...m,
        screen: world.project(m.x, m.z, 0.5),
      })),
      destination: sim.destination ? { ...sim.destination } : null,
      zoom: world.zoom,
      ...world.diagnostics,
    }),
  },
});

window.addEventListener("pagehide", (event) => {
  sim.persist();
  if (!event.persisted) {
    cancelAnimationFrame(animationFrame);
    world.dispose();
    feedback.dispose();
  }
});

}
void boot();
