import {migrateStoredItem,isRetiredMaterial} from './game/item-migration.js';
import {inventoryKey,salvageYield,itemSalePrice} from './game/inventory-actions.js';
import {isCraftMaterial,isRarity,materialRarity,materialKey,sameStack,gearRecipe,craftCost,materialCount,rollMaterialDrops} from './game/crafting.js';
import {materialIcons} from './game/items.js';
import {craftingConfig,progression,economy,refinement,contentConfig,skillRankConfig} from './config/balance.js';
import {EXP_CHARM,EXP_TOME,itemCategory,materialIcon,type ItemCategory} from './game/items.js';
import {refineLevel,refineCost,rollRefinement,rollStoneDrop,refineStones,isStoneTier,type StoneTier} from './game/refinement.js';
import {
  skillAtRank,skillRankCap,
  classes,
  isAuxiliaryItem,
  skills,
  MAX_LEVEL,
  isClass,
  damageAfterDefense,
  type ClassId,
  type Skill,
} from "./game/classes.js";
import { normalMonsterBalance, species, zones, isZone, questDefinitions, type Kind, type ZoneId, type AttackShape } from "./game/content.js";
import { rarityOrder, equipment, gearById, gearByName, type GearSlot, type Bonuses, type Rarity, BAG_CAPACITY, gearSlots, itemBonuses, normalizeSecondary, rollGear, rollEquipmentDrops, setBonuses, gearSets } from "./game/equipment.js";
import { zoneObstacles, zoneSpawns, WORLD_BOUNDS, PORTAL_POSITION, protectedPosition, insideMonsterGroup, zoneMonsterGroups, monsterGroupConfig } from "./game/map-data.js";
export { species } from "./game/content.js";
export type { Kind } from "./game/content.js";
export type Monster = {
  id: number;
  kind: Kind;
  x: number;
  z: number;
  hp: number;
  alive: boolean;
  respawn: number;
  attack: number;
  homeX: number;
  homeZ: number;
  stun: number;
  slow: number;
  poison: number;
  poisonTimer: number;
  poisonDamage: number;
  windup: number;
  aggro: boolean;
  owner?: string;
  groupId?: string;
  territoryAggro?: boolean;
  returning?: boolean;
  rushRoute?: {x:number;z:number}[];
  rushRouteRetry?: number;
  rushGoal?: {x:number;z:number};
  facingX?: number; facingZ?: number; pattern?: number; shape?: AttackShape;
};
export type Item = { category?:ItemCategory; name: string; icon: string; count: number; id?:string; gearId?:string; refine?:number; rarity?:Rarity; secondary?:Bonuses };
export type Save = {
  legacyBasicRefine?:boolean;
  version: number;
  zone: ZoneId;
  equipped: Record<GearSlot, string | null>;
  quests: Record<string,{progress:number;claimed:boolean}>;
  tutorial: string[];
  job: ClassId;
  hotbar: (string | null)[];
  auxiliary:(string|null)[];
  skillChoices:Record<ClassId,(string|null)[]>;
  skillRanks:Record<string,number>;
  level: number;
  xp: number;
  gold: number;
  hp: number;
  mp: number;
  kills: number;
  questClaimed: boolean;
  weapon: number;
  stats: { str: number; vit: number; agi: number };
  points: number;
  skillLevel: number;
  items: Item[];
};
const defaults: Save = {
  version: 9,
  zone: "glade",
  equipped: {weapon:null,helmet:null,armor:null,pants:null,boots:null,accessory:null},
  quests: {},
  tutorial: [],
  job: "swordsman",
  hotbar: Array(6).fill(null),
  auxiliary:["Red potion","Blue potion",null,null],
  skillRanks:{},
  skillChoices:{swordsman:Array(10).fill(null),mage:Array(10).fill(null),archer:Array(10).fill(null)},
  level: 1,
  xp: 0,
  gold: progression.initial.gold,
  hp: progression.initial.hp,
  mp: progression.initial.mp,
  kills: 0,
  questClaimed: false,
  weapon: 0,
  stats: {...progression.initial.stats},
  points: progression.initial.points,
  skillLevel: 1,
  items: [
    { name: "Red potion", icon: "🧪", count: progression.initial.redPotions },
    { name: "Blue potion", icon: "💠", count: progression.initial.bluePotions },
  ],
};
export class Simulation {
  save: Save;
  get renderX(){return this.x}
  get renderZ(){return this.z}
  get renderTime(){return this.time}
  get renderActionTime(){return this.actionTime}
  get renderHurtTime(){return this.hurtTime}
  get renderCast(){return this.cast}
  renderMonster(monster:Monster){return {x:monster.x,z:monster.z};}
  renderPeer(player:{id:string;x:number;z:number}){return {x:player.x,z:player.z};}
  x = 0;
  z = 2;
  target: number | null = null;
  destination: { x: number; z: number } | null = null;
  attackTimer = 0;
  time = 0;
  paused = false;
  auto = false;
  cooldowns = Array(10).fill(0) as number[];
  auxiliaryCooldown=0;
  skillCooldowns: Record<string, number> = {};
  skillCooldownTotals: Record<string, number> = {};
  autoSkillCursor = 0;
  guard = { time: 0, power: 0 };
  fury = { time: 0, power: 0 };
  cast: {
    skillId: string;
    targetId: number | null;
    remaining: number;
    total: number;
  } | null = null;
  actionTime = 0;
  hurtTime = 0;
  deathTime = 0;
  onSupport?: (skill: Skill) => void;
  balance:Record<string,Partial<Pick<(typeof species)[Kind],"hp"|"atk"|"defense"|"xp"|"gold">>> = {};
  monsterSpec(kind:Kind){const base=species[kind],normal=normalMonsterBalance(base.level),tier=base.boss?contentConfig.normalBalance.boss:base.miniBoss?contentConfig.normalBalance.mini:{hp:1,atk:1,defense:1,goldPerLevel:0,xp:1};return {...base,hp:normal.hp*tier.hp,atk:normal.atk*tier.atk,defense:normal.defense*tier.defense,gold:base.boss||base.miniBoss?base.level*tier.goldPerLevel:normal.gold,xp:progression.levels[base.level-1].monsterXp*tier.xp,...this.balance[kind]};}
  hasLegacyDrop(_monster:Monster){return false;}

  monsters: Monster[] = [];
  loot: { x: number; z: number; name: string; icon: string; item?:Item }[] = [];
  obstacles: { x: number; z: number; r: number }[] = [];
  route: { x: number; z: number }[] = [];
  routeTimer = 0;
  onEvent: (text: string, type?: string, x?: number, z?: number) => void =
    () => {};
  constructor(private random: () => number = Math.random, initial?: Save, private storage: Pick<Storage, "getItem" | "setItem"> | null = typeof localStorage === "undefined" ? null : localStorage) {
    let loadedVersion=0;
    try {
      const s = initial ?? JSON.parse(this.storage?.getItem("mossvale-save") || "null");
      loadedVersion=Number(s?.version||0);
      this.save =
        s?.level && s?.stats && Array.isArray(s.items)
          ? { ...structuredClone(defaults), ...s }
          : structuredClone(defaults);
    } catch {
      this.save = structuredClone(defaults);
    }
    this.save.job = isClass(this.save.job) ? this.save.job : "swordsman";
    const legacyRefine=(loadedVersion<6||this.save.legacyBasicRefine)&&this.save.weapon>0;
    this.save.items=this.save.items.flatMap(item=>{const next=migrateStoredItem(item,loadedVersion<9);return next?[next]:[];});
    this.save.version = 10;
    this.save.weapon=refineLevel(this.save.weapon);
    for(const item of this.save.items)if(isCraftMaterial(item.name)&&!item.gearId){item.rarity=isRarity(item.rarity)?item.rarity:'common';item.id=materialKey(item.name,item.rarity);}
    for(const item of this.save.items)if(item.gearId)item.refine=refineLevel(item.refine);
    for(const item of this.save.items)if(item.secondary)item.secondary=normalizeSecondary(item.secondary);
    const materialStacks=new Map<string,Item>();this.save.items=this.save.items.filter(item=>{if(!isCraftMaterial(item.name)||item.gearId)return true;const key=materialKey(item.name,materialRarity(item)),existing=materialStacks.get(key);if(existing){existing.count+=item.count;return false;}materialStacks.set(key,item);return true;});
    this.save.zone = isZone(this.save.zone) ? this.save.zone : "glade";
    const oldEquipped=this.save.equipped as typeof this.save.equipped&{gloves?:string|null};
    this.save.equipped = {...defaults.equipped,...oldEquipped,pants:oldEquipped.pants||oldEquipped.gloves||null};
    delete (this.save.equipped as typeof oldEquipped).gloves;
    for(const item of this.save.items){const gear=gearById(item.gearId||'');if(gear?.slot==='pants'){item.name=gear.name;item.icon=gear.icon;}}
    // Preserve the old basic-weapon investment as a real starter weapon.
    if(legacyRefine&&!this.save.equipped.weapon){
      if(this.save.items.filter(i=>i.count>0).length>=BAG_CAPACITY)this.save.legacyBasicRefine=true;
      else {
      const id='sprout-weapon',definition=gearById(id)!;
      const item={...rollGear(id,'common',()=>0),name:definition.name,icon:definition.icon,count:1,refine:this.save.weapon};
      this.save.items.push(item);this.save.equipped.weapon=item.id!;
      delete this.save.legacyBasicRefine;
      }
    }
    for(const item of this.save.items)item.category=itemCategory(item);
    this.save.quests = this.save.quests || {};
    this.save.tutorial = Array.isArray(this.save.tutorial) ? this.save.tutorial : [];
    this.save.level = Math.max(
      1,
      Math.min(MAX_LEVEL, Math.floor(Number(this.save.level) || 1)),
    );
    this.save.xp =
      this.save.level === MAX_LEVEL
        ? 0
        : Math.max(0, Number(this.save.xp) || 0);
    const previousChoices=this.save.skillChoices;
    this.save.skillChoices={swordsman:[],mage:[],archer:[]};
    for(const job of Object.keys(classes) as ClassId[]){
      let gap=false;
      this.save.skillChoices[job]=Array.from({length:10},(_,n)=>{
        const legacy=loadedVersion>0&&loadedVersion<7;
        const id=legacy&&this.save.level>=(n+1)*10?skills[job].find(k=>k.branch===0&&k.stage===n+1)!.id:previousChoices?.[job]?.[n];
        const valid=!gap&&skills[job].some(k=>k.id===id&&k.stage===n+1&&k.level<=this.save.level);
        if(!valid)gap=true;return valid?id!:null;
      });
    }
    const previousRanks=this.save.skillRanks;this.save.skillRanks={};
    for(const job of Object.keys(classes) as ClassId[])for(const id of this.save.skillChoices[job])if(id){const skill=skills[job].find(s=>s.id===id)!;this.save.skillRanks[id]=Math.max(1,Math.min(skillRankCap(skill),Math.floor(Number(previousRanks?.[id])||1)));}
    // Rank budget is global across jobs; malformed offline saves cannot mint points.
    let excess=Object.values(this.save.skillRanks).reduce((sum,n)=>sum+n*skillRankConfig.rankCost,0)-this.save.level*skillRankConfig.pointsPerLevel;
    for(const id of Object.keys(this.save.skillRanks).reverse())while(excess>0&&this.save.skillRanks[id]>1){this.save.skillRanks[id]--;excess-=skillRankConfig.rankCost;}
    const available = this.unlockedSkills,used=new Set<string>();
    this.save.hotbar=Array.from({length:6},(_,index)=>{const id=this.save.hotbar?.[index];if(!id||!available.some(k=>k.id===id)||used.has(id))return null;used.add(id);return id;});
    const aux=this.save.auxiliary;this.save.auxiliary=Array.from({length:4},(_,n)=>isAuxiliaryItem(aux?.[n])?aux[n]:null);
    this.save.hp = Math.max(
      1,
      Math.min(this.maxHp, Number(this.save.hp) || this.maxHp),
    );
    this.save.mp = Math.max(0, Math.min(this.maxMp, Number(this.save.mp) || 0));
    this.populateZone(this.save.zone);
  }
  populateZone(zone: ZoneId) {
    this.monsters=zoneSpawns(zone).map(({kind,x,z,groupId},id)=>({id,kind,x,z,groupId,hp:this.monsterSpec(kind).hp,alive:true,respawn:0,attack:0,homeX:x,homeZ:z,stun:0,slow:0,poison:0,poisonTimer:0,poisonDamage:0,windup:0,aggro:false,pattern:0}));
    this.obstacles=zoneObstacles(zone);
  }
  get zone() { return zones[this.save.zone]; }
  get refinement() {return this.save.items.find(i=>i.id===this.save.equipped.weapon)?.refine || (this.save.equipped.weapon?0:this.save.weapon);}
  private bonusCache?:{save:Save;key:string;value:Bonuses};
  get gearBonuses(): Bonuses {
    const key=this.save.job+':'+Object.values(this.save.equipped).map(id=>id+':'+(this.save.items.find(i=>i.id===id)?.refine||0)).join(',');
    if(this.bonusCache?.save===this.save&&this.bonusCache.key===key)return this.bonusCache.value;
    const out:Bonuses={},sets=new Map<string,number>();
    for(const id of Object.values(this.save.equipped)) {
      const item=this.save.items.find(i=>i.id===id&&i.count===1), gear=item?.gearId?gearById(item.gearId):undefined;
      if(gear?.setId&&(!gear.job||gear.job===this.save.job))sets.set(gear.setId,(sets.get(gear.setId)||0)+1);
      if(gear && (!gear.job || gear.job===this.save.job)) for(const [key,value] of Object.entries(itemBonuses(item!))) out[key as keyof Bonuses]=(out[key as keyof Bonuses]||0)+value;
    }
    for(const [id,count] of sets)for(const [stat,value] of Object.entries(setBonuses(id,count)))out[stat as keyof Bonuses]=(out[stat as keyof Bonuses]||0)+value;
    this.bonusCache={save:this.save,key,value:out};return out;
  }
  get activeSets(){return gearSets.map(set=>({set,pieces:Object.values(this.save.equipped).filter(id=>this.save.items.some(i=>i.id===id&&gearById(i.gearId||'')?.setId===set.id)).length})).filter(s=>s.pieces>0)}
  get criticalChance(){return Math.min(progression.caps.crit,progression.critBase+this.agility*progression.critAgi+(this.gearBonuses.critChance||0)/100)}
  get criticalMultiplier(){return progression.critMultiplier+(this.gearBonuses.critDamage||0)/100}
  get movementSpeed(){return progression.moveBase*(1+Math.min(progression.caps.move,(this.gearBonuses.moveSpeed||0)/100))}
  get attackSpeedBonus(){return Math.min(progression.caps.attackSpeed*100,this.gearBonuses.attackSpeed||0)}
  get attackInterval(){
    const baseRate=1/this.job.speed,extraAgi=Math.max(0,this.agility-progression.attackAgiBase);
    const rate=baseRate+(progression.attackRateCeiling-baseRate)*extraAgi/(extraAgi+progression.attackAgiHalfSaturation);
    return 1/(rate*(1+this.attackSpeedBonus/100));
  }
  get cooldownMultiplier(){return 1-Math.min(progression.caps.cooldown,(this.gearBonuses.cooldownReduction||0)/100)}
  get mpRegenPercent(){return progression.mpRegenPercent+(this.gearBonuses.mpRegen||0)}
  get hpRegenPercent(){return progression.hpRegenPercent+(this.gearBonuses.hpRegen||0)}
  get healingMultiplier(){return 1+Math.min(progression.caps.healing,(this.gearBonuses.healingBonus||0)/100)}
  addEquipmentItem(item:Item){if(this.save.items.some(i=>i.id===item.id))return false;if(this.save.items.filter(i=>i.count>0).length>=BAG_CAPACITY){this.onEvent('Bag full. Make room before collecting.');return false;}this.save.items.push({...structuredClone(item),category:itemCategory(item),secondary:normalizeSecondary(item.secondary),refine:refineLevel(item.refine)});return true;}
  rollStoneLoot(monster:Monster){const spec=this.monsterSpec(monster.kind),tier=spec.boss?rollStoneDrop(true,this.random):this.random()<normalMonsterBalance(spec.level).drops.commonStone?'common':undefined;return tier?refineStones[tier]:undefined;}
  rollMaterialLoot(monster:Monster):Item[]{
    const spec=this.monsterSpec(monster.kind),rates=normalMonsterBalance(spec.level).drops;
    const drops=spec.boss?rollMaterialDrops(true,this.random):(['shade','rune','sky'] as const).flatMap(key=>(['common','rare'] as const).flatMap(rarity=>this.random()<rates[`${key}_${rarity}`]?[{name:({shade:'Shade essence',rune:'Rune stone',sky:'Sky feather'} as const)[key],rarity,count:1}]:[]));
    return drops.map(drop=>({...drop,icon:materialIcon(drop.name,drop.rarity),id:materialKey(drop.name,drop.rarity),category:'material'}));
  }
  rollEquipmentLoot(monster:Monster):Item[] {return rollEquipmentDrops(this.monsterSpec(monster.kind).level,this.monsterSpec(monster.kind).boss?'boss':this.monsterSpec(monster.kind).miniBoss?'mini':'normal',this.random).map(rolled=>{const gear=gearById(rolled.gearId!)!;return {...rolled,name:gear.name,category:itemCategory({name:gear.name}),icon:gear.icon,count:1};});}
  get agility() { return this.save.stats.agi+(this.gearBonuses.agi||0); }
  toggleTutorial(){if(this.save.tutorial.includes('skip'))this.save.tutorial=this.save.tutorial.filter(s=>s!=='skip');else this.save.tutorial.push('skip');this.persist();}
  markTutorial(step:string) {if(!this.save.tutorial.includes(step))this.save.tutorial.push(step)}
  progressQuest(kind:string,amount=1) {
    for(const quest of questDefinitions) if(quest.kind===kind && (kind==='craft'||quest.zone===this.save.zone)) {
      const state=this.save.quests[quest.id] ??= {progress:0,claimed:false};state.progress=Math.min(quest.target,state.progress+amount);
    }
  }
  claimQuest(id:string) {
    const quest=questDefinitions.find(q=>q.id===id), state=this.save.quests[id];
    if(!quest||!state||state.claimed||state.progress<quest.target)return false;
    if(!this.addItem(quest.item,isCraftMaterial(quest.item)?materialIcon(quest.item):"🌿",quest.count))return false;state.claimed=true;this.save.gold+=quest.gold;this.addExperience(quest.xp);this.onEvent(`Quest complete: ${quest.name}`,"reward");this.persist();return true;
  }
  travel(zone:ZoneId,allowDungeon=false) {
    if(!isZone(zone)||zone===this.save.zone)return false;
    if(this.target!==null||this.cast||this.monsters.some(m=>m.alive&&m.aggro&&(!this.actorId||m.owner===this.actorId))){this.onEvent("Leave combat before travelling.");return false;}
    if(this.save.level<zones[zone].level){this.onEvent(`Reach Lv ${zones[zone].level} to enter ${zones[zone].name}.`);return false;}
    if(zone==='ruins'&&this.online&&!allowDungeon){this.onEvent("Gather a party of 2–4 before entering the ruins.");return false;}
    if(Math.hypot(this.x-PORTAL_POSITION.x,this.z-PORTAL_POSITION.z)>3){this.onEvent("Walk to the glowing north portal to travel.");this.goTo(PORTAL_POSITION.x,PORTAL_POSITION.z);return false;}
    this.save.zone=zone;this.populateZone(zone);this.x=0;this.z=-9;this.clearTarget();this.destination=null;this.route=[];this.auto=false;this.loot=[];this.onEvent(`Arrived in ${zones[zone].name}`,"zone");this.markTutorial('travel');this.persist();return true;
  }
  interact(id:string) {
    const npc=this.zone.npcs.find(n=>n.id===id);if(!npc)return;
    if(Math.hypot(this.x-npc.x,this.z-npc.z)>3){this.goTo(npc.x,npc.z);this.onEvent("Walk closer to speak with "+npc.name);return;}
    this.markTutorial("talk");this.onEvent(npc.panel,"npc");this.persist();
  }
  upgradeMaterial(name:string,rarity:Rarity){
    if(!isCraftMaterial(name)||!isRarity(rarity)||rarity==='legend')return false;
    const next=rarityOrder[rarityOrder.indexOf(rarity)+1];
    const source=this.save.items.find(i=>i.name===name&&materialRarity(i)===rarity&&i.count>=craftingConfig.upgradeCount);
    if(!source)return false;
    if(!this.save.items.some(i=>sameStack(i,{name,rarity:next})&&i.count>0)&&this.save.items.filter(i=>i.count>0).length>=BAG_CAPACITY&&source.count>craftingConfig.upgradeCount)return false;
    source.count-=craftingConfig.upgradeCount;this.addItem(name,materialIcons[name],1,next);this.persist();this.onEvent(`Upgraded ${name} · ${next}`,'reward');return true;
  }
  craft(id:string,rarity:Rarity='common') {
    if(!isRarity(rarity))return false;
    if(id==='rare-refine-stone'){
      const common=this.save.items.find(i=>i.name===refineStones.common.name&&i.count>=refinement.stoneCraftCount);
      if(!common){this.onEvent(`Need ${refinement.stoneCraftCount} Common refine stones.`);return false;}
      const rare=this.save.items.find(i=>i.name===refineStones.rare.name&&i.count>0);
      if(!rare&&this.save.items.filter(i=>i.count>0).length>=BAG_CAPACITY&&common.count>refinement.stoneCraftCount){this.onEvent('Bag full.');return false;}
      common.count-=refinement.stoneCraftCount;this.addItem(refineStones.rare.name,refineStones.rare.icon);this.progressQuest('craft');this.persist();this.onEvent('Crafted 1 Rare refine stone','reward');return true;
    }
    const gear=gearById(id);
    if(!gear||this.save.level<gear.level){this.onEvent("You have not reached this recipe’s level.");return false;}
    const recipe=gearRecipe(gear),cost=craftCost(gear);
    if(this.save.gold<cost||recipe.some(([name,count])=>materialCount(this.save.items,name,rarity)<count)){this.onEvent("Gather matching-rarity materials and zeny first.");return false;}
    const freed=recipe.reduce((n,[name,count])=>n+this.save.items.filter(i=>i.count>0&&i.name===name&&materialRarity(i)===rarity).filter((i,idx,all)=>all.slice(0,idx+1).reduce((v,x)=>v+x.count,0)<=count).length,0);
    if(this.save.items.filter(i=>i.count>0).length-freed>=BAG_CAPACITY){this.onEvent("Make room in your bag first.");return false;}
    const item={...rollGear(gear.id,rarity,this.random),name:gear.name,icon:gear.icon,count:1};
    this.save.gold-=cost;for(const [name,count] of recipe){let remaining=count;for(const stack of this.save.items.filter(i=>i.name===name&&materialRarity(i)===rarity)){const used=Math.min(remaining,stack.count);stack.count-=used;remaining-=used;}}
    this.addEquipmentItem(item);this.progressQuest('craft');this.markTutorial('craft');this.onEvent(`Crafted ${gear.name}`,"reward");this.persist();return true;
  }
  equip(id:string) {
    const item=this.save.items.find(i=>i.id===id&&i.count===1),gear=item?.gearId?gearById(item.gearId):undefined;
    if(!gear||this.save.level<gear.level||(gear.job&&gear.job!==this.save.job)){this.onEvent("This equipment does not match your class or level.");return false;}
    this.save.equipped[gear.slot]=id;this.save.hp=Math.min(this.maxHp,this.save.hp);this.save.mp=Math.min(this.maxMp,this.save.mp);this.markTutorial('equip');this.onEvent(`Equipped ${gear.name}`,"reward");this.persist();return true;
  }
  unequip(slot:GearSlot) { if(!gearSlots.includes(slot))return;this.save.equipped[slot]=null;this.save.hp=Math.min(this.maxHp,this.save.hp);this.save.mp=Math.min(this.maxMp,this.save.mp);this.persist(); }
  get maxHp() {
    return progression.hpBase + (this.save.stats.vit+(this.gearBonuses.vit||0)) * progression.hpVit + (this.save.level - 1) * progression.hpPerLevel+(this.gearBonuses.hp||0);
  }
  get maxMp() {
    return progression.mpBase + (this.save.level - 1) * progression.mpPerLevel+(this.gearBonuses.mp||0);
  }
  get maxXp() {
    return this.save.level >= MAX_LEVEL ? 0 : progression.levels[this.save.level-1].nextLevelXp;
  }
  get damage() {
    const primary =
      this.save.job === "archer" ? this.agility : this.save.stats.str+(this.gearBonuses.str||0);
    return (
      progression.atkBase + primary * progression.atkPrimary + (this.save.level - 1) * progression.atkPerLevel+(this.gearBonuses.atk||0)
    );
  }
  get defense() {
    return (this.save.stats.vit+(this.gearBonuses.vit||0)) * progression.defVit + this.save.level * progression.defPerLevel+(this.gearBonuses.def||0);
  }
  get job() {
    return classes[this.save.job];
  }
  get skillList() {
    return skills[this.save.job].map(skill=>skillAtRank(skill,this.skillRank(skill.id)));
  }
  get unlockedSkills() {
    return this.skillList.filter(skill=>this.save.level>=skill.level&&this.save.skillChoices[this.save.job].includes(skill.id));
  }
  setClass(job: ClassId) {
    if (
      !isClass(job) ||
      this.target !== null ||
      this.cast ||
      this.monsters.some((monster) => monster.alive && monster.aggro && (!this.actorId || monster.owner === this.actorId))
    ) {
      this.onEvent("Leave combat before changing your class.");
      return false;
    }
    if (job === this.save.job) return true;
    this.save.job = job;
    const worn=this.save.items.find(i=>i.id===this.save.equipped.weapon);
    if(worn?.gearId&&gearById(worn.gearId)?.job&&gearById(worn.gearId)?.job!==job)this.save.equipped.weapon=null;
    this.save.hotbar = Array.from({length:6},(_,n)=>this.unlockedSkills[n]?.id||null);
    this.refreshCooldowns();
    this.guard.time = this.fury.time = 0;
    this.persist();
    this.onEvent(`You are now a ${this.job.name}.`, "level");
    return true;
  }
  assignSkill(slot: number, id: string) {
    if(id===''&&Number.isInteger(slot)&&slot>=0&&slot<6){this.save.hotbar[slot]=null;this.refreshCooldowns();this.persist();return true;}
    const skill = this.skillList.find((skill) => skill.id === id);
    if (
      !skill ||
      !this.unlockedSkills.some(k=>k.id===id) ||
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot > 5
    )
      return false;
    const previous = this.save.hotbar.indexOf(id);
    if (previous >= 0) this.save.hotbar[previous] = this.save.hotbar[slot];
    this.save.hotbar[slot] = id;
    this.refreshCooldowns();this.persist();
    return true;
  }
  skillRank(id:string){return this.save.skillRanks[id]||0;}
  get skillPoints(){return Math.max(0,this.save.level*skillRankConfig.pointsPerLevel-Object.values(this.save.skillRanks).reduce((sum,n)=>sum+n*skillRankConfig.rankCost,0));}
  upgradeSkill(id:string){const skill=this.skillList.find(s=>s.id===id);if(!skill||this.cast||!this.unlockedSkills.some(s=>s.id===id)||this.skillRank(id)>=skillRankCap(skill)||this.skillPoints<skillRankConfig.rankCost)return false;this.save.skillRanks[id]++;this.onEvent(`${skill.name} · Rank ${this.skillRank(id)}`,'reward');this.persist();return true;}
  chooseSkill(id:string){
    const skill=this.skillList.find(k=>k.id===id);if(!skill||this.cast||this.skillPoints<skillRankConfig.rankCost||this.save.level<skill.level||this.save.skillChoices[this.save.job][skill.stage-1]||skill.stage>1&&!this.save.skillChoices[this.save.job][skill.stage-2])return false;
    this.save.skillChoices[this.save.job][skill.stage-1]=id;this.save.skillRanks[id]=1;const slot=this.save.hotbar.indexOf(null);if(slot>=0)this.save.hotbar[slot]=id;this.onEvent(`Learned ${skill.name}`,'reward');this.persist();return true;
  }
  resetSkills(){
    if(this.target!==null||this.cast||this.guard.time>0||this.fury.time>0||Object.values(this.skillCooldowns).some(c=>c>0)||this.monsters.some(m=>m.alive&&m.aggro&&(!this.actorId||m.owner===this.actorId))){this.onEvent('Leave combat and wait for skill cooldowns and buffs before resetting.');return false;}
    for(const id of this.save.skillChoices[this.save.job])if(id)delete this.save.skillRanks[id];
    this.save.skillChoices[this.save.job]=Array(10).fill(null);this.save.hotbar=Array(6).fill(null);this.refreshCooldowns();this.persist();this.onEvent('Skill choices reset. Select one skill at each stage.');return true;
  }
  assignAuxiliary(slot:number,name:string|null){if(!Number.isInteger(slot)||slot<0||slot>3||name!==null&&!isAuxiliaryItem(name)||name===EXP_CHARM.name&&!this.save.items.some(i=>i.name===name&&i.count>0))return false;const previous=name?this.save.auxiliary.indexOf(name):-1;if(previous>=0)this.save.auxiliary[previous]=this.save.auxiliary[slot];this.save.auxiliary[slot]=name;this.persist();return true;}
  useAuxiliary(slot:number){if(this.paused||!Number.isInteger(slot)||slot<0||slot>3)return false;const name=this.save.auxiliary[slot];if(!isAuxiliaryItem(name)){this.onEvent('Assign a recovery item in the Skills window.');return false;}if(name===EXP_CHARM.name)return false;return this.usePotion(name==='Blue potion');}
  get experienceMultiplier(){return this.save.auxiliary.includes(EXP_CHARM.name)&&this.save.items.some(i=>i.name===EXP_CHARM.name&&i.count>0)?EXP_CHARM.multiplier:1;}
  addExperience(amount: number, gameplay = true) {
    if (this.save.level >= MAX_LEVEL) {
      this.save.xp = 0;
      return;
    }
    this.save.xp += Math.round(Math.max(0, Number.isFinite(amount)?amount:0)*(gameplay?this.experienceMultiplier:1));
    while (this.save.level < MAX_LEVEL && this.save.xp >= this.maxXp) {
      this.save.xp -= this.maxXp;
      this.save.level++;
      this.save.points += progression.pointsPerLevel;
      this.save.hp = this.maxHp;
      this.save.mp = this.maxMp;
      this.onEvent(`Level up! You are now level ${this.save.level}`, "level");
      if (this.save.level % 10 === 0)
        this.onEvent(
          `New skill unlocked: ${this.skillList[this.save.level / 10 - 1].name}`,
          "reward",
        );
    }
    if (this.save.level === MAX_LEVEL) this.save.xp = 0;
  }
  persist() {
    this.storage?.setItem("mossvale-save", JSON.stringify(this.save));
  }
  addItem(name: string, icon: string, count = 1, rarity:Rarity='common') {
    if(isRetiredMaterial({name}))return false;
    if(!isRarity(rarity))return false;
    if(isCraftMaterial(name))icon=materialIcon(name,rarity);
    const gear=gearByName(name);
    const existing=!gear&&this.save.items.find(i=>sameStack(i,{name,rarity}));if(!existing&&this.save.items.filter(i=>i.count>0).length+(gear?count:1)>BAG_CAPACITY){this.onEvent("Bag full. Make room before collecting.");return false;}
    if(gear){for(let n=0;n<count;n++)this.save.items.push({...rollGear(gear.id,gear.rarity,this.random),name,category:itemCategory({name}),icon:gear.icon,count:1});return true;}
    const item = this.save.items.find((i) => sameStack(i,{name,rarity}));
    if (item) item.count += count;
    else this.save.items.push({ name, icon, count, category:itemCategory({name}),...(isCraftMaterial(name)?{rarity,id:materialKey(name,rarity)}:{}) });
    return true;
  }
  useItem(name:string) {
    if(name==='Red potion'||name==='Blue potion')return this.usePotion(name==='Blue potion');
    if(name!==EXP_TOME.name)return false;
    if(this.save.level>=MAX_LEVEL){this.onEvent('Maximum level reached. EXP Tome kept.');return false;}
    if(this.deathTime>0||this.save.hp<=0)return false;
    const item=this.save.items.find(i=>i.name===EXP_TOME.name&&i.count>0);
    if(!item){this.onEvent('No EXP Tomes in your bag.');return false;}
    item.count--;this.addExperience(EXP_TOME.experience,false);
    this.onEvent(`Used EXP Tome · +${EXP_TOME.experience} EXP`,'reward');this.persist();return true;
  }
  usePotion(blue = false) {
    const item = this.save.items.find(
      (i) => i.name === (blue ? "Blue potion" : "Red potion"),
    );
    if(this.deathTime>0||this.save.hp<=0||this.auxiliaryCooldown>0)return false;
    if (!item?.count) {
      this.onEvent("No potions left. Visit the village merchant.");
      return false;
    }
    if (blue) {
      if (this.save.mp >= this.maxMp) {
        this.onEvent("Mana is already full");
        return false;
      }
      this.save.mp = Math.min(this.maxMp, this.save.mp + economy.bluePotion.heal*this.healingMultiplier);
    } else {
      if (this.save.hp >= this.maxHp) {
        this.onEvent("Health is already full");
        return false;
      }
      this.save.hp = Math.min(this.maxHp, this.save.hp + economy.redPotion.heal*this.healingMultiplier);
    }
    item.count--;
    this.auxiliaryCooldown=economy.potionCooldown;this.refreshCooldowns();
    this.onEvent(`${blue?"Mana":"Health"} restored +${Math.round((blue?economy.bluePotion.heal:economy.redPotion.heal)*this.healingMultiplier)}`, "heal");
    this.persist();
    return true;
  }
  select(id: number) {
    if (this.monsters[id]?.alive) {
      this.target = id;
      this.destination = null;
      this.route = [];
      this.routeTimer = 0;
    }
  }
  nearest() {
    const group=zoneMonsterGroups(this.save.zone).find(g=>insideMonsterGroup(this.save.zone,g.id,this.x,this.z));
    const living = this.monsters.filter((m) => m.alive&&(!group||m.groupId===group.id));
    living.sort(
      (a, b) =>
        Math.hypot(a.x - this.x, a.z - this.z) -
        Math.hypot(b.x - this.x, b.z - this.z),
    );
    if (living[0]) this.select(living[0].id);
  }
  actorId = "";
  enemyFilter: (monster: Monster) => boolean = () => true;
  onKill?: (monster: Monster) => boolean | void;
  admin = false;
  spawnItem(id:string,count:number,rarity:Rarity='common',refine=0){if(!this.admin||!this.online)this.onEvent('Admin spawning requires an authorized online account.');}
  online = false;
  connection = "Practice · saved on this device";
  community: import("../server/protocol.js").Snapshot["community"];
  communityAction(_type:string,..._args:unknown[]){this.onEvent("Community features require the online realm.");}
  remotePlayers: { id: string; name: string; job: ClassId; x: number; z: number; hp: number; maxHp: number }[] = [];
  goTo(x: number, z: number) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    this.target = null; this.destination = { x: Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, x)), z: Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, z)) }; this.route = []; this.routeTimer = 0;
  }
  clearTarget() { this.target = null; }
  setAuto(enabled: boolean) { this.auto = enabled; }
  stopMovementInput() {} // Practice consumes the current input directly on the next tick.
  buy(name: string) {
    if (!["Red potion", "Blue potion"].includes(name)) return;
    const blue = name === "Blue potion", cost = blue ? economy.bluePotion.cost : economy.redPotion.cost;
    if (this.save.gold < cost) { this.onEvent("Not enough zeny"); return; }
    if(!this.addItem(name, blue ? "💠" : "🧪"))return;this.save.gold -= cost; this.persist(); this.onEvent("Potion added to your bag", "reward");
  }
  sellItem(key:string,count=1){
    if(!Number.isSafeInteger(count)||count<1)return false;
    const item=this.save.items.find(i=>inventoryKey(i)===key&&i.count>0);
    if(!item||count>item.count||item.gearId&&(count!==1||item.count!==1)||item.id&&Object.values(this.save.equipped).includes(item.id))return false;
    const price=itemSalePrice(item);if(price<=0)return false;
    item.count-=count;this.save.items=this.save.items.filter(i=>i.count>0);this.save.gold+=price*count;
    this.onEvent(`Sold ${count} ${item.name} · +${price*count} z`,'reward');this.persist();return true;
  }
  salvageItem(key:string){
    const item=this.save.items.find(i=>inventoryKey(i)===key&&i.gearId&&i.count===1);
    if(!item||item.id&&Object.values(this.save.equipped).includes(item.id))return false;
    const yields=salvageYield(item);if(!yields.length)return false;
    const next=this.save.items.filter(i=>i!==item).map(i=>structuredClone(i));
    for(const material of yields){const stack=next.find(i=>sameStack(i,material));if(stack)stack.count+=material.count;else next.push({...material,id:materialKey(material.name,material.rarity),icon:materialIcon(material.name,material.rarity),category:'material'});}
    if(next.filter(i=>i.count>0).length>BAG_CAPACITY){this.onEvent('Bag full. Make room for salvage materials.');return false;}
    this.save.items=next;this.onEvent(`Salvaged ${item.name} · ${yields.map(i=>i.name+' ×'+i.count).join(' + ')}`,'reward');this.persist();return true;
  }
  sell() {
    let count = 0;
    this.save.items = this.save.items.filter(i => { if (i.name!==EXP_CHARM.name&&i.name!==EXP_TOME.name&&!i.name.includes("potion") && !i.gearId&&!Object.values(refineStones).some(stone=>stone.name===i.name)) { count += i.count; return false; } return true; });
    this.save.gold += count * 6; this.persist(); this.onEvent(count ? `Sold ${count} materials for ${count * 6} z` : "Gather monster drops to sell them.", "reward");
  }
  hit(m: Monster, amount: number, skill=false) {
    if (!m.alive) return;
    const variance = progression.varianceBase + this.random() * progression.varianceSpread;
    const critical =
      this.random() < this.criticalChance;
    amount = Math.max(
      1,
      Math.round(
        damageAfterDefense(
          amount *
            variance *
            (critical ? this.criticalMultiplier : 1) * (1+(this.gearBonuses.damageBonus||0)/100) * (skill?1+(this.gearBonuses.skillDamage||0)/100:1) *
            (1 + (this.fury.time > 0 ? this.fury.power : 0)),
          this.monsterSpec(m.kind).defense*(1-Math.min(progression.caps.armorPen,(this.gearBonuses.armorPen||0)/100)),
        ),
      ),
    );
    m.aggro = true;
    m.territoryAggro=insideMonsterGroup(this.save.zone,m.groupId,this.x,this.z);
    m.returning=false;
    m.owner = this.actorId;
    this.actionTime = 0.25;
    this.markTutorial("attack");
    const dealt=Math.min(Math.max(0,m.hp),amount);
    m.hp -= amount;
    if(this.save.hp>0)this.save.hp=Math.min(this.maxHp,this.save.hp+dealt*Math.min(progression.caps.lifesteal,(this.gearBonuses.lifesteal||0)/100));
    this.onEvent(String(amount), "damage", m.x, m.z);
    if (m.hp <= 0) {
      m.alive = false;
      m.respawn = this.monsterSpec(m.kind).boss?economy.monsters.respawnBoss:this.monsterSpec(m.kind).miniBoss?economy.monsters.respawnMini:economy.monsters.respawnNormal;
      const xpReward=this.monsterSpec(m.kind).xp*(1+(this.gearBonuses.expBonus||0)/100),goldReward=Math.round(this.monsterSpec(m.kind).gold*(1+(this.gearBonuses.goldBonus||0)/100));
      const shared=this.onKill?.(m);
      if(!shared){
      this.addExperience(xpReward);
      this.save.gold += goldReward;
      this.progressQuest("kills");if(this.monsterSpec(m.kind).boss)this.progressQuest("boss");this.markTutorial("attack");
      this.save.kills++;
      if(this.hasLegacyDrop(m))this.loot.push({
        x: m.x,
        z: m.z,
        name: this.monsterSpec(m.kind).drop,
        icon: this.monsterSpec(m.kind).icon,
      });
      const stone=this.rollStoneLoot(m);if(stone)this.loot.push({x:m.x,z:m.z,name:stone.name,icon:stone.icon});
      for(const equipmentDrop of this.rollEquipmentLoot(m))this.loot.push({x:m.x,z:m.z,name:equipmentDrop.name,icon:equipmentDrop.icon,item:equipmentDrop});
      for(const item of this.rollMaterialLoot(m))this.loot.push({x:m.x,z:m.z,name:item.name,icon:item.icon,item});
      this.loot=this.loot.slice(-40);
      }
      this.onEvent(
        shared?`Defeated ${m.kind} · Party rewards shared`:`Defeated ${m.kind} · +${Math.round(xpReward*this.experienceMultiplier)} EXP · +${goldReward} z`,
        "reward",
      );
      this.target = null;
      this.persist();
    }
  }
  skill(n:number){if(this.paused||!Number.isInteger(n)||n<0||n>5||this.cooldowns[n]>0)return;const id=this.save.hotbar[n];if(!id){this.onEvent('Learn and assign a skill in the Skills window.');return;}this.castSkill(id);}
  castSkill(id: string) {
    const skill = this.skillList.find((skill) => skill.id === id);
    if (
      this.paused ||
      this.cast ||
      !skill ||
      (this.skillCooldowns[id] || 0) > 0
    )
      return false;
    if (!this.unlockedSkills.some(k=>k.id===id)) {
      this.onEvent(`${skill.name} unlocks at level ${skill.level}.`);
      return false;
    }
    if(this.deathTime>0)return false;
    const self = ["heal", "guard", "fury"].includes(skill.effect);
    if (!self && this.target === null) this.nearest();
    const target = this.monsters.find(
      (monster) => monster.id === this.target && monster.alive,
    );
    if (
      !self &&
      (!target ||
        Math.hypot(target.x - this.x, target.z - this.z) > skill.range ||
        !this.direct(target.x, target.z))
    ) {
      this.onEvent("Move within clear range of your target.");
      return false;
    }
    if (this.save.mp < skill.mp) {
      this.onEvent("Not enough mana.");
      return false;
    }
    this.markTutorial("skill");
    this.save.mp -= skill.mp;
    this.skillCooldowns[id] = skill.cooldown*this.cooldownMultiplier;
    this.skillCooldownTotals[id] = this.skillCooldowns[id];
    if (skill.cast)
      this.cast = {
        skillId: id,
        targetId: target?.id ?? null,
        remaining: skill.cast,
        total: skill.cast,
      };
    else this.resolveSkill(skill, target?.id ?? null);
    this.refreshCooldowns();
    this.persist();
    return true;
  }
  skillCooldownRemaining(id: string) { return this.skillCooldowns[id] || 0; }
  skillCooldownRatio(id: string) {
    const remaining=this.skillCooldownRemaining(id);
    const total=this.skillCooldownTotals[id] || remaining;
    return total>0?Math.max(0,Math.min(1,remaining/total)):0;
  }
  private tryAutoSkill() {
    if(!this.auto||this.destination||this.cast||this.deathTime>0||this.save.hp<=0)return false;
    const learned=new Set(this.unlockedSkills.map(skill=>skill.id));
    const group=zoneMonsterGroups(this.save.zone).find(g=>insideMonsterGroup(this.save.zone,g.id,this.x,this.z));
    for(let offset=0;offset<6;offset++) {
      const slot=(this.autoSkillCursor+offset)%6,id=this.save.hotbar[slot];
      if(!id||!learned.has(id)||(this.skillCooldowns[id]||0)>0)continue;
      const skill=this.skillList.find(skill=>skill.id===id)!;
      if(this.save.mp<skill.mp)continue;
      const targets=this.monsters.filter(m=>m.alive&&(!group||m.groupId===group.id)&&Math.hypot(m.x-this.x,m.z-this.z)<=skill.range&&this.direct(m.x,m.z));
      targets.sort((a,b)=>(a.id===this.target?-1:b.id===this.target?1:Math.hypot(a.x-this.x,a.z-this.z)-Math.hypot(b.x-this.x,b.z-this.z)||a.id-b.id));
      if(!targets.length)continue;
      this.target=targets[0].id;
      if(this.castSkill(id)){this.autoSkillCursor=(slot+1)%6;return true;}
    }
    return false;
  }
  private resolveSkill(skill: Skill, targetId: number | null) {
    const monster = this.monsters.find(
      (monster) => monster.id === targetId && monster.alive,
    );
    this.actionTime = 0.35;
    if(["heal","guard","fury"].includes(skill.effect))this.onSupport?.(skill);
    if (skill.effect === "heal") {
      this.save.hp = Math.min(
        this.maxHp,
        this.save.hp + this.maxHp * skill.power*this.healingMultiplier,
      );
      this.onEvent(`${skill.name} · health restored`, "heal");
    } else if (skill.effect === "guard" || skill.effect === "fury") {
      const buff = skill.effect === "guard" ? this.guard : this.fury;
      buff.time = skill.duration || 6;
      buff.power = skill.power;
      this.onEvent(`${skill.name} active`, "reward");
    } else if (
      monster &&
      Math.hypot(monster.x - this.x, monster.z - this.z) <= skill.range &&
      this.direct(monster.x, monster.z)
    ) {
      const center=skill.effect==='area'&&this.save.job==='swordsman'?{x:this.x,z:this.z}:monster;
      const targets=this.monsters.filter(enemy=>enemy.alive&&Math.hypot(enemy.x-center.x,enemy.z-center.z)<=(skill.radius??skillRankConfig.defaultAttackRadius)&&Math.hypot(enemy.x-this.x,enemy.z-this.z)<=skill.range&&this.direct(enemy.x,enemy.z)).sort((a,b)=>a.id===monster.id?-1:b.id===monster.id?1:Math.hypot(a.x-center.x,a.z-center.z)-Math.hypot(b.x-center.x,b.z-center.z)||a.id-b.id).slice(0,skill.maxTargets||1);
      for(const enemy of targets){
        this.hit(enemy,this.damage*skill.power,true);
        if(!enemy.alive)continue;
        if(skill.effect==='area'&&skill.areaSlow!==false&&skill.duration)enemy.slow=skill.duration;
        if(skill.effect==='stun'){enemy.stun=skill.duration||2;enemy.windup=0;}
        if(skill.effect==='slow')enemy.slow=skill.duration||4;
        if(skill.effect==='poison'){enemy.poison=skill.duration||6;enemy.poisonTimer=1;enemy.poisonDamage=this.damage*progression.poisonAtkFactor;}
      }
      this.onEvent(skill.name,skill.effect==='area'?'whirl':'strike',center.x,center.z);
    } else this.onEvent("Cast missed: target moved out of range.");
  }
  private refreshCooldowns() {
    for(let n=6;n<10;n++)this.cooldowns[n]=this.auxiliaryCooldown;
    [0,1,2,3,4,5].forEach(
      (key, index) =>
        (this.cooldowns[key] =
          this.skillCooldowns[this.save.hotbar[index] || ""] || 0),
    );
  }
  collect() {
    let count = 0;
    this.loot = this.loot.filter((l) => {
      if (Math.hypot(l.x - this.x, l.z - this.z) < 3.2) {
        if(!(l.item?(l.item.gearId?this.addEquipmentItem(l.item):this.addItem(l.item.name,l.item.icon,l.item.count,materialRarity(l.item))):this.addItem(l.name,l.icon)))return true;
        count++;
        return false;
      }
      return true;
    });
    if (count) {
      this.markTutorial("collect");
      this.onEvent(`Picked up ${count} item${count > 1 ? "s" : ""}`, "reward");
      this.persist();
    } else this.onEvent("No drops nearby. Walk closer to the glowing loot.");
  }
  upgrade(id:string=this.save.equipped.weapon||'',tier:StoneTier='common') {
    if(!isStoneTier(tier))return false;
    const item=this.save.items.find(i=>i.id===id&&i.gearId&&i.count===1);
    if(!item||!gearById(item.gearId!)){this.onEvent('Choose an equipment item to refine.');return false;}
    const current=refineLevel(item.refine),cost=refineCost(current),stone=this.save.items.find(i=>i.name===refineStones[tier].name&&i.count>0);
    if(current>=refinement.cap){this.onEvent(`Refinement limit reached (+${refinement.cap}).`);return false;}
    if(!stone||this.save.gold<cost){this.onEvent(`Need 1 ${refineStones[tier].name} and ${cost} z.`);return false;}
    this.save.gold-=cost;stone.count--;
    const result=rollRefinement(current,tier,this.random);item.refine=result.level;
    this.save.hp=Math.min(this.save.hp,this.maxHp);this.save.mp=Math.min(this.save.mp,this.maxMp);
    this.markTutorial('refine');this.persist();
    this.onEvent(result.success?`${item.name}: +${current} → +${result.level}`:result.downgraded?`Refine failed · ${item.name}: +${current} → +${result.level}`:`Refine failed · ${item.name} stays +${current}`,result.success?'reward':'system');
    return true;
  }
  stat(key: "str" | "vit" | "agi") {
    if (this.save.points > 0) {
      this.save.stats[key]++;
      this.save.points--;
      this.persist();
    }
  }
  claim() {
    if (this.save.kills < 5 || this.save.questClaimed) return;
    this.save.gold += 100;
    this.addItem("Red potion", "🧪", 3);
    this.save.questClaimed = true;
    this.onEvent("Quest complete · +100 z · 3 Red potions", "level");
    this.persist();
  }
  blocked(x: number, z: number) {
    return this.obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.3);
  }
  direct(x: number, z: number) {
    const distance = Math.hypot(x - this.x, z - this.z),
      steps = Math.ceil(distance / 0.3);
    for (let i = 1; i <= steps; i++) {
      if (
        this.blocked(
          this.x + ((x - this.x) * i) / steps,
          this.z + ((z - this.z) * i) / steps,
        )
      )
        return false;
    }
    return true;
  }
  pathTo(x: number, z: number, startX=this.x, startZ=this.z, avoidProtected=false) {
    const blocked=(px:number,pz:number)=>(avoidProtected?this.obstacles.some(o=>Math.hypot(px-o.x,pz-o.z)<o.r+.65):this.blocked(px,pz))||(avoidProtected&&protectedPosition(this.save.zone,px,pz));
    const step = 0.65,
      key = (x: number, z: number) => `${x},${z}`;
    const sx = Math.round(startX / step),
      sz = Math.round(startZ / step),
      gx = Math.round(x / step),
      gz = Math.round(z / step);
    const open = [{ x: sx, z: sz, g: 0, f: 0 }],
      cost = new Map<string, number>([[key(sx, sz), 0]]),
      parent = new Map<string, string>();
    let found = "";
    let loops = 0;
    while (open.length && loops++ < 6500) {
      open.sort((a, b) => a.f - b.f);
      const p = open.shift()!,
        pk = key(p.x, p.z);
      if (Math.hypot(p.x - gx, p.z - gz) < 1.5) {
        found = pk;
        break;
      }
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        const nx = p.x + dx,
          nz = p.z + dz;
        if (
          Math.abs(nx * step) > WORLD_BOUNDS.maxX ||
          Math.abs(nz * step) > WORLD_BOUNDS.maxZ ||
          blocked(nx * step, nz * step)
        )
          continue;
        if (
          dx &&
          dz &&
          (blocked((p.x + dx) * step, p.z * step) ||
            blocked(p.x * step, (p.z + dz) * step))
        )
          continue;
        const nk = key(nx, nz),
          g = p.g + Math.hypot(dx, dz);
        if (g < (cost.get(nk) ?? Infinity)) {
          cost.set(nk, g);
          parent.set(nk, pk);
          open.push({ x: nx, z: nz, g, f: g + Math.hypot(nx - gx, nz - gz) });
        }
      }
    }
    const path: { x: number; z: number }[] = [];
    while (found && found !== key(sx, sz)) {
      const [xx, zz] = found.split(",").map(Number);
      path.unshift({ x: xx * step, z: zz * step });
      found = parent.get(found) || "";
    }
    return path;
  }
  tick(dt: number, dx: number, dz: number) {
    if (this.paused) return;
    if(this.deathTime>0){this.deathTime=Math.max(0,this.deathTime-dt);if(this.deathTime===0){this.save.hp=this.maxHp;this.save.mp=this.maxMp;this.x=0;this.z=2;this.onEvent("Rescued at camp", "level");this.persist();}return;}
    this.time += dt;
    this.routeTimer -= dt;
    this.attackTimer -= dt;
    this.auxiliaryCooldown=Math.max(0,this.auxiliaryCooldown-dt);
    this.cooldowns = this.cooldowns.map((c) => Math.max(0, c - dt));
    for (const id of Object.keys(this.skillCooldowns))
      this.skillCooldowns[id] = Math.max(0, this.skillCooldowns[id] - dt);
    this.refreshCooldowns();
    this.guard.time = Math.max(0, this.guard.time - dt);
    this.fury.time = Math.max(0, this.fury.time - dt);
    this.actionTime = Math.max(0, this.actionTime - dt);
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    if (this.cast) {
      if (dx || dz) {
        this.cast = null;
        this.onEvent("Cast interrupted by movement.");
      } else {
        this.cast.remaining -= dt;
        if (this.cast.remaining <= 0) {
          const cast = this.cast;
          this.cast = null;
          const skill = this.skillList.find(
            (skill) => skill.id === cast.skillId,
          );
          if (skill) this.resolveSkill(skill, cast.targetId);
        }
      }
    }
    this.save.mp = Math.min(this.maxMp, this.save.mp + dt*this.maxMp*this.mpRegenPercent/100);
    this.save.hp=Math.min(this.maxHp,this.save.hp+dt*this.maxHp*this.hpRegenPercent/100);
    if (dx || dz) {
      this.markTutorial("move");
      this.target = null;
      this.destination = null;
      const len = Math.hypot(dx, dz);
      this.x += (dx / Math.max(1,len)) * dt * this.movementSpeed;
      this.z += (dz / Math.max(1,len)) * dt * this.movementSpeed;
    } else {
      const autoSkillStarted=this.tryAutoSkill();
      const m = this.monsters.find((e) => e.id === this.target && e.alive);
      const dest = m || this.destination;
      if (dest) {
        const dist = Math.hypot(dest.x - this.x, dest.z - this.z);
        if (
          dist > (m ? this.job.range : 0.15) ||
          (m && !this.direct(m.x, m.z))
        ) {
          if(this.cast||autoSkillStarted||m&&zoneMonsterGroups(this.save.zone).some(g=>insideMonsterGroup(this.save.zone,g.id,this.x,this.z))) { /* Hold position while the pack runs into attack range. */ } else {
          let next: { x: number; z: number } = dest;
          if (!this.direct(dest.x, dest.z)) {
            if (this.routeTimer <= 0 || !this.route.length) {
              this.route = this.pathTo(dest.x, dest.z);
              this.routeTimer = 0.7;
            }
            while (
              this.route.length &&
              Math.hypot(this.route[0].x - this.x, this.route[0].z - this.z) <
                0.1
            )
              this.route.shift();
            next = this.route[0] || { x: this.x, z: this.z };
          } else this.route = [];
          const nd = Math.hypot(next.x - this.x, next.z - this.z);
          if (nd > 0.02) {
            this.markTutorial("move");
            const movement = Math.min(nd, dt * this.movementSpeed);
            this.x += ((next.x - this.x) / nd) * movement;
            this.z += ((next.z - this.z) / nd) * movement;
          }
          }
        } else if (m && this.attackTimer <= 0 && !this.cast && !autoSkillStarted) {
          this.hit(m, this.damage);
          this.attackTimer =
            this.attackInterval;
        } else if (!m) this.destination = null;
      } else if (this.auto) this.nearest();
    }
    for (const c of this.obstacles) {
      const dist = Math.hypot(this.x - c.x, this.z - c.z);
      if (dist < c.r + 0.3) {
        this.x = c.x + ((this.x - c.x) / (dist || 1)) * (c.r + 0.3);
        this.z = c.z + ((this.z - c.z) / (dist || 1)) * (c.r + 0.3);
      }
    }
    this.x = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, this.x));
    this.z = Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, this.z));
    for (const m of this.monsters) {
      if (!this.enemyFilter(m)) continue;
      if (!m.alive) {
        m.respawn -= dt;
        if (m.respawn <= 0) {
          m.alive = true;
          m.hp = this.monsterSpec(m.kind).hp;
          m.x = m.homeX;
          m.z = m.homeZ;
          m.stun = m.slow = m.poison = m.windup = 0;
          m.aggro = false;m.owner=undefined;m.returning=false;m.territoryAggro=false;
        }
        if(!m.alive)continue;
      }
      m.stun = Math.max(0, m.stun - dt);
      m.slow = Math.max(0, m.slow - dt);
      if (m.poison > 0) {
        m.poisonTimer -= dt;
        if (m.poisonTimer <= 0) {
          this.hit(m, m.poisonDamage,true);
          m.poisonTimer += 1;
        }
        m.poison = Math.max(0, m.poison - dt);
        if (!m.alive) continue;
      }
      if (m.stun > 0) continue;
      const d = Math.hypot(m.x - this.x, m.z - this.z);
      const spec=this.monsterSpec(m.kind),elite=!!(spec.boss||spec.miniBoss);
      const safe=protectedPosition(this.save.zone,this.x,this.z);
      const inGroup=insideMonsterGroup(this.save.zone,m.groupId,this.x,this.z)&&this.save.hp>0&&this.deathTime<=0;
      if(m.groupId){
        if(inGroup){if(!m.territoryAggro){m.rushRoute=this.pathTo(this.x,this.z,m.x,m.z,true);m.rushRouteRetry=1;m.rushGoal={x:this.x,z:this.z};}m.aggro=true;m.owner=this.actorId;m.returning=false;m.territoryAggro=true;}
        else if(m.territoryAggro){m.returning=true;m.aggro=false;m.owner=undefined;m.windup=0;m.territoryAggro=false;}
      }
      if(elite&&!m.aggro&&!m.returning&&d<(spec.aggroRadius||8)&&!safe&&this.save.hp>0){m.aggro=true;m.owner=this.actorId;}
      if((m.aggro||m.id===this.target)&&(safe||this.save.hp<=0||(!m.territoryAggro&&d>(elite?22:8))||(!m.territoryAggro&&Math.hypot(m.x-m.homeX,m.z-m.homeZ)>(spec.leashRadius||10)))){m.returning=true;m.aggro=false;m.owner=undefined;m.windup=0;}
      if(m.returning){
        const homeDistance=Math.hypot(m.x-m.homeX,m.z-m.homeZ),step=Math.min(homeDistance,dt*4);
        if(!m.groupId)m.hp=Math.min(spec.hp,m.hp+spec.hp*dt*economy.monsters.homeRegen);m.stun=m.slow=m.poison=0;
        if(homeDistance<.15){m.x=m.homeX;m.z=m.homeZ;if(!m.groupId)m.hp=spec.hp;m.returning=false;}
        else {const nx=m.x+(m.homeX-m.x)/homeDistance*step,nz=m.z+(m.homeZ-m.z)/homeDistance*step;if(!this.blocked(nx,nz)){m.x=nx;m.z=nz;}else {m.x=m.homeX;m.z=m.homeZ;if(!m.groupId)m.hp=spec.hp;m.returning=false;}}
        continue;
      }
      if ((m.id === this.target || m.aggro) && !safe && (m.territoryAggro||d < (elite?22:8))) {
        if (m.windup > 0) {
          m.windup -= dt;
          if (m.windup <= 0) {
            const spec=this.monsterSpec(m.kind),range=spec.boss?(m.shape==='line'?6:m.shape==='cone'?4:3.5):spec.range;
            const rx=this.x-m.x,rz=this.z-m.z,forward=rx*(m.facingX??0)+rz*(m.facingZ??1),side=Math.abs(rx*(m.facingZ??1)-rz*(m.facingX??0));
            const connects=m.shape==='line'?forward>=0&&forward<=range&&side<.9:m.shape==='cone'?d<=range&&(d<.01||forward/d>.65):d<range;
            if (connects && this.random()>=Math.min(progression.caps.dodge,(this.gearBonuses.dodgeChance||0)/100)) {
              const atk = spec.atk * (progression.varianceBase + this.random() * progression.varianceSpread);
              const amount = Math.max(
                1,
                Math.round(
                  damageAfterDefense(atk, this.defense) *
                    (1 - (this.guard.time > 0 ? this.guard.power : 0)) * (1-Math.min(progression.caps.damageReduction,(this.gearBonuses.damageReduction||0)/100)),
                ),
              );
              this.save.hp -= amount;
              this.hurtTime = 0.25;
              this.onEvent(`−${amount}`, "hurt", this.x, this.z);
            } else this.onEvent("Dodged!", "reward");
            if(m.shape==='line') {
              const nx=m.x+(m.facingX??0)*range*.6,nz=m.z+(m.facingZ??1)*range*.6;
              if(Math.abs(nx)<WORLD_BOUNDS.maxX&&Math.abs(nz)<WORLD_BOUNDS.maxZ&&!this.blocked(nx,nz)){m.x=nx;m.z=nz;}
            }
            m.attack = spec.boss?economy.monsters.attackRestBoss:economy.monsters.attackRestNormal;
          }
        } else {
          const spec=this.monsterSpec(m.kind);
          if (d > (m.territoryAggro?1.1:Math.min(spec.range*.75,2.2))) {
            const speed=m.territoryAggro?monsterGroupConfig.runSpeed:spec.family==='beast'?2:spec.family==='golem'?1:1.4;
            const step = dt * (m.slow > 0 ? speed*.5 : speed);
            let goalX=this.x,goalZ=this.z;
            const directX=m.x+(this.x-m.x)/d*step,directZ=m.z+(this.z-m.z)/d*step;
            if(m.territoryAggro){
              m.rushRouteRetry=Math.max(0,(m.rushRouteRetry||0)-dt);
              if(m.rushGoal&&Math.hypot(this.x-m.rushGoal.x,this.z-m.rushGoal.z)>2)m.rushRoute=[];
              if((this.blocked(directX,directZ)||protectedPosition(this.save.zone,directX,directZ))&&!m.rushRoute?.length&&!m.rushRouteRetry){
                m.rushRoute=this.pathTo(this.x,this.z,m.x,m.z,true);m.rushGoal={x:this.x,z:this.z};m.rushRouteRetry=1;
              }
              while(m.rushRoute?.length&&Math.hypot(m.rushRoute[0].x-m.x,m.rushRoute[0].z-m.z)<.2)m.rushRoute.shift();
              if(m.rushRoute?.length){goalX=m.rushRoute[0].x;goalZ=m.rushRoute[0].z;}
            }
            const distance=Math.hypot(goalX-m.x,goalZ-m.z),travel=Math.min(step,distance);
            const nx=m.x+(goalX-m.x)/(distance||1)*travel,nz=m.z+(goalZ-m.z)/(distance||1)*travel;
            if (!this.blocked(nx,nz)&&!protectedPosition(this.save.zone,nx,nz)) {m.x=nx;m.z=nz;}
          }
          m.attack -= dt;
          if (d < spec.range+.2 && m.attack <= 0) {
            m.shape=spec.boss?(['circle','line','cone'] as const)[(m.pattern||0)%3]:spec.shape;
            m.pattern=(m.pattern||0)+1;m.windup=spec.windup;this.onEvent(m.kind,"telegraph",m.x,m.z);
            m.facingX=(this.x-m.x)/(d||1);m.facingZ=(this.z-m.z)/(d||1);
          }
        }
      } else {
        m.aggro = false;
        m.windup = 0;
        m.x = m.homeX + Math.sin(this.time * 0.35 + m.id) * 0.55;
        m.z = m.homeZ + Math.cos(this.time * 0.25 + m.id) * 0.55;
      }
    }
    if (this.save.hp <= 0) {
      this.save.hp = 0;this.deathTime=economy.deathDelay;
      this.target = null;
      this.cast = null;
      this.destination = null;
      this.route = [];
      this.guard.time = this.fury.time = 0;
      this.save.gold = Math.max(0, this.save.gold - economy.deathGold);
      this.onEvent(`Rescued at camp · ${economy.deathGold} z recovery fee`, "level");
      this.persist();
    }
  }
}
