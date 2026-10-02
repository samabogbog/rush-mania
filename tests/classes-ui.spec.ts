import { test, expect } from "@playwright/test";
import { Simulation } from "../src/simulation";

test("choose classes, assign unlocked skills, cast spells and retain the loadout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const save = new Simulation().save;
  save.level = 20;
  save.gold = 12000;
  save.hp = 348;
  save.mp = 212;
  await page.addInitScript((saved) => {
    if (!localStorage.getItem("mossvale-save"))
      localStorage.setItem("mossvale-save", JSON.stringify(saved));
  }, save);
  await page.goto("/");
  await page.waitForFunction(
    () => (window as any).mossvale?.snapshot().drawCalls > 0,
  );
  await page.keyboard.press("c");
  await page.getByRole("button", { name: /Archer Ranged physical/ }).click();
  await expect(page.locator("#class-name")).toHaveText("ARCHER");
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "artifacts/archer.png" });
  await page.keyboard.press("c");
  await expect(page.locator(".touch-controls")).toBeHidden();
  await page.getByRole("button", { name: /Mage Ranged magic/ }).click();
  await expect(page.locator("#class-name")).toHaveText("MAGE");
  await page.screenshot({ path: "artifacts/class-picker.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("k");
  await expect(page.locator(".skill-card")).toHaveCount(10);
  await expect(page.locator(".skill-locked")).toHaveCount(8);
  await page.getByLabel("Hotbar slot for Fire Bolt").selectOption("2");
  await page.locator('[data-assign="mage-1"]').click();
  await expect(page.locator('.loadout-slot[data-hotbar="2"]')).toContainText(
    "Fire Bolt",
  );
  await page.screenshot({ path: "artifacts/class-skills.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  await page.keyboard.press("5");
  await page.waitForFunction(
    () => (window as any).mossvale.snapshot().skillCooldowns["mage-1"] > 0,
  );
  await page.waitForFunction(
    () => (window as any).mossvale.snapshot().kills > 0,
  );
  await page.reload();
  await page.waitForFunction(
    () => (window as any).mossvale?.snapshot().drawCalls > 0,
  );
  const state = await page.evaluate(() => (window as any).mossvale.snapshot());
  expect(state.job).toBe("mage");
  expect(state.hotbar[2]).toBe("mage-1");
  expect(state.hotbar[0]).toBeNull();
  expect(errors).toEqual([]);
});

test("mobile progression menus and six hotkeys stay inside the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(
    () => (window as any).mossvale?.snapshot().drawCalls > 0,
  );
  const bar = await page.locator(".action-bar").boundingBox();
  expect(bar!.x).toBeGreaterThanOrEqual(0);
  expect(bar!.x + bar!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("c");
  await expect(page.locator(".touch-controls")).toBeHidden();
  await page.getByRole("button", { name: /Mage Ranged magic/ }).click();
  await page.screenshot({ path: "artifacts/mobile-class-picker.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("k");
  const dialog = await page
    .getByRole("dialog", { name: "Skills" })
    .boundingBox();
  expect(dialog!.width).toBeLessThanOrEqual(390);
  await page.locator('[data-skill-id="mage-10"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-assign="mage-10"]')).toBeDisabled();
  await page.screenshot({ path: "artifacts/mobile-class-skills.png" });
  const missing = await page
    .locator("img")
    .evaluateAll((images) =>
      images
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.src),
    );
  expect(missing).toEqual([]);
});
