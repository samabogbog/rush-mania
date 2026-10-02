import { test, expect } from "@playwright/test";
import { Simulation } from "../src/simulation";
import {
  classes,
  skills,
  damageAfterDefense,
  MAX_LEVEL,
  type ClassId,
} from "../src/game/classes";

test.beforeEach(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    },
  });
});

test("migrates legacy saves, preserves progress, and caps levels at 100", () => {
  const legacy = new Simulation().save;
  const { job, hotbar, version, ...oldSave } = legacy;
  localStorage.setItem(
    "mossvale-save",
    JSON.stringify({ ...oldSave, level: 9, xp: 439, gold: 555, weapon: 3 }),
  );
  const sim = new Simulation();
  expect(sim.save.job).toBe("swordsman");
  expect(sim.save.gold).toBe(555);
  expect(sim.save.weapon).toBe(3);
  expect(sim.unlockedSkills).toHaveLength(0);
  sim.addExperience(1);
  expect(sim.save.level).toBe(10);
  expect(sim.unlockedSkills.map((skill) => skill.level)).toEqual([10]);
  sim.addExperience(1_000_000);
  expect(sim.save.level).toBe(MAX_LEVEL);
  expect(sim.save.xp).toBe(0);
  expect(sim.unlockedSkills).toHaveLength(10);
  sim.persist();
  expect(new Simulation().save).toEqual(sim.save);
});

test("defense formula mitigates damage for both combatants and attack rolls vary", () => {
  expect(damageAfterDefense(100, 0)).toBe(100);
  expect(damageAfterDefense(100, 100)).toBe(50);
  expect(damageAfterDefense(100, 300)).toBe(25);
  const sim = new Simulation(() => 0.5);
  const monster = sim.monsters[0];
  sim.hit(monster, 108);
  expect(monster.hp).toBe(-45); // 108 ATK vs 8 DEF = 100.
  const weak = new Simulation(() => 0.2),
    strong = new Simulation(() => 0.8);
  weak.hit(weak.monsters[0], 30);
  strong.hit(strong.monsters[0], 30);
  expect(weak.monsters[0].hp).toBeGreaterThan(strong.monsters[0].hp);
});

test("all three classes expose ten gated usable skills and respect mana and cooldowns", () => {
  for (const job of Object.keys(classes) as ClassId[]) {
    expect(skills[job]).toHaveLength(10);
    expect(skills[job].map((skill) => skill.level)).toEqual([
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    ]);
    for (const skill of skills[job]) {
      const sim = new Simulation(() => 0.5);
      sim.setClass(job);
      const monster = sim.monsters[0];
      monster.x = sim.x + 1;
      monster.z = sim.z;
      sim.target = 0;
      sim.save.level = skill.level - 1;
      sim.save.mp = sim.maxMp;
      expect(sim.castSkill(skill.id)).toBe(false);
      sim.save.level = skill.level;
      sim.save.mp = 0;
      expect(sim.castSkill(skill.id)).toBe(false);
      sim.save.mp = sim.maxMp;
      sim.save.hp = sim.maxHp * 0.4;
      expect(sim.castSkill(skill.id)).toBe(true);
      if (sim.cast) sim.tick(skill.cast! + 0.01, 0, 0);
      expect(sim.skillCooldowns[skill.id]).toBeGreaterThan(0);
      expect(sim.castSkill(skill.id)).toBe(false);
      if (skill.effect === "heal")
        expect(sim.save.hp).toBeGreaterThan(sim.maxHp * 0.4);
      else if (skill.effect === "guard")
        expect(sim.guard.time).toBeGreaterThan(0);
      else if (skill.effect === "fury")
        expect(sim.fury.time).toBeGreaterThan(0);
      else expect(monster.hp).toBeLessThan(55);
    }
  }
});

test("skill assignment prevents duplicate slots, keeps cooldowns, and cancels casts when moving", () => {
  const sim = new Simulation(() => 0.5);
  sim.setClass("mage");
  sim.save.level = 30;
  sim.save.mp = sim.maxMp;
  expect(sim.assignSkill(0, "mage-3")).toBe(true);
  expect(sim.assignSkill(1, "mage-3")).toBe(true);
  expect(sim.save.hotbar.filter((id) => id === "mage-3")).toHaveLength(1);
  expect(sim.assignSkill(2, "mage-10")).toBe(false);
  expect(sim.assignSkill(2, "archer-1")).toBe(false);
  expect(sim.assignSkill(4, "mage-1")).toBe(false);
  const monster = sim.monsters[0];
  monster.x = 1;
  monster.z = 2;
  sim.target = 0;
  expect(sim.castSkill("mage-1")).toBe(true);
  sim.tick(0.1, 1, 0);
  expect(sim.cast).toBeNull();
  expect(monster.hp).toBe(55);
  expect(sim.skillCooldowns["mage-1"]).toBeGreaterThan(0);
});

test("monster attacks are telegraphed and can be avoided by moving out of range", () => {
  const sim = new Simulation(() => 0.5);
  const monster = sim.monsters[0];
  monster.x = 1;
  monster.z = 2;
  sim.target = 0;
  sim.attackTimer = 10;
  sim.tick(0.01, 0, 0);
  expect(monster.windup).toBeGreaterThan(0);
  const hp = sim.save.hp;
  sim.x = 5;
  sim.tick(0.7, 1, 0);
  expect(sim.save.hp).toBe(hp);
  expect(monster.windup).toBeLessThanOrEqual(0);
  sim.x = monster.x;
  sim.z = monster.z;
  sim.target = 0;
  monster.attack = 0;
  sim.tick(0.01, 0, 0);
  sim.tick(0.7, 0, 0);
  expect(sim.save.hp).toBeLessThan(hp);
});
