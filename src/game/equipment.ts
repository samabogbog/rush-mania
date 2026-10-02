import type {ClassId} from './classes';
export const gearSlots=['weapon','helmet','armor','gloves','boots','accessory'] as const;
export type GearSlot=typeof gearSlots[number];
export const isGearSlot=(value:unknown):value is GearSlot=>typeof value==='string'&&gearSlots.includes(value as GearSlot);
export const BAG_CAPACITY=144;
export const rarityOrder=['common','rare','epic','legend'] as const;
export type Rarity=typeof rarityOrder[number];
export const rarityLabels:Record<Rarity,string>={common:'Common',rare:'Rare',epic:'Epic',legend:'Legend'};
export const secondaryCounts:Record<Rarity,number>={common:0,rare:1,epic:2,legend:3};
export type SecondaryStat='critChance'|'critDamage'|'damageBonus'|'skillDamage'|'lifesteal'|'hpRegen'|'mpRegen'|'attackSpeed'|'moveSpeed'|'armorPen'|'damageReduction'|'dodgeChance'|'expBonus'|'goldBonus'|'healingBonus'|'cooldownReduction';

export type Bonuses={atk?:number;def?:number;hp?:number;mp?:number;str?:number;vit?:number;agi?:number}&Partial<Record<SecondaryStat,number>>;
export type GearDefinition={id:string;name:string;slot:GearSlot;job?:ClassId;level:number;rarity:Rarity;setId?:string;dropOnly?:boolean;icon:string;bonuses:Bonuses;cost:number;materials:[string,number][];description:string};
export const equipment:GearDefinition[]=[
 {id:'sprout-blade',name:'Sprout Blade',slot:'weapon',job:'swordsman',level:1,rarity:'common',icon:'swords',bonuses:{atk:12,str:2},cost:40,materials:[['Dew jelly',4],['Verdant leaf',3]],description:'A sturdy beginning for a frontline adventurer.'},
 {id:'bloom-staff',name:'Bloom Staff',slot:'weapon',job:'mage',level:1,rarity:'common',icon:'sparkles',bonuses:{atk:12,mp:20,str:2},cost:40,materials:[['Verdant leaf',4],['Forest mushroom',3]],description:'A light staff that gives your spells room to grow.'},
 {id:'willow-bow',name:'Willow Bow',slot:'weapon',job:'archer',level:1,rarity:'common',icon:'crosshair',bonuses:{atk:10,agi:3},cost:40,materials:[['Verdant leaf',4],['Dew jelly',3]],description:'Quick attacks for a nimble hunter.'},
 {id:'field-coat',name:'Field Coat',slot:'armor',level:1,rarity:'common',icon:'field-coat',bonuses:{def:10,hp:30},cost:35,materials:[['Soft fur',3],['Forest mushroom',3]],description:'Balanced defense for your first expeditions.'},
 {id:'leaf-charm',name:'Leaf Charm',slot:'accessory',level:1,rarity:'common',icon:'leaf-charm',bonuses:{agi:3},cost:35,materials:[['Verdant leaf',6],['Honey drop',2]],description:'A small charm for a faster, luckier build.'},
 {id:'amber-cleaver',name:'Amber Cleaver',slot:'weapon',job:'swordsman',level:20,rarity:'rare',icon:'swords',bonuses:{atk:38,str:5},cost:240,materials:[['Boar tusk',6],['Amber leaf',5]],description:'Powerful strikes; pair it with a defensive coat.'},
 {id:'amber-wand',name:'Amber Wand',slot:'weapon',job:'mage',level:20,rarity:'rare',icon:'sparkles',bonuses:{atk:32,mp:50,str:5},cost:240,materials:[['Amber spore',6],['Golden honey',4]],description:'Enough mana to sustain an area-control build.'},
 {id:'horn-bow',name:'Horn Bow',slot:'weapon',job:'archer',level:20,rarity:'rare',icon:'crosshair',bonuses:{atk:32,agi:7},cost:240,materials:[['Amber antler',5],['Amber leaf',6]],description:'Speed and critical hits over raw defense.'},
 {id:'shell-vest',name:'Shell Vest',slot:'armor',level:40,rarity:'rare',icon:'shell-vest',bonuses:{def:50,vit:6,hp:150},cost:500,materials:[['River shell',8],['Marsh reed',6]],description:'A durable choice for tanking and risky solo fights.'},
 {id:'wisp-robe',name:'Wisp Robe',slot:'armor',level:40,rarity:'rare',icon:'wisp-robe',bonuses:{def:20,mp:100,str:10},cost:500,materials:[['Wisp essence',8],['Crystal dust',6]],description:'Trade some defense for spell power and mana.'},
 {id:'crystal-band',name:'Crystal Band',slot:'accessory',level:40,rarity:'rare',icon:'sparkles',bonuses:{str:8,mp:60},cost:360,materials:[['Crystal dust',8],['Crystal jelly',6]],description:'Focus your offensive skills.'},
 {id:'reed-feather',name:'Reed Feather',slot:'accessory',level:40,rarity:'rare',icon:'wind',bonuses:{agi:10,def:10},cost:360,materials:[['Marsh reed',8],['Crystal dust',5]],description:'Attack speed and critical chance for agile builds.'},
 {id:'frost-edge',name:'Frost Edge',slot:'weapon',job:'swordsman',level:65,rarity:'epic',icon:'swords',bonuses:{atk:100,str:15,def:25},cost:1200,materials:[['Frost fang',8],['Ice shard',10]],description:'A reliable weapon for leading a dungeon party.'},
 {id:'snow-staff',name:'Snow Staff',slot:'weapon',job:'mage',level:65,rarity:'epic',icon:'sparkles',bonuses:{atk:95,str:18,mp:120},cost:1200,materials:[['Snow spore',8],['Sky feather',8]],description:'Strong area magic and a deep mana pool.'},
 {id:'sky-bow',name:'Sky Bow',slot:'weapon',job:'archer',level:65,rarity:'epic',icon:'crosshair',bonuses:{atk:90,agi:20},cost:1200,materials:[['Sky feather',8],['Frost fang',8]],description:'An aggressive late-game critical build.'},
 {id:'root-plate',name:'Rootheart Plate',slot:'armor',level:65,rarity:'epic',icon:'root-plate',bonuses:{def:100,hp:350,vit:10},cost:1600,materials:[['Rootheart core',2],['Warden stone',8]],description:'Survive the Guardian’s strongest attacks.'},
 {id:'shade-mantle',name:'Shade Mantle',slot:'armor',level:65,rarity:'epic',icon:'moon',bonuses:{def:35,str:20,agi:10,mp:100},cost:1600,materials:[['Shade essence',10],['Living vine',8]],description:'An offensive alternative to heavy plate.'},
 {id:'root-signet',name:'Rootheart Signet',slot:'accessory',level:65,rarity:'epic',icon:'root-signet',bonuses:{atk:30,def:30,mp:60},cost:1200,materials:[['Rootheart core',1],['Rune stone',10]],description:'A trophy that strengthens every class.'},
];
export const gearById=(id:string)=>equipment.find(g=>g.id===id);
export const gearByName=(name:string)=>equipment.find(g=>g.name===name);

export const statLabels:Record<keyof Bonuses,string>={atk:'ATK',def:'DEF',hp:'Max HP',mp:'Max MP',str:'STR',vit:'VIT',agi:'AGI',critChance:'Critical chance',critDamage:'Critical damage',damageBonus:'Damage bonus',skillDamage:'Skill damage',lifesteal:'Lifesteal',hpRegen:'HP regen / sec',mpRegen:'MP regen / sec',attackSpeed:'Attack speed',moveSpeed:'Move speed',armorPen:'Armor penetration',damageReduction:'Damage reduction',dodgeChance:'Dodge chance',expBonus:'EXP bonus',goldBonus:'Zeny bonus',healingBonus:'Healing received',cooldownReduction:'Cooldown reduction'};
export const percentStats=new Set<keyof Bonuses>(['critChance','critDamage','damageBonus','skillDamage','lifesteal','attackSpeed','moveSpeed','armorPen','damageReduction','dodgeChance','expBonus','goldBonus','healingBonus','cooldownReduction']);
export const formatStat=(key:keyof Bonuses,value:number)=>`${Math.round(value*10)/10}${percentStats.has(key)?'%':''}`;
export const gearSets=[
 {id:'thornwood',name:'Thornwood',level:10,armorIcon:'field-coat',charmIcon:'leaf-charm',theme:'The first treasures of Moonlit Glade.'},
 {id:'suncrest',name:'Suncrest',level:30,armorIcon:'shell-vest',charmIcon:'honey',theme:'Warm amber relics from the orchard.'},
 {id:'moonveil',name:'Moonveil',level:50,armorIcon:'wisp-robe',charmIcon:'wisp-essence',theme:'Moonlit threads from the crystal marsh.'},
 {id:'frostguard',name:'Frostguard',level:70,armorIcon:'root-plate',charmIcon:'ice-shard',theme:'Forged by the winds of Frostpeak.'},
 {id:'starfall',name:'Starfall',level:90,armorIcon:'root-plate',charmIcon:'root-signet',theme:'Ancient starlight held in the Rootheart ruins.'},
] as const;
for(const set of gearSets){
 const lv=set.level;
 const pieces:{slot:GearSlot;suffix:string;job?:ClassId;icon:string;bonuses:Bonuses}[]=[
  {slot:'weapon',suffix:'Blade',job:'swordsman',icon:'swords',bonuses:{atk:Math.round(lv*1.8+14),str:Math.ceil(lv/10)}},
  {slot:'weapon',suffix:'Staff',job:'mage',icon:'sparkles',bonuses:{atk:Math.round(lv*1.7+14),mp:lv*2,str:Math.ceil(lv/12)}},
  {slot:'weapon',suffix:'Bow',job:'archer',icon:'crosshair',bonuses:{atk:Math.round(lv*1.6+14),agi:Math.ceil(lv/8)}},
  {slot:'helmet',suffix:'Helmet',icon:'gear-helmet',bonuses:{def:Math.round(lv*.4+4),hp:lv*2}},
  {slot:'armor',suffix:'Coat',icon:set.armorIcon,bonuses:{def:Math.round(lv*1.2+10),hp:lv*4}},
  {slot:'gloves',suffix:'Gloves',icon:'gear-gloves',bonuses:{atk:Math.round(lv*.35+3),def:Math.round(lv*.3+2)}},
  {slot:'boots',suffix:'Boots',icon:'gear-boots',bonuses:{def:Math.round(lv*.4+3),agi:Math.ceil(lv/15)}},
  {slot:'accessory',suffix:'Charm',icon:set.charmIcon,bonuses:{hp:lv*2,mp:lv,str:Math.ceil(lv/18)}},
 ];
 for(const piece of pieces)equipment.push({id:`${set.id}-${piece.suffix.toLowerCase()}`,name:`${set.name} ${piece.suffix}`,slot:piece.slot,job:piece.job,level:lv,rarity:'common',setId:set.id,dropOnly:true,icon:piece.icon,bonuses:piece.bonuses,cost:0,materials:[],description:set.theme});
}
export type GearInstance={id?:string;gearId?:string;refine?:number;rarity?:Rarity;secondary?:Bonuses};
export const itemRarity=(item:GearInstance):Rarity=>item.rarity||gearById(item.gearId||'')?.rarity||'common';
export function itemBonuses(item:GearInstance,refinement=false):Bonuses {
 const gear=gearById(item.gearId||'');if(!gear)return {};
 const multiplier=gear.dropOnly?({common:1,rare:1.1,epic:1.25,legend:1.45}[itemRarity(item)]):1;
 const out:Bonuses={};for(const [key,value] of Object.entries(gear.bonuses))out[key as keyof Bonuses]=Math.round(value*multiplier);
 for(const [key,value] of Object.entries(item.secondary||{}))out[key as keyof Bonuses]=(out[key as keyof Bonuses]||0)+value;
 if(refinement&&gear.slot==='weapon')out.atk=(out.atk||0)+(item.refine||0)*7;
 return out;
}
const affixRanges:Record<SecondaryStat,[number,number]>={critChance:[1,5],critDamage:[5,18],damageBonus:[2,7],skillDamage:[3,10],lifesteal:[1,4],hpRegen:[1,4],mpRegen:[.2,1],attackSpeed:[2,8],moveSpeed:[2,6],armorPen:[2,8],damageReduction:[1,5],dodgeChance:[1,4],expBonus:[3,9],goldBonus:[3,10],healingBonus:[3,9],cooldownReduction:[2,6]};
export function rollGear(id:string,rarity:Rarity,random= Math.random):GearInstance {
 const gear=gearById(id);if(!gear)throw new Error('Unknown equipment');
 const pool=Object.keys(affixRanges) as SecondaryStat[],secondary:Bonuses={};
 for(let n=0;n<secondaryCounts[rarity];n++){const index=Math.min(pool.length-1,Math.floor(random()*pool.length)),key=pool.splice(index,1)[0],[min,max]=affixRanges[key];const factor=.65+gear.level/140;secondary[key]=Math.round((min+(max-min)*random())*factor*10)/10;}
 return {id:crypto.randomUUID(),gearId:id,refine:0,rarity,secondary};
}
export function rollEquipmentDrop(level:number,boss:boolean,random=Math.random):GearInstance|undefined {
 if(random()>=(boss ? .75 : .16))return;
 const set=[...gearSets].reverse().find(s=>level>=s.level)||gearSets[0],pool=equipment.filter(g=>g.setId===set.id);
 const gear=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))],roll=random();
 const rarity:Rarity=boss?(roll<.2?'common':roll<.6?'rare':roll<.9?'epic':'legend'):(roll<.7?'common':roll<.93?'rare':roll<.99?'epic':'legend');
 return rollGear(gear.id,rarity,random);
}
export function setBonuses(id:string,pieces:number):Bonuses {const set=gearSets.find(s=>s.id===id);if(!set)return {};const bonuses:Bonuses={};if(pieces>=2)bonuses.hp=set.level*2;if(pieces>=4){bonuses.atk=Math.round(set.level*.4);bonuses.def=Math.round(set.level*.3);}if(pieces>=6){bonuses.damageBonus=5;bonuses.hpRegen=Math.round(set.level/30*10)/10;bonuses.moveSpeed=5;}return bonuses;}
