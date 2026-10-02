export type Family='slime'|'cap'|'plant'|'beast'|'insect'|'wisp'|'golem';
export type AttackShape='circle'|'line'|'cone';
export type MonsterSpec={hp:number;xp:number;color:number;drop:string;icon:string;defense:number;atk:number;gold:number;level:number;family:Family;shape:AttackShape;windup:number;range:number;boss?:boolean};
function monster(level:number,family:Family,color:number,drop:string,shape:AttackShape='circle',extra:Partial<MonsterSpec>={}):MonsterSpec{return {level,family,color,drop,shape,hp:60+level*18,xp:20+level*12,defense:8+level*1.4,atk:7+level*2.4,gold:6+Math.floor(level*.6),icon:'🌿',windup:shape==='line'?1.1:.8,range:shape==='line'?5:shape==='cone'?3.6:2.2,...extra}}
export const species={
 Dewdrop:monster(1,'slime',0x35d8f4,'Dew jelly','circle',{hp:55,xp:24,defense:8,atk:7,gold:8,icon:'💧',windup:.65}),
 Wildcap:monster(2,'cap',0xff597a,'Forest mushroom','circle',{hp:85,xp:38,defense:18,atk:8,gold:8,icon:'🍄',windup:.65}),
 Leafling:monster(2,'plant',0xa2e534,'Verdant leaf','circle',{hp:70,xp:30,defense:12,atk:8,gold:8,windup:.65}),
 Sunbee:monster(5,'insect',0xffc238,'Honey drop','line'),
 RibbonHare:monster(7,'beast',0xffadc8,'Soft fur','cone'),
 Applesprout:monster(20,'plant',0xf44f60,'Amber leaf'),
 AmberBoar:monster(24,'beast',0xff9d3e,'Boar tusk','line'),
 Honeybug:monster(26,'insect',0xffcb34,'Golden honey','cone'),
 Sporeguard:monster(30,'cap',0xbb63ea,'Amber spore','circle'),
 OrchardStag:monster(35,'beast',0xeb9754,'Amber antler','line'),
 GlowWisp:monster(40,'wisp',0x66eeff,'Wisp essence','cone'),
 MarshTurtle:monster(44,'golem',0x4de29e,'River shell','circle',{defense:120}),
 ReedSprite:monster(48,'plant',0x4fcbba,'Marsh reed','line'),
 PuddleJelly:monster(52,'slime',0xa587ff,'Crystal jelly','circle'),
 CrystalMoth:monster(60,'insect',0xc88eff,'Crystal dust','cone'),
 FrostCub:monster(65,'beast',0xa9efff,'Frost fur','circle'),
 IceGolem:monster(70,'golem',0x65cbff,'Ice shard','cone',{defense:180}),
 Snowcap:monster(76,'cap',0xe4c7ff,'Snow spore','circle'),
 PeakOwl:monster(82,'wisp',0xffedb2,'Sky feather','line'),
 FrostWolf:monster(90,'beast',0xc4deff,'Frost fang','line'),
 Rootling:monster(40,'plant',0x79bd62,'Ancient root','circle'),
 RuinSentinel:monster(45,'golem',0xb594e6,'Rune stone','line'),
 ShadeWisp:monster(50,'wisp',0xce73ef,'Shade essence','cone'),
 StoneWarden:monster(55,'golem',0xa9aed6,'Warden stone','circle',{defense:160}),
 VineBeast:monster(60,'beast',0xa4e54e,'Living vine','line'),
 RootheartGuardian:monster(65,'golem',0xffb14d,'Rootheart core','circle',{hp:16000,xp:6500,gold:600,defense:150,atk:210,range:3.5,windup:1.5,boss:true}),
} satisfies Record<string,MonsterSpec>;
export type Kind=keyof typeof species;
export type ZoneId='town'|'glade'|'orchard'|'marsh'|'frost'|'ruins';
export type Zone={name:string;level:number;maxLevel:number;description:string;ground:number;path:number;accent:number;species:Kind[];music:number[];npcs:{id:string;name:string;x:number;z:number;panel:string}[]};
export const zones:Record<ZoneId,Zone>={
 town:{name:'Sprout Town',level:1,maxLevel:100,description:'A safe home: merchants, crafting, quests and party supplies.',ground:0x86d877,path:0xf2d898,accent:0xf08d94,species:[],music:[523,659,784,659,587,698,880,784],npcs:[{id:'merchant',name:'Mallow · Merchant',x:-4,z:-8,panel:'shop'},{id:'forge',name:'Ember · Blacksmith',x:5,z:-7,panel:'forge'},{id:'guide',name:'Pip · Quest guide',x:0,z:-5,panel:'journal'}]},
 glade:{name:'Moonlit Glade',level:1,maxLevel:20,description:'Dew jelly, forest mushrooms and leaves for your first equipment.',ground:0x83c76a,path:0xd8c994,accent:0x53e795,species:['Dewdrop','Wildcap','Leafling','Sunbee','RibbonHare'],music:[392,494,587,740,659,587,494,440],npcs:[{id:'scout',name:'Fern · Scout',x:3,z:-11,panel:'journal'}]},
 orchard:{name:'Amber Orchard',level:20,maxLevel:40,description:'Dodge charging beasts; gather amber materials for critical builds.',ground:0xb5db58,path:0xf3cb81,accent:0xff9348,species:['Applesprout','AmberBoar','Honeybug','Sporeguard','OrchardStag'],music:[440,554,659,880,740,659,554,494],npcs:[{id:'farmer',name:'Clover · Orchard keeper',x:-3,z:-11,panel:'journal'}]},
 marsh:{name:'Crystal Marsh',level:40,maxLevel:65,description:'Wisp essence and crystal dust strengthen mana and defensive builds.',ground:0x64cab3,path:0xc6d5ad,accent:0x8cecff,species:['GlowWisp','MarshTurtle','ReedSprite','PuddleJelly','CrystalMoth'],music:[330,392,494,659,587,494,392,370],npcs:[{id:'witch',name:'Luma · Crystal scholar',x:3,z:-11,panel:'journal'}]},
 frost:{name:'Frostpeak Trail',level:65,maxLevel:100,description:'Watch the windups. Frost materials forge late-game weapons.',ground:0xc9ebff,path:0xe5d9cb,accent:0x83bcff,species:['FrostCub','IceGolem','Snowcap','PeakOwl','FrostWolf'],music:[294,440,587,698,659,587,440,330],npcs:[{id:'ranger',name:'Flurry · Ranger',x:-3,z:-11,panel:'journal'}]},
 ruins:{name:'Rootheart Ruins',level:40,maxLevel:100,description:'Party dungeon for 2–4 adventurers. Defeat the Rootheart Guardian.',ground:0x8a89bd,path:0xc9b8d8,accent:0xd385ff,species:['Rootling','RuinSentinel','ShadeWisp','StoneWarden','VineBeast','RootheartGuardian'],music:[262,311,392,523,466,392,349,311],npcs:[{id:'warden',name:'Rune · Dungeon warden',x:3,z:-11,panel:'journal'}]},
};
export function isZone(value:unknown):value is ZoneId {return typeof value==='string'&&Object.hasOwn(zones,value)}
export const questDefinitions=[
 {id:'fieldwork',name:'Woodland fieldwork',description:'Defeat 15 glade creatures. Pip needs a clear path for new adventurers.',target:15,kind:'kills',zone:'glade',gold:200,xp:300,item:'Red potion',count:4},
 {id:'first-craft',name:'Made with your own hands',description:'Craft any equipment at the forge.',target:1,kind:'craft',zone:'town',gold:120,xp:200,item:'Blue potion',count:4},
 {id:'amber',name:'Orchard trouble',description:'Defeat 12 creatures in Amber Orchard.',target:12,kind:'kills',zone:'orchard',gold:450,xp:1600,item:'Amber spore',count:3},
 {id:'crystals',name:'A light in the marsh',description:'Defeat 12 creatures in Crystal Marsh.',target:12,kind:'kills',zone:'marsh',gold:700,xp:3500,item:'Crystal dust',count:3},
 {id:'frost',name:'The long climb',description:'Defeat 15 creatures in Frostpeak Trail.',target:15,kind:'kills',zone:'frost',gold:1200,xp:7000,item:'Frost fang',count:3},
 {id:'guardian',name:'The Rootheart awakens',description:'Defeat the Rootheart Guardian with your party.',target:1,kind:'boss',zone:'ruins',gold:1800,xp:8000,item:'Rootheart core',count:1},
] as const;
