import {
  classes,
  skills,
  MAX_LEVEL,
  isClass,
  damageAfterDefense,
  type ClassId,
  type Skill,
} from "./game/classes";
import { species, zones, isZone, questDefinitions, type Kind, type ZoneId, type AttackShape } from "./game/content";
import { equipment, gearById, gearByName, type GearSlot, type Bonuses, type Rarity, BAG_CAPACITY, gearSlots, itemBonuses, rollGear, rollEquipmentDrop, setBonuses, gearSets } from "./game/equipment";
import { zoneObstacles } from "./game/map-data";
export { species } from "./game/content";
export type { Kind } from "./game/content";
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
  facingX?: number; facingZ?: number; pattern?: number; shape?: AttackShape;
};
export type Item = { name: string; icon: string; count: number; id?:string; gearId?:string; refine?:number; rarity?:Rarity; secondary?:Bonuses };
export type Save = {
  version: number;
  zone: ZoneId;
  equipped: Record<GearSlot, string | null>;
  quests: Record<string,{progress:number;claimed:boolean}>;
  tutorial: string[];
  job: ClassId;
  hotbar: (string | null)[];
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
  version: 4,
  zone: "glade",
  equipped: {weapon:null,helmet:null,armor:null,gloves:null,boots:null,accessory:null},
  quests: {},
  tutorial: [],
  job: "swordsman",
  hotbar: ["swordsman-1", "swordsman-2", null, null],
  level: 1,
  xp: 0,
  gold: 120,
  hp: 120,
  mp: 60,
  kills: 0,
  questClaimed: false,
  weapon: 0,
  stats: { str: 5, vit: 5, agi: 5 },
  points: 3,
  skillLevel: 1,
  items: [
    { name: "Red potion", icon: "🧪", count: 8 },
    { name: "Blue potion", icon: "💠", count: 4 },
  ],
};
export class Simulation {
  save: Save;
  get renderX(){return this.x}
  get renderZ(){return this.z}
  x = 0;
  z = 2;
  target: number | null = null;
  destination: { x: number; z: number } | null = null;
  attackTimer = 0;
  time = 0;
  paused = false;
  auto = false;
  cooldowns = [0, 0, 0, 0, 0, 0];
  skillCooldowns: Record<string, number> = {};
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
  monsterSpec(kind:Kind){return {...species[kind],...this.balance[kind]};}
  monsters: Monster[] = [];
  loot: { x: number; z: number; name: string; icon: string; item?:Item }[] = [];
  obstacles: { x: number; z: number; r: number }[] = [];
  route: { x: number; z: number }[] = [];
  routeTimer = 0;
  onEvent: (text: string, type?: string, x?: number, z?: number) => void =
    () => {};
  constructor(private random: () => number = Math.random, initial?: Save, private storage: Pick<Storage, "getItem" | "setItem"> | null = typeof localStorage === "undefined" ? null : localStorage) {
    try {
      const s = initial ?? JSON.parse(this.storage?.getItem("mossvale-save") || "null");
      this.save =
        s?.level && s?.stats && Array.isArray(s.items)
          ? { ...structuredClone(defaults), ...s }
          : structuredClone(defaults);
    } catch {
      this.save = structuredClone(defaults);
    }
    this.save.job = isClass(this.save.job) ? this.save.job : "swordsman";
    this.save.version = 4;
    this.save.zone = isZone(this.save.zone) ? this.save.zone : "glade";
    this.save.equipped = {...defaults.equipped,...this.save.equipped};
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
    const available = skills[this.save.job];
    const used = new Set<string>();
    this.save.hotbar = Array.from({ length: 4 }, (_, index) => {
      const id = Array.isArray(this.save.hotbar)
        ? this.save.hotbar[index]
        : available[index]?.id;
      if (!id || !available.some((skill) => skill.id === id) || used.has(id))
        return null;
      used.add(id);
      return id;
    });
    this.save.hp = Math.max(
      1,
      Math.min(this.maxHp, Number(this.save.hp) || this.maxHp),
    );
    this.save.mp = Math.max(0, Math.min(this.maxMp, Number(this.save.mp) || 0));
    this.populateZone(this.save.zone);
  }
  populateZone(zone: ZoneId) {
    const positions=[[-3,4],[4,3],[-6,-1],[7,-3],[2,-5],[-9,7],[9,5.5],[-4,-7],[11,1],[-11,-4],[5,10],[-1,10],[-8,-10],[10,-9],[0,-11]];
    const kinds=zones[zone].species;
    this.monsters=[];
    if(kinds.length) {
      const entries=zone==='glade' ? [...positions.map((pos,id)=>({pos,kind:kinds[id%3]})),{pos:[-11,11],kind:kinds[3]},{pos:[11,11],kind:kinds[4]}] : zone==='ruins' ? [...positions.map((pos,id)=>({pos,kind:kinds[id%5]})),{pos:[0,-7],kind:kinds[5]}] : positions.map((pos,id)=>({pos,kind:kinds[id%kinds.length]}));
      for(const {pos:[x,z],kind} of entries) this.monsters.push({id:this.monsters.length,kind,x,z,hp:this.monsterSpec(kind).hp,alive:true,respawn:0,attack:0,homeX:x,homeZ:z,stun:0,slow:0,poison:0,poisonTimer:0,poisonDamage:0,windup:0,aggro:false,pattern:0});
    }
    this.obstacles=zoneObstacles(zone);
  }
  get zone() { return zones[this.save.zone]; }
  get refinement() {return this.save.items.find(i=>i.id===this.save.equipped.weapon)?.refine || (this.save.equipped.weapon?0:this.save.weapon);}
  private bonusCache?:{save:Save;key:string;value:Bonuses};
  get gearBonuses(): Bonuses {
    const key=this.save.job+':'+Object.values(this.save.equipped).join(',');
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
  get criticalChance(){return Math.min(.6,.05+this.agility*.002+(this.gearBonuses.critChance||0)/100)}
  get criticalMultiplier(){return 1.5+(this.gearBonuses.critDamage||0)/100}
  get movementSpeed(){return 4.4*(1+Math.min(.5,(this.gearBonuses.moveSpeed||0)/100))}
  get attackInterval(){return this.job.speed/((1+(this.agility-5)*.04)*(1+Math.min(1,(this.gearBonuses.attackSpeed||0)/100)))}
  get cooldownMultiplier(){return 1-Math.min(.4,(this.gearBonuses.cooldownReduction||0)/100)}
  get healingMultiplier(){return 1+Math.min(1,(this.gearBonuses.healingBonus||0)/100)}
  addEquipmentItem(item:Item){if(this.save.items.some(i=>i.id===item.id))return false;if(this.save.items.filter(i=>i.count>0).length>=BAG_CAPACITY){this.onEvent('Bag full. Make room before collecting.');return false;}this.save.items.push(structuredClone(item));return true;}
  rollEquipmentLoot(monster:Monster):Item|undefined {const rolled=rollEquipmentDrop(this.monsterSpec(monster.kind).level,!!this.monsterSpec(monster.kind).boss,this.random);if(!rolled)return;const gear=gearById(rolled.gearId!)!;return {...rolled,name:gear.name,icon:gear.icon,count:1};}
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
    if(!this.addItem(quest.item,"🌿",quest.count))return false;state.claimed=true;this.save.gold+=quest.gold;this.addExperience(quest.xp);this.onEvent(`Quest complete: ${quest.name}`,"reward");this.persist();return true;
  }
  travel(zone:ZoneId,allowDungeon=false) {
    if(!isZone(zone)||zone===this.save.zone)return false;
    if(this.target!==null||this.cast||this.monsters.some(m=>m.alive&&m.aggro&&(!this.actorId||m.owner===this.actorId))){this.onEvent("Leave combat before travelling.");return false;}
    if(this.save.level<zones[zone].level){this.onEvent(`Reach Lv ${zones[zone].level} to enter ${zones[zone].name}.`);return false;}
    if(zone==='ruins'&&this.online&&!allowDungeon){this.onEvent("Gather a party of 2–4 before entering the ruins.");return false;}
    if(Math.hypot(this.x,this.z+11)>3){this.onEvent("Walk to the glowing north portal to travel.");this.goTo(0,-11);return false;}
    this.save.zone=zone;this.populateZone(zone);this.x=0;this.z=-9;this.clearTarget();this.destination=null;this.route=[];this.auto=false;this.loot=[];this.onEvent(`Arrived in ${zones[zone].name}`,"zone");this.markTutorial('travel');this.persist();return true;
  }
  interact(id:string) {
    const npc=this.zone.npcs.find(n=>n.id===id);if(!npc)return;
    if(Math.hypot(this.x-npc.x,this.z-npc.z)>3){this.goTo(npc.x,npc.z);this.onEvent("Walk closer to speak with "+npc.name);return;}
    this.markTutorial("talk");this.onEvent(npc.panel,"npc");this.persist();
  }
  craft(id:string) {
    const gear=gearById(id);
    if(!gear||gear.dropOnly||this.save.level<gear.level){this.onEvent("You have not reached this recipe’s level.");return false;}
    if(this.save.items.filter(i=>i.count>0).length>=60){this.onEvent("Make room in your bag first.");return false;}
    if(this.save.gold<gear.cost||gear.materials.some(([name,count])=>(this.save.items.find(i=>i.name===name)?.count||0)<count)){this.onEvent("Gather the recipe’s materials and zeny first.");return false;}
    this.save.gold-=gear.cost;for(const [name,count] of gear.materials)this.save.items.find(i=>i.name===name)!.count-=count;
    this.addItem(gear.name,gear.icon);this.progressQuest('craft');this.markTutorial('craft');this.onEvent(`Crafted ${gear.name}`,"reward");this.persist();return true;
  }
  equip(id:string) {
    const item=this.save.items.find(i=>i.id===id&&i.count===1),gear=item?.gearId?gearById(item.gearId):undefined;
    if(!gear||this.save.level<gear.level||(gear.job&&gear.job!==this.save.job)){this.onEvent("This equipment does not match your class or level.");return false;}
    this.save.equipped[gear.slot]=id;this.save.hp=Math.min(this.maxHp,this.save.hp);this.save.mp=Math.min(this.maxMp,this.save.mp);this.markTutorial('equip');this.onEvent(`Equipped ${gear.name}`,"reward");this.persist();return true;
  }
  unequip(slot:GearSlot) { if(!gearSlots.includes(slot))return;this.save.equipped[slot]=null;this.save.hp=Math.min(this.maxHp,this.save.hp);this.save.mp=Math.min(this.maxMp,this.save.mp);this.persist(); }
  get maxHp() {
    return 100 + (this.save.stats.vit+(this.gearBonuses.vit||0)) * 4 + (this.save.level - 1) * 12+(this.gearBonuses.hp||0);
  }
  get maxMp() {
    return 60 + (this.save.level - 1) * 8+(this.gearBonuses.mp||0);
  }
  get maxXp() {
    return 80 + this.save.level * 40;
  }
  get damage() {
    const primary =
      this.save.job === "archer" ? this.agility : this.save.stats.str+(this.gearBonuses.str||0);
    return (
      12 + primary * 2 + this.refinement * 7 + (this.save.level - 1) * 1.5+(this.gearBonuses.atk||0)
    );
  }
  get defense() {
    return (this.save.stats.vit+(this.gearBonuses.vit||0)) * 2 + this.save.level * 0.5+(this.gearBonuses.def||0);
  }
  get job() {
    return classes[this.save.job];
  }
  get skillList() {
    return skills[this.save.job];
  }
  get unlockedSkills() {
    return this.skillList.filter((skill) => this.save.level >= skill.level);
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
    this.save.hotbar = [skills[job][0].id, skills[job][1].id, null, null];
    this.skillCooldowns = {};
    this.cooldowns.fill(0);
    this.guard.time = this.fury.time = 0;
    this.persist();
    this.onEvent(`You are now a ${this.job.name}.`, "level");
    return true;
  }
  assignSkill(slot: number, id: string) {
    const skill = this.skillList.find((skill) => skill.id === id);
    if (
      !skill ||
      this.save.level < skill.level ||
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot > 3
    )
      return false;
    const previous = this.save.hotbar.indexOf(id);
    if (previous >= 0) this.save.hotbar[previous] = this.save.hotbar[slot];
    this.save.hotbar[slot] = id;
    this.persist();
    return true;
  }
  addExperience(amount: number) {
    if (this.save.level >= MAX_LEVEL) {
      this.save.xp = 0;
      return;
    }
    this.save.xp += Math.max(0, amount);
    while (this.save.level < MAX_LEVEL && this.save.xp >= this.maxXp) {
      this.save.xp -= this.maxXp;
      this.save.level++;
      this.save.points += 3;
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
  addItem(name: string, icon: string, count = 1) {
    const gear=gearByName(name);
    const existing=!gear&&this.save.items.find(i=>i.name===name);if(!existing&&this.save.items.filter(i=>i.count>0).length+(gear?count:1)>BAG_CAPACITY){this.onEvent("Bag full. Make room before collecting.");return false;}
    if(gear){for(let n=0;n<count;n++)this.save.items.push({...rollGear(gear.id,gear.rarity,this.random),name,icon:gear.icon,count:1});return true;}
    const item = this.save.items.find((i) => i.name === name);
    if (item) item.count += count;
    else this.save.items.push({ name, icon, count });
    return true;
  }
  usePotion(blue = false) {
    const item = this.save.items.find(
      (i) => i.name === (blue ? "Blue potion" : "Red potion"),
    );
    if(this.deathTime>0)return;
    if (!item?.count) {
      this.onEvent("No potions left. Visit the village merchant.");
      return;
    }
    if (blue) {
      if (this.save.mp >= this.maxMp) {
        this.onEvent("Mana is already full");
        return;
      }
      this.save.mp = Math.min(this.maxMp, this.save.mp + 40*this.healingMultiplier);
    } else {
      if (this.save.hp >= this.maxHp) {
        this.onEvent("Health is already full");
        return;
      }
      this.save.hp = Math.min(this.maxHp, this.save.hp + 65*this.healingMultiplier);
    }
    item.count--;
    this.onEvent(`${blue?"Mana":"Health"} restored +${Math.round((blue?40:65)*this.healingMultiplier)}`, "heal");
    this.persist();
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
    const living = this.monsters.filter((m) => m.alive);
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
  online = false;
  connection = "Practice · saved on this device";
  community: import("../server/protocol").Snapshot["community"];
  communityAction(_type:string,..._args:unknown[]){this.onEvent("Community features require the online realm.");}
  remotePlayers: { id: string; name: string; job: ClassId; x: number; z: number; hp: number; maxHp: number }[] = [];
  goTo(x: number, z: number) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    this.target = null; this.destination = { x: Math.max(-14, Math.min(14, x)), z: Math.max(-13, Math.min(13, z)) }; this.route = []; this.routeTimer = 0;
  }
  clearTarget() { this.target = null; }
  setAuto(enabled: boolean) { this.auto = enabled; }
  buy(name: string) {
    if (!["Red potion", "Blue potion"].includes(name)) return;
    const blue = name === "Blue potion", cost = blue ? 20 : 15;
    if (this.save.gold < cost) { this.onEvent("Not enough zeny"); return; }
    if(!this.addItem(name, blue ? "💠" : "🧪"))return;this.save.gold -= cost; this.persist(); this.onEvent("Potion added to your bag", "reward");
  }
  sell() {
    let count = 0;
    this.save.items = this.save.items.filter(i => { if (!i.name.includes("potion") && !i.gearId) { count += i.count; return false; } return true; });
    this.save.gold += count * 6; this.persist(); this.onEvent(count ? `Sold ${count} materials for ${count * 6} z` : "Gather monster drops to sell them.", "reward");
  }
  hit(m: Monster, amount: number, skill=false) {
    if (!m.alive) return;
    const variance = 0.9 + this.random() * 0.2;
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
          this.monsterSpec(m.kind).defense*(1-Math.min(.6,(this.gearBonuses.armorPen||0)/100)),
        ),
      ),
    );
    m.aggro = true;
    m.owner = this.actorId;
    this.actionTime = 0.25;
    this.markTutorial("attack");
    const dealt=Math.min(Math.max(0,m.hp),amount);
    m.hp -= amount;
    if(this.save.hp>0)this.save.hp=Math.min(this.maxHp,this.save.hp+dealt*Math.min(.25,(this.gearBonuses.lifesteal||0)/100));
    this.onEvent(String(amount), "damage", m.x, m.z);
    if (m.hp <= 0) {
      m.alive = false;
      m.respawn = 13;
      const xpReward=Math.round(this.monsterSpec(m.kind).xp*(1+(this.gearBonuses.expBonus||0)/100)),goldReward=Math.round(this.monsterSpec(m.kind).gold*(1+(this.gearBonuses.goldBonus||0)/100));
      const shared=this.onKill?.(m);
      if(!shared){
      this.addExperience(xpReward);
      this.save.gold += goldReward;
      this.progressQuest("kills");if(this.monsterSpec(m.kind).boss)this.progressQuest("boss");this.markTutorial("attack");
      this.save.kills++;
      this.loot.push({
        x: m.x,
        z: m.z,
        name: this.monsterSpec(m.kind).drop,
        icon: this.monsterSpec(m.kind).icon,
      });
      const equipmentDrop=this.rollEquipmentLoot(m);if(equipmentDrop)this.loot.push({x:m.x,z:m.z,name:equipmentDrop.name,icon:equipmentDrop.icon,item:equipmentDrop});
      this.loot=this.loot.slice(-40);
      }
      this.onEvent(
        shared?`Defeated ${m.kind} · Party rewards shared`:`Defeated ${m.kind} · +${xpReward} EXP · +${goldReward} z`,
        "reward",
      );
      this.target = null;
      this.persist();
    }
  }
  skill(n: number) {
    if (this.paused || this.cooldowns[n] > 0) return;
    if (n === 2 || n === 3) {
      this.usePotion(n === 3);
      this.cooldowns[n] = 2;
      return;
    }
    const slot = [0, 1, 4, 5].indexOf(n);
    if (slot < 0) return;
    const id = this.save.hotbar[slot];
    if (!id) {
      this.onEvent("Assign a skill in the Skills window.");
      return;
    }
    this.castSkill(id);
  }
  castSkill(id: string) {
    const skill = this.skillList.find((skill) => skill.id === id);
    if (
      this.paused ||
      this.cast ||
      !skill ||
      (this.skillCooldowns[id] || 0) > 0
    )
      return false;
    if (this.save.level < skill.level) {
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
      if (skill.effect === "area") {
        const center =
          this.save.job === "swordsman" ? { x: this.x, z: this.z } : monster;
        for (const enemy of this.monsters) {
          if (
            enemy.alive &&
            Math.hypot(enemy.x - center.x, enemy.z - center.z) <=
              (skill.radius || 3) &&
            this.direct(enemy.x, enemy.z)
          ) {
            this.hit(enemy, this.damage * skill.power,true);
            if (skill.duration) enemy.slow = skill.duration;
          }
        }
        this.onEvent(skill.name, "whirl", center.x, center.z);
      } else {
        this.hit(monster, this.damage * skill.power,true);
        if (monster.alive) {
          if (skill.effect === "stun") {
            monster.stun = skill.duration || 2;
            monster.windup = 0;
          }
          if (skill.effect === "slow") monster.slow = skill.duration || 4;
          if (skill.effect === "poison") {
            monster.poison = skill.duration || 6;
            monster.poisonTimer = 1;
            monster.poisonDamage = this.damage * 0.25;
          }
        }
        this.onEvent(skill.name, "strike", monster.x, monster.z);
      }
    } else this.onEvent("Cast missed: target moved out of range.");
  }
  private refreshCooldowns() {
    [0, 1, 4, 5].forEach(
      (key, index) =>
        (this.cooldowns[key] =
          this.skillCooldowns[this.save.hotbar[index] || ""] || 0),
    );
  }
  collect() {
    let count = 0;
    this.loot = this.loot.filter((l) => {
      if (Math.hypot(l.x - this.x, l.z - this.z) < 3.2) {
        if(!(l.item?this.addEquipmentItem(l.item):this.addItem(l.name,l.icon)))return true;
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
  upgrade() {
    const cost = 60 + this.refinement * 40;
    if(this.refinement>=20){this.onEvent("Refinement limit reached (+20).");return;}
    if (this.save.gold < cost) {
      this.onEvent(
        `You need ${cost} z to refine your ${this.job.weapon.toLowerCase()}`,
      );
      return;
    }
    this.save.gold -= cost;
    const equipped=this.save.items.find(i=>i.id===this.save.equipped.weapon);
    if(equipped)equipped.refine=(equipped.refine||0)+1;else this.save.weapon++;
    this.markTutorial("refine");
    this.onEvent(`${this.job.weapon} refined to +${this.refinement}`, "level");
    this.persist();
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
  pathTo(x: number, z: number) {
    const step = 0.65,
      key = (x: number, z: number) => `${x},${z}`;
    const sx = Math.round(this.x / step),
      sz = Math.round(this.z / step),
      gx = Math.round(x / step),
      gz = Math.round(z / step);
    const open = [{ x: sx, z: sz, g: 0, f: 0 }],
      cost = new Map<string, number>([[key(sx, sz), 0]]),
      parent = new Map<string, string>();
    let found = "";
    let loops = 0;
    while (open.length && loops++ < 2200) {
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
          Math.abs(nx * step) > 14 ||
          Math.abs(nz * step) > 13 ||
          this.blocked(nx * step, nz * step)
        )
          continue;
        if (
          dx &&
          dz &&
          (this.blocked((p.x + dx) * step, p.z * step) ||
            this.blocked(p.x * step, (p.z + dz) * step))
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
    this.save.mp = Math.min(this.maxMp, this.save.mp + dt * (0.7+(this.gearBonuses.mpRegen||0)));
    this.save.hp=Math.min(this.maxHp,this.save.hp+dt*(this.gearBonuses.hpRegen||0));
    if (dx || dz) {
      this.markTutorial("move");
      this.target = null;
      this.destination = null;
      const len = Math.hypot(dx, dz);
      this.x += (dx / len) * dt * this.movementSpeed;
      this.z += (dz / len) * dt * this.movementSpeed;
    } else {
      const m = this.monsters.find((e) => e.id === this.target && e.alive);
      const dest = m || this.destination;
      if (dest) {
        const dist = Math.hypot(dest.x - this.x, dest.z - this.z);
        if (
          dist > (m ? this.job.range : 0.15) ||
          (m && !this.direct(m.x, m.z))
        ) {
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
        } else if (m && this.attackTimer <= 0 && !this.cast) {
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
    this.x = Math.max(-14, Math.min(14, this.x));
    this.z = Math.max(-13, Math.min(13, this.z));
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
          m.aggro = false;
        }
        continue;
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
      if ((m.id === this.target || m.aggro) && d < 8) {
        if (m.windup > 0) {
          m.windup -= dt;
          if (m.windup <= 0) {
            const spec=this.monsterSpec(m.kind),range=spec.boss?(m.shape==='line'?6:m.shape==='cone'?4:3.5):spec.range;
            const rx=this.x-m.x,rz=this.z-m.z,forward=rx*(m.facingX??0)+rz*(m.facingZ??1),side=Math.abs(rx*(m.facingZ??1)-rz*(m.facingX??0));
            const connects=m.shape==='line'?forward>=0&&forward<=range&&side<.9:m.shape==='cone'?d<=range&&(d<.01||forward/d>.65):d<range;
            if (connects && this.random()>=Math.min(.35,(this.gearBonuses.dodgeChance||0)/100)) {
              const atk = spec.atk * (0.9 + this.random() * 0.2);
              const amount = Math.max(
                1,
                Math.round(
                  damageAfterDefense(atk, this.defense) *
                    (1 - (this.guard.time > 0 ? this.guard.power : 0)) * (1-Math.min(.6,(this.gearBonuses.damageReduction||0)/100)),
                ),
              );
              this.save.hp -= amount;
              this.hurtTime = 0.25;
              this.onEvent(`−${amount}`, "hurt", this.x, this.z);
            } else this.onEvent("Dodged!", "reward");
            if(m.shape==='line') {
              const nx=m.x+(m.facingX??0)*range*.6,nz=m.z+(m.facingZ??1)*range*.6;
              if(Math.abs(nx)<14&&Math.abs(nz)<13&&!this.blocked(nx,nz)){m.x=nx;m.z=nz;}
            }
            m.attack = spec.boss?2.2:1.4;
          }
        } else {
          const spec=this.monsterSpec(m.kind);
          if (d > Math.min(spec.range*.75,2.2)) {
            const speed=spec.family==='beast'?2:spec.family==='golem'?1:1.4;
            const step = dt * (m.slow > 0 ? speed*.5 : speed);
            const nx = m.x + ((this.x - m.x) / d) * step,
              nz = m.z + ((this.z - m.z) / d) * step;
            if (!this.blocked(nx, nz)) {
              m.x = nx;
              m.z = nz;
            }
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
      this.save.hp = 0;this.deathTime=1.2;
      this.target = null;
      this.cast = null;
      this.destination = null;
      this.route = [];
      this.guard.time = this.fury.time = 0;
      this.save.gold = Math.max(0, this.save.gold - 15);
      this.onEvent("Rescued at camp · 15 z recovery fee", "level");
      this.persist();
    }
  }
}
