import { test, expect, type Page } from "@playwright/test";
const snapshot = (page: Page) =>
  page.evaluate(() => (window as any).mossvale.snapshot());
test("complete adventure loop, windows, upgrades and persistent progress", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(
    () => (window as any).mossvale?.snapshot().drawCalls > 0,
    {},
    { timeout: 30000 },
  );
  await expect(page.locator("#hp-text")).toHaveText("120 / 120");
  await expect(page.locator("#game")).toBeVisible();
  await page.screenshot({ path: "artifacts/desktop.png" });
  const initial = await snapshot(page);
  await page.keyboard.down("d");
  await page.waitForFunction(
    () => (window as any).mossvale.snapshot().x > 0.2,
    {},
    { timeout: 15000 },
  );
  await page.keyboard.up("d");
  expect((await snapshot(page)).x).toBeGreaterThan(initial.x + 0.2);
  await page.keyboard.press("Tab");
  await page.waitForFunction(
    () => (window as any).mossvale.snapshot().target !== null,
  );
  await page.waitForFunction(
    () => {
      const s = (window as any).mossvale.snapshot();
      return s.monsters.some((m: any) => m.hp < 55);
    },
    {},
    { timeout: 20000 },
  );
  await page.keyboard.press("1");
  await page.waitForFunction(
    () => (window as any).mossvale.snapshot().kills >= 1,
    {},
    { timeout: 20000 },
  );
  await page.keyboard.press("f");
  expect(
    (await snapshot(page)).items.some((i: any) => !i.name.includes("potion")),
  ).toBeTruthy();
  await page.keyboard.press("i");
  await expect(page.getByRole("dialog", { name: "Inventory" })).toBeVisible();
  const paused = await snapshot(page);
  await page.waitForTimeout(250);
  expect((await snapshot(page)).x).toBe(paused.x);
  await page.screenshot({ path: "artifacts/inventory.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Forge", exact: true }).click();
  const before = await snapshot(page);
  await page.getByRole("button", { name: /Refine sword/ }).click();
  const refined = await snapshot(page);
  expect(refined.weapon).toBe(before.weapon + 1);
  expect(refined.gold).toBe(before.gold - 60);
  await page.keyboard.press("Escape");
  await page.keyboard.press("c");
  await expect(
    page.getByRole("dialog", { name: "Character", exact: true }),
  ).toBeVisible();
  await page.locator('[data-stat="vit"]').click();
  await page.screenshot({ path: "artifacts/character.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator("#hp-text")).toContainText("/ 124");
  await page.keyboard.press("k");
  await expect(
    page.getByRole("dialog", { name: "Skills", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  const buyBefore = await snapshot(page);
  await page.getByRole("button", { name: "Buy · 15 z" }).click();
  expect((await snapshot(page)).gold).toBe(buyBefore.gold - 15);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Auto", exact: true }).click();
  await page.waitForFunction(
    () => (window as any).mossvale.snapshot().kills >= 5,
    {},
    { timeout: 90000 },
  );
  await page.getByRole("button", { name: "Auto", exact: true }).click();
  await expect(page.locator("#claim")).toBeVisible();
  const questBefore = await snapshot(page);
  await page.locator("#claim").click();
  expect((await snapshot(page)).gold).toBe(questBefore.gold + 100);
  await expect(page.locator("#quest-reward")).toHaveText("✓ QUEST COMPLETE");
  const completed = await snapshot(page);
  expect(completed.level).toBeGreaterThanOrEqual(2);
  await page.reload();
  await page.waitForFunction(
    () => (window as any).mossvale?.snapshot().drawCalls > 0,
    {},
    { timeout: 30000 },
  );
  await expect(page.locator("#level-badge")).toHaveText(
    String(completed.level),
  );
  const reloaded = await snapshot(page);
  expect(reloaded.kills).toBe(completed.kills);
  expect(reloaded.weapon).toBe(completed.weapon);
  expect(reloaded.gold).toBe(completed.gold);
  expect(errors).toEqual([]);
  expect(reloaded.drawCalls).toBeLessThan(200);
  // Travel across the northern wall to exercise obstacle-aware movement.
  await page.keyboard.press("m");
  await expect(
    page.getByRole("dialog", { name: "Moonlit Glade" }),
  ).toBeVisible();
  const map = page.locator("#large-map");
  const bounds = (await map.boundingBox())!;
  await map.click({
    position: {
      x: bounds.width * (0.5 - 4 / 32),
      y: bounds.height * (0.5 - 8 / 32),
    },
  });
  await page.waitForFunction(
    () => {
      const s = (window as any).mossvale.snapshot();
      return Math.hypot(s.x + 4, s.z + 8) < 0.5;
    },
    {},
    { timeout: 45000 },
  );
  await page.screenshot({ path: "artifacts/adventure.png" });
});
test("mobile controls and inventory fit viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(
    () => (window as any).mossvale?.snapshot().drawCalls > 0,
    {},
    { timeout: 30000 },
  );
  await expect(page.locator("#hp-text")).toHaveText("120 / 120");
  await expect(page.locator(".touch-controls")).toBeVisible();
  await page.screenshot({ path: "artifacts/mobile.png" });
  await page.locator('[data-panel="inventory"]').click();
  await expect(page.getByRole("dialog", { name: "Inventory" })).toBeVisible();
  const bounds = (await page.getByRole("dialog").boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "artifacts/mobile-inventory.png" });
  await page.getByRole("button", { name: "Close window" }).click();
  expect((await snapshot(page)).paused).toBe(false);
});

test.describe("Babylon input and recovery", () => {
  test.use({ deviceScaleFactor: 2 });
  test("picks actors and ground after zoom and restores a lost graphics context", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.waitForFunction(
      () => (window as any).mossvale?.snapshot().drawCalls > 0,
    );
    expect((await snapshot(page)).engine).toBe("Babylon.js");
    await page.mouse.move(850, 430);
    await page.mouse.wheel(0, -300);
    await expect.poll(async () => (await snapshot(page)).zoom).toBeLessThan(1);
    await page.mouse.click(840, 420);
    await expect
      .poll(async () => (await snapshot(page)).destination)
      .not.toBeNull();
    const destination = (await snapshot(page)).destination;
    await page.waitForFunction((dest) => {
      const state = (window as any).mossvale.snapshot();
      return Math.hypot(state.x - dest.x, state.z - dest.z) < 0.4;
    }, destination);
    // The screen point comes from the same read-only projection that positions labels.
    const monster = (await snapshot(page)).monsters.find(
      (m: any) => m.id === 0,
    );
    await page.mouse.click(monster.screen.x, monster.screen.y);
    await expect.poll(async () => (await snapshot(page)).target).toBe(0);
    await page.waitForFunction(
      () => (window as any).mossvale.snapshot().monsters[0].hp < 55,
    );
    await page.screenshot({ path: "artifacts/babylon-picking.png" });
    const extension = await page.evaluate(() => {
      const canvas = document.querySelector("#game") as HTMLCanvasElement;
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      const ext = gl?.getExtension("WEBGL_lose_context");
      (window as any).__testGraphics = ext;
      ext?.loseContext();
      return !!ext;
    });
    expect(extension).toBe(true);
    await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
    await page.evaluate(() => (window as any).__testGraphics.restoreContext());
    await expect.poll(async () => (await snapshot(page)).paused).toBe(false);
    await page.keyboard.press("i");
    await expect(page.getByRole("dialog", { name: "Inventory" })).toBeVisible();
    await page.keyboard.press("Escape");
    expect((await snapshot(page)).drawCalls).toBeLessThan(200);
    expect(errors).toEqual([]);
  });
});
