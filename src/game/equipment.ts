import type {ClassId} from './classes';
export type GearSlot='weapon'|'armor'|'accessory';
export type Bonuses={atk?:number;def?:number;hp?:number;mp?:number;str?:number;vit?:number;agi?:number};
export type GearDefinition={id:string;name:string;slot:GearSlot;job?:ClassId;level:number;rarity:'Common'|'Rare'|'Epic';icon:string;bonuses:Bonuses;cost:number;materials:[string,number][];description:string};
export const equipment:GearDefinition[]=[
 {id:'sprout-blade',name:'Sprout Blade',slot:'weapon',job:'swordsman',level:1,rarity:'Common',icon:'swords',bonuses:{atk:12,str:2},cost:40,materials:[['Dew jelly',4],['Verdant leaf',3]],description:'A sturdy beginning for a frontline adventurer.'},
 {id:'bloom-staff',name:'Bloom Staff',slot:'weapon',job:'mage',level:1,rarity:'Common',icon:'sparkles',bonuses:{atk:12,mp:20,str:2},cost:40,materials:[['Verdant leaf',4],['Forest mushroom',3]],description:'A light staff that gives your spells room to grow.'},
 {id:'willow-bow',name:'Willow Bow',slot:'weapon',job:'archer',level:1,rarity:'Common',icon:'crosshair',bonuses:{atk:10,agi:3},cost:40,materials:[['Verdant leaf',4],['Dew jelly',3]],description:'Quick attacks for a nimble hunter.'},
 {id:'field-coat',name:'Field Coat',slot:'armor',level:1,rarity:'Common',icon:'field-coat',bonuses:{def:10,hp:30},cost:35,materials:[['Soft fur',3],['Forest mushroom',3]],description:'Balanced defense for your first expeditions.'},
 {id:'leaf-charm',name:'Leaf Charm',slot:'accessory',level:1,rarity:'Common',icon:'leaf-charm',bonuses:{agi:3},cost:35,materials:[['Verdant leaf',6],['Honey drop',2]],description:'A small charm for a faster, luckier build.'},
 {id:'amber-cleaver',name:'Amber Cleaver',slot:'weapon',job:'swordsman',level:20,rarity:'Rare',icon:'swords',bonuses:{atk:38,str:5},cost:240,materials:[['Boar tusk',6],['Amber leaf',5]],description:'Powerful strikes; pair it with a defensive coat.'},
 {id:'amber-wand',name:'Amber Wand',slot:'weapon',job:'mage',level:20,rarity:'Rare',icon:'sparkles',bonuses:{atk:32,mp:50,str:5},cost:240,materials:[['Amber spore',6],['Golden honey',4]],description:'Enough mana to sustain an area-control build.'},
 {id:'horn-bow',name:'Horn Bow',slot:'weapon',job:'archer',level:20,rarity:'Rare',icon:'crosshair',bonuses:{atk:32,agi:7},cost:240,materials:[['Amber antler',5],['Amber leaf',6]],description:'Speed and critical hits over raw defense.'},
 {id:'shell-vest',name:'Shell Vest',slot:'armor',level:40,rarity:'Rare',icon:'shell-vest',bonuses:{def:50,vit:6,hp:150},cost:500,materials:[['River shell',8],['Marsh reed',6]],description:'A durable choice for tanking and risky solo fights.'},
 {id:'wisp-robe',name:'Wisp Robe',slot:'armor',level:40,rarity:'Rare',icon:'wisp-robe',bonuses:{def:20,mp:100,str:10},cost:500,materials:[['Wisp essence',8],['Crystal dust',6]],description:'Trade some defense for spell power and mana.'},
 {id:'crystal-band',name:'Crystal Band',slot:'accessory',level:40,rarity:'Rare',icon:'sparkles',bonuses:{str:8,mp:60},cost:360,materials:[['Crystal dust',8],['Crystal jelly',6]],description:'Focus your offensive skills.'},
 {id:'reed-feather',name:'Reed Feather',slot:'accessory',level:40,rarity:'Rare',icon:'wind',bonuses:{agi:10,def:10},cost:360,materials:[['Marsh reed',8],['Crystal dust',5]],description:'Attack speed and critical chance for agile builds.'},
 {id:'frost-edge',name:'Frost Edge',slot:'weapon',job:'swordsman',level:65,rarity:'Epic',icon:'swords',bonuses:{atk:100,str:15,def:25},cost:1200,materials:[['Frost fang',8],['Ice shard',10]],description:'A reliable weapon for leading a dungeon party.'},
 {id:'snow-staff',name:'Snow Staff',slot:'weapon',job:'mage',level:65,rarity:'Epic',icon:'sparkles',bonuses:{atk:95,str:18,mp:120},cost:1200,materials:[['Snow spore',8],['Sky feather',8]],description:'Strong area magic and a deep mana pool.'},
 {id:'sky-bow',name:'Sky Bow',slot:'weapon',job:'archer',level:65,rarity:'Epic',icon:'crosshair',bonuses:{atk:90,agi:20},cost:1200,materials:[['Sky feather',8],['Frost fang',8]],description:'An aggressive late-game critical build.'},
 {id:'root-plate',name:'Rootheart Plate',slot:'armor',level:65,rarity:'Epic',icon:'root-plate',bonuses:{def:100,hp:350,vit:10},cost:1600,materials:[['Rootheart core',2],['Warden stone',8]],description:'Survive the Guardian’s strongest attacks.'},
 {id:'shade-mantle',name:'Shade Mantle',slot:'armor',level:65,rarity:'Epic',icon:'moon',bonuses:{def:35,str:20,agi:10,mp:100},cost:1600,materials:[['Shade essence',10],['Living vine',8]],description:'An offensive alternative to heavy plate.'},
 {id:'root-signet',name:'Rootheart Signet',slot:'accessory',level:65,rarity:'Epic',icon:'root-signet',bonuses:{atk:30,def:30,mp:60},cost:1200,materials:[['Rootheart core',1],['Rune stone',10]],description:'A trophy that strengthens every class.'},
];
export const gearById=(id:string)=>equipment.find(g=>g.id===id);
export const gearByName=(name:string)=>equipment.find(g=>g.name===name);
