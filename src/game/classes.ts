export const MAX_LEVEL = 100;
export type ClassId = "swordsman" | "mage" | "archer";
export type SkillEffect =
  "hit" | "area" | "heal" | "guard" | "fury" | "stun" | "slow" | "poison";
export type Skill = {
  id: string;
  stage:number;
  branch:0|1;
  name: string;
  icon: string;
  level: number;
  mp: number;
  cooldown: number;
  range: number;
  power: number;
  effect: SkillEffect;
  radius?: number;
  duration?: number;
  cast?: number;
  description: string;
};
export const classes: Record<
  ClassId,
  {
    name: string;
    role: string;
    icon: string;
    color: number;
    range: number;
    speed: number;
    weapon: string;
  }
> = {
  swordsman: {
    name: "Swordsman",
    role: "Close combat · defense and crowd control",
    icon: "swords",
    color: 0xf29b47,
    range: 1.8,
    speed: 0.7,
    weapon: "Sword",
  },
  mage: {
    name: "Mage",
    role: "Ranged magic · area damage and control",
    icon: "wand-sparkles",
    color: 0xab68ed,
    range: 7,
    speed: 1,
    weapon: "Staff",
  },
  archer: {
    name: "Archer",
    role: "Ranged physical · speed and damage over time",
    icon: "crosshair",
    color: 0x55c68a,
    range: 8,
    speed: 0.8,
    weapon: "Bow",
  },
};
const make = (
  job: ClassId,
  index: number,
  name: string,
  icon: string,
  effect: SkillEffect,
  power: number,
  mp: number,
  cooldown: number,
  description: string,
  extra: Partial<Skill> = {},
): Skill => ({
  id: `${job}-${index}`,
  stage:index,
  branch:0,
  name,
  icon,
  effect,
  power,
  mp,
  cooldown,
  description,
  level: index * 10,
  range: classes[job].range + 1,
  ...extra,
});
export const skills: Record<ClassId, Skill[]> = {
  swordsman: [
    make(
      "swordsman",
      1,
      "Power Strike",
      "swords",
      "hit",
      1.8,
      10,
      4,
      "A heavy focused strike.",
    ),
    make(
      "swordsman",
      2,
      "Whirlwind",
      "wind",
      "area",
      1.4,
      18,
      7,
      "Sweep every enemy around you.",
      { radius: 4 },
    ),
    make(
      "swordsman",
      3,
      "Iron Guard",
      "shield",
      "guard",
      0.5,
      15,
      15,
      "Reduce incoming damage by 50% for 6 seconds.",
      { duration: 6 },
    ),
    make(
      "swordsman",
      4,
      "Shield Bash",
      "shield",
      "stun",
      1.3,
      16,
      10,
      "Interrupt and stun a target for 2 seconds.",
      { duration: 2 },
    ),
    make(
      "swordsman",
      5,
      "Second Wind",
      "heart",
      "heal",
      0.3,
      20,
      20,
      "Recover 30% of maximum health.",
    ),
    make(
      "swordsman",
      6,
      "War Cry",
      "sparkles",
      "fury",
      0.35,
      24,
      18,
      "Increase attack by 35% for 8 seconds.",
      { duration: 8 },
    ),
    make(
      "swordsman",
      7,
      "Cleave",
      "swords",
      "area",
      2.2,
      28,
      10,
      "A powerful sweep around your target.",
      { radius: 3 },
    ),
    make(
      "swordsman",
      8,
      "Hamstring",
      "wind",
      "slow",
      2,
      25,
      12,
      "Slow a target for 5 seconds.",
      { duration: 5 },
    ),
    make(
      "swordsman",
      9,
      "Earthbreaker",
      "anvil",
      "area",
      3,
      35,
      15,
      "Shake the ground around you.",
      { radius: 5 },
    ),
    make(
      "swordsman",
      10,
      "Meteor Blade",
      "sparkles",
      "area",
      4.5,
      50,
      25,
      "Unleash your strongest sweeping attack.",
      { radius: 5, cast: 0.6 },
    ),
  ],
  mage: [
    make(
      "mage",
      1,
      "Fire Bolt",
      "sparkles",
      "hit",
      2,
      12,
      4,
      "Launch a burning bolt.",
      { cast: 0.35 },
    ),
    make(
      "mage",
      2,
      "Frost Nova",
      "wind",
      "area",
      1.5,
      20,
      8,
      "Burst around the target and slow nearby enemies.",
      { radius: 3, duration: 3, cast: 0.4 },
    ),
    make(
      "mage",
      3,
      "Arcane Barrier",
      "shield",
      "guard",
      0.6,
      18,
      16,
      "Reduce incoming damage by 60% for 5 seconds.",
      { duration: 5 },
    ),
    make(
      "mage",
      4,
      "Lightning",
      "sparkles",
      "stun",
      1.6,
      22,
      10,
      "Stun a target for 2 seconds.",
      { duration: 2, cast: 0.3 },
    ),
    make(
      "mage",
      5,
      "Vital Bloom",
      "heart",
      "heal",
      0.35,
      25,
      20,
      "Recover 35% of maximum health.",
    ),
    make(
      "mage",
      6,
      "Arcane Focus",
      "wand-sparkles",
      "fury",
      0.4,
      25,
      18,
      "Increase attack by 40% for 8 seconds.",
      { duration: 8 },
    ),
    make(
      "mage",
      7,
      "Blizzard",
      "wind",
      "area",
      2.5,
      35,
      12,
      "Freeze the air around your target.",
      { radius: 4, duration: 4, cast: 0.7 },
    ),
    make(
      "mage",
      8,
      "Venom Cloud",
      "flask-conical",
      "poison",
      1.2,
      30,
      14,
      "A poisonous spell that damages over 6 seconds.",
      { duration: 6 },
    ),
    make(
      "mage",
      9,
      "Starfall",
      "sparkles",
      "area",
      3.4,
      42,
      18,
      "Call falling stars onto a wide area.",
      { radius: 5, cast: 0.8 },
    ),
    make(
      "mage",
      10,
      "Astral Storm",
      "wand-sparkles",
      "area",
      5,
      60,
      28,
      "A devastating arcane storm.",
      { radius: 6, cast: 1 },
    ),
  ],
  archer: [
    make(
      "archer",
      1,
      "Power Shot",
      "crosshair",
      "hit",
      1.9,
      10,
      4,
      "A precise, powerful arrow.",
    ),
    make(
      "archer",
      2,
      "Arrow Rain",
      "wind",
      "area",
      1.5,
      18,
      8,
      "Rain arrows around your target.",
      { radius: 3 },
    ),
    make(
      "archer",
      3,
      "Evasive Stance",
      "shield",
      "guard",
      0.45,
      15,
      14,
      "Reduce incoming damage by 45% for 6 seconds.",
      { duration: 6 },
    ),
    make(
      "archer",
      4,
      "Pinning Shot",
      "crosshair",
      "stun",
      1.4,
      18,
      10,
      "Pin a target for 2 seconds.",
      { duration: 2 },
    ),
    make(
      "archer",
      5,
      "Field Remedy",
      "heart",
      "heal",
      0.25,
      18,
      18,
      "Recover 25% of maximum health.",
    ),
    make(
      "archer",
      6,
      "Hunter Focus",
      "crosshair",
      "fury",
      0.3,
      22,
      16,
      "Increase attack by 30% for 10 seconds.",
      { duration: 10 },
    ),
    make(
      "archer",
      7,
      "Piercing Volley",
      "swords",
      "area",
      2.2,
      28,
      10,
      "Piercing arrows strike nearby enemies.",
      { radius: 3.5 },
    ),
    make(
      "archer",
      8,
      "Poison Arrow",
      "flask-conical",
      "poison",
      1.1,
      24,
      12,
      "Poison a target for 8 seconds.",
      { duration: 8 },
    ),
    make(
      "archer",
      9,
      "Crippling Shot",
      "wind",
      "slow",
      3,
      32,
      14,
      "A heavy arrow that slows for 6 seconds.",
      { duration: 6 },
    ),
    make(
      "archer",
      10,
      "Sky Barrage",
      "sparkles",
      "area",
      4.5,
      48,
      24,
      "Cover the target area in a storm of arrows.",
      { radius: 5, cast: 0.5 },
    ),
  ],
};
export const skillBranches:Record<ClassId,[string,string]>={swordsman:['Vanguard','Sentinel'],mage:['Elementalist','Verdant Warden'],archer:['Marksman','Trapper']};
const alternative:Record<ClassId,[string,string,SkillEffect,number,number,number,Partial<Skill>][]>= {
 swordsman:[
 ['Bulwark','shield','guard',.35,8,9,{duration:4}],['Concussion','shield','stun',1.1,14,8,{duration:2.5}],['Field Recovery','heart','heal',.22,16,14,{}],['Sweeping Challenge','wind','area',1.1,19,7,{radius:5}],['Fortress Stance','shield','guard',.65,24,18,{duration:7}],['Crushing Advance','anvil','slow',2.4,26,11,{duration:5}],['Battle Renewal','heart','heal',.4,32,22,{}],['Rallying Standard','sparkles','fury',.5,30,22,{duration:12}],['Unbreakable','shield','guard',.8,40,25,{duration:8}],['Guardian Quake','anvil','area',3.5,44,20,{radius:6,duration:5,cast:.4}]],
 mage:[
 ['Bramble Bolt','leaf','slow',1.4,9,5,{duration:3}],['Restoring Dew','heart','heal',.18,15,11,{}],['Spore Hex','mushroom','poison',1,16,10,{duration:7}],['Thorn Burst','leaf','area',1.35,20,7,{radius:4,duration:2}],['Living Shelter','shield','guard',.5,22,14,{duration:8}],['Moonbeam','sparkles','stun',2.4,28,12,{duration:3,cast:.5}],['Verdant Renewal','heart','heal',.48,38,24,{}],['Spirit Surge','sparkles','fury',.55,32,22,{duration:12}],['Root Prison','leaf','slow',3.5,38,16,{duration:10,cast:.6}],['Worldtree Bloom','heart','heal',.7,65,35,{cast:.8}]],
 archer:[
 ['Snaring Arrow','leaf','slow',1.2,8,5,{duration:4}],['Venom Dart','flask-conical','poison',.9,14,8,{duration:6}],['Scatter Volley','wind','area',1.4,18,7,{radius:4}],['Herbal Tonic','heart','heal',.2,16,14,{}],['Stalker Focus','crosshair','fury',.4,22,16,{duration:9}],['Shock Arrow','sparkles','stun',2.2,25,12,{duration:3}],['Camouflage Guard','shield','guard',.6,30,18,{duration:8}],['Entangling Volley','leaf','area',2.4,34,12,{radius:5,duration:5}],['Toxic Fang','flask-conical','poison',2.6,36,16,{duration:12}],['Wild Hunt','crosshair','fury',.8,48,28,{duration:14}]]
};
for(const job of Object.keys(classes) as ClassId[])alternative[job].forEach(([name,icon,effect,power,mp,cooldown,extra],index)=>{
 const detail=effect==='heal'?`Restore ${Math.round(power*100)}% max HP.`:effect==='guard'?`Reduce damage by ${Math.round(power*100)}% for ${extra.duration}s.`:effect==='fury'?`Increase attack by ${Math.round(power*100)}% for ${extra.duration}s.`:effect==='area'?`Deal ${power}× ATK in a ${extra.radius}m area.${extra.duration?' Slow enemies for '+extra.duration+'s.':''}`:`Deal ${power}× ATK and ${effect==='poison'?'poison':effect==='slow'?'slow':'stun'} the target for ${extra.duration}s.`;
 skills[job].push(make(job,index+1,name,icon,effect,power,mp,cooldown,detail,{...extra,id:`${job}-b-${index+1}`,branch:1}));
});
// Each skill has bespoke, normalized artwork. Keep IDs stable across save versions.
for (const job of Object.keys(skills) as ClassId[])
  for (const skill of skills[job]) skill.icon = `skill-${skill.id}`;
export const auxiliaryItems:Record<string,{resource:'hp'|'mp';icon:string}>={'Red potion':{resource:'hp',icon:'health-potion'},'Blue potion':{resource:'mp',icon:'mana-potion'}};
export const isAuxiliaryItem=(name:unknown):name is string=>typeof name==='string'&&Object.hasOwn(auxiliaryItems,name);
export function isClass(value: unknown): value is ClassId {
  return typeof value === "string" && Object.hasOwn(classes, value);
}
/** Base mitigation formula; variability and critical hits are applied before this step. */
export function damageAfterDefense(atk: number, def: number) {
  return (Math.max(0, atk) * 100) / (100 + Math.max(0, def));
}
