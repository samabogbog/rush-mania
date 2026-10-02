export type Kind = "Dewdrop" | "Wildcap" | "Leafling";
export const species: Record<
  Kind,
  { hp: number; xp: number; color: number; drop: string; icon: string }
> = {
  Dewdrop: { hp: 55, xp: 24, color: 0x35d8f4, drop: "Dew jelly", icon: "💧" },
  Wildcap: {
    hp: 85,
    xp: 38,
    color: 0xd89878,
    drop: "Forest mushroom",
    icon: "🍄",
  },
  Leafling: {
    hp: 70,
    xp: 30,
    color: 0x9bab69,
    drop: "Verdant leaf",
    icon: "🌿",
  },
};
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
};
export type Item = { name: string; icon: string; count: number };
export type Save = {
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
  x = 0;
  z = 2;
  target: number | null = null;
  destination: { x: number; z: number } | null = null;
  attackTimer = 0;
  time = 0;
  paused = false;
  auto = false;
  cooldowns = [0, 0, 0, 0];
  monsters: Monster[] = [];
  loot: { x: number; z: number; name: string; icon: string }[] = [];
  obstacles: { x: number; z: number; r: number }[] = [];
  route: { x: number; z: number }[] = [];
  routeTimer = 0;
  onEvent: (text: string, type?: string, x?: number, z?: number) => void =
    () => {};
  constructor() {
    try {
      const s = JSON.parse(localStorage.getItem("mossvale-save") || "null");
      this.save =
        s?.level && s?.stats && Array.isArray(s.items)
          ? { ...structuredClone(defaults), ...s }
          : structuredClone(defaults);
    } catch {
      this.save = structuredClone(defaults);
    }
    const positions = [
      [-3, 4],
      [4, 3],
      [-6, -1],
      [7, -3],
      [2, -5],
      [-9, 7],
      [9, 5.5],
      [-4, -7],
      [11, 1],
      [-11, -4],
      [5, 10],
      [-1, 10],
      [-8, -10],
      [10, -9],
      [0, -11],
    ];
    positions.forEach(([x, z], id) => {
      const kind = (["Dewdrop", "Wildcap", "Leafling"] as Kind[])[id % 3];
      this.monsters.push({
        id,
        kind,
        x,
        z,
        hp: species[kind].hp,
        alive: true,
        respawn: 0,
        attack: 0,
        homeX: x,
        homeZ: z,
      });
    });
  }
  get maxHp() {
    return 100 + this.save.stats.vit * 4 + (this.save.level - 1) * 12;
  }
  get maxMp() {
    return 60 + (this.save.level - 1) * 8;
  }
  get maxXp() {
    return 80 + this.save.level * 40;
  }
  get damage() {
    return 12 + this.save.stats.str * 2 + this.save.weapon * 7;
  }
  persist() {
    localStorage.setItem("mossvale-save", JSON.stringify(this.save));
  }
  addItem(name: string, icon: string, count = 1) {
    const item = this.save.items.find((i) => i.name === name);
    if (item) item.count += count;
    else this.save.items.push({ name, icon, count });
  }
  usePotion(blue = false) {
    const item = this.save.items.find(
      (i) => i.name === (blue ? "Blue potion" : "Red potion"),
    );
    if (!item?.count) {
      this.onEvent("No potions left. Visit the village merchant.");
      return;
    }
    if (blue) {
      if (this.save.mp >= this.maxMp) {
        this.onEvent("Mana is already full");
        return;
      }
      this.save.mp = Math.min(this.maxMp, this.save.mp + 40);
    } else {
      if (this.save.hp >= this.maxHp) {
        this.onEvent("Health is already full");
        return;
      }
      this.save.hp = Math.min(this.maxHp, this.save.hp + 65);
    }
    item.count--;
    this.onEvent(blue ? "Mana restored +40" : "Health restored +65", "heal");
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
  hit(m: Monster, amount: number) {
    amount = Math.round(amount);
    m.hp -= amount;
    this.onEvent(String(amount), "damage", m.x, m.z);
    if (m.hp <= 0) {
      m.alive = false;
      m.respawn = 13;
      this.save.xp += species[m.kind].xp;
      this.save.gold += 8;
      this.save.kills++;
      this.loot.push({
        x: m.x,
        z: m.z,
        name: species[m.kind].drop,
        icon: species[m.kind].icon,
      });
      this.onEvent(
        `Defeated ${m.kind} · +${species[m.kind].xp} EXP · +8 z`,
        "reward",
      );
      this.target = null;
      while (this.save.xp >= this.maxXp) {
        this.save.xp -= this.maxXp;
        this.save.level++;
        this.save.points += 3;
        this.save.hp = this.maxHp;
        this.save.mp = this.maxMp;
        this.onEvent(`Level up! You are now level ${this.save.level}`, "level");
      }
      this.persist();
    }
  }
  skill(n: number) {
    if (this.paused || this.cooldowns[n] > 0) return;
    if (n === 2) {
      this.usePotion();
      this.cooldowns[n] = 2;
      return;
    }
    if (n === 3) {
      this.usePotion(true);
      this.cooldowns[n] = 2;
      return;
    }
    if (this.target === null) this.nearest();
    const m = this.monsters.find((m) => m.id === this.target && m.alive);
    if (!m) return;
    const distance = Math.hypot(m.x - this.x, m.z - this.z);
    if (distance > 2.8) {
      this.onEvent("Move closer to your target");
      return;
    }
    const cost = n === 0 ? 10 : 18;
    if (this.save.mp < cost) {
      this.onEvent("Not enough mana");
      return;
    }
    this.save.mp -= cost;
    this.cooldowns[n] = n === 0 ? 4 : 7;
    if (n === 0) {
      this.hit(m, this.damage * (1.6 + this.save.skillLevel * 0.2));
      this.onEvent("Power strike!", "strike", m.x, m.z);
    } else {
      this.monsters
        .filter((e) => e.alive && Math.hypot(e.x - this.x, e.z - this.z) < 4)
        .forEach((e) => this.hit(e, this.damage * 1.4));
      this.onEvent("Whirlwind!", "whirl", this.x, this.z);
    }
  }
  collect() {
    let count = 0;
    this.loot = this.loot.filter((l) => {
      if (Math.hypot(l.x - this.x, l.z - this.z) < 3.2) {
        this.addItem(l.name, l.icon);
        count++;
        return false;
      }
      return true;
    });
    if (count) {
      this.onEvent(`Picked up ${count} item${count > 1 ? "s" : ""}`, "reward");
      this.persist();
    } else this.onEvent("No drops nearby. Walk closer to the glowing loot.");
  }
  upgrade() {
    const cost = 60 + this.save.weapon * 40;
    if (this.save.gold < cost) {
      this.onEvent(`You need ${cost} z to refine your sword`);
      return;
    }
    this.save.gold -= cost;
    this.save.weapon++;
    this.onEvent(`Sword refined to +${this.save.weapon}`, "level");
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
    this.time += dt;
    this.routeTimer -= dt;
    this.attackTimer -= dt;
    this.cooldowns = this.cooldowns.map((c) => Math.max(0, c - dt));
    this.save.mp = Math.min(this.maxMp, this.save.mp + dt * 0.7);
    if (dx || dz) {
      this.target = null;
      this.destination = null;
      const len = Math.hypot(dx, dz);
      this.x += (dx / len) * dt * 4.4;
      this.z += (dz / len) * dt * 4.4;
    } else {
      const m = this.monsters.find((e) => e.id === this.target && e.alive);
      const dest = m || this.destination;
      if (dest) {
        const dist = Math.hypot(dest.x - this.x, dest.z - this.z);
        if (dist > (m ? 1.8 : 0.15)) {
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
            const movement = Math.min(nd, dt * 4.4);
            this.x += ((next.x - this.x) / nd) * movement;
            this.z += ((next.z - this.z) / nd) * movement;
          }
        } else if (m && this.attackTimer <= 0) {
          this.hit(m, this.damage);
          this.attackTimer = 0.7 / (1 + (this.save.stats.agi - 5) * 0.04);
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
      if (!m.alive) {
        m.respawn -= dt;
        if (m.respawn <= 0) {
          m.alive = true;
          m.hp = species[m.kind].hp;
          m.x = m.homeX;
          m.z = m.homeZ;
        }
        continue;
      }
      const d = Math.hypot(m.x - this.x, m.z - this.z);
      if (m.id === this.target && d < 4) {
        if (d > 1.6) {
          m.x += ((this.x - m.x) / d) * dt * 0.7;
          m.z += ((this.z - m.z) / d) * dt * 0.7;
        }
        m.attack -= dt;
        if (d < 2.2 && m.attack <= 0) {
          this.save.hp -= 5 + Math.floor(m.id / 5);
          m.attack = 1.4;
          this.onEvent("−6", "hurt", this.x, this.z);
        }
      } else {
        m.x = m.homeX + Math.sin(this.time * 0.35 + m.id) * 0.55;
        m.z = m.homeZ + Math.cos(this.time * 0.25 + m.id) * 0.55;
      }
    }
    if (this.save.hp <= 0) {
      this.save.hp = this.maxHp;
      this.save.mp = this.maxMp;
      this.x = 0;
      this.z = 2;
      this.target = null;
      this.save.gold = Math.max(0, this.save.gold - 15);
      this.onEvent("Rescued at camp · 15 z recovery fee", "level");
      this.persist();
    }
  }
}
