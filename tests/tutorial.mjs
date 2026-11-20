import assert from "node:assert/strict";

export async function checkTutorial(page, url) {
  const start = page.getByRole("button", { name: "Обучение", exact: true });
  const tip = page.locator(".atrium-tutorial");
  const next = tip.getByRole("button", { name: "Далее", exact: true });
  const done = tip.getByRole("button", { name: "Готово", exact: true });
  const prev = tip.getByRole("button", { name: "Назад", exact: true });
  const progress = tip.locator(".driver-popover-progress-text");
  const getData = () =>
    page.evaluate(() => localStorage.getItem("atrium.db.v1"));
  const snapshot = await getData();
  const open = async () => {
    await start.click();
    await tip.waitFor();
    assert.match(await progress.textContent(), /Шаг 1 из \d+/);
  };
  const completeSteps = async () => {
    for (let i = 0; i < 9; i++) {
      const box = await tip.boundingBox(),
        view = page.viewportSize();
      assert.ok(
        box &&
          box.x >= -1 &&
          box.y >= -1 &&
          box.x + box.width <= view.width + 1 &&
          box.y + box.height <= view.height + 1,
        "Tutorial fits the viewport",
      );
      assert.ok((await page.locator(".driver-active-element").count()) > 0);
      if ((await done.count()) && (await done.isVisible())) return;
      await next.click();
    }
    assert.fail("Tutorial did not reach its final step");
  };
  await open();
  await next.click();
  await prev.click();
  assert.match(await progress.textContent(), /Шаг 1 из/);
  await page.keyboard.press("Escape");
  await tip.waitFor({ state: "hidden" });
  await page.waitForFunction(() =>
    document.activeElement?.classList.contains("help-trigger"),
  );
  const examples = [
    ["Директор", "Открыть заявку", "requests"],
    ["Управляющий", "Открыть отчёт", "tasks"],
    ["Технический специалист", "Открыть задачу", "tasks"],
    ["Бухгалтер", "Открыть начисление", "ledger"],
    ["Снабжение", "Открыть закупку", "supply"],
  ];
  for (const [index, [role, label, section]] of examples.entries()) {
    if (index !== 0) {
      await page
        .getByRole("button", { name: "Сменить роль", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: new RegExp(role) })
        .click();
    }
    if (index === 3) await page.setViewportSize({ width: 390, height: 844 });
    await open();
    await completeSteps();
    await tip.getByRole("button", { name: new RegExp(label) }).click();
    await tip.waitFor({ state: "hidden" });
    await page.waitForURL((u) => u.hash.startsWith("#/" + section + "/"));
    await open();
    await completeSteps();
    await done.click();
    await tip.waitFor({ state: "hidden" });
    assert.equal(await getData(), snapshot);
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole("button", { name: "Сменить роль", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Директор/ })
    .click();
  for (const section of [
    "buildings",
    "map",
    "calendar",
    "audit",
    "reports",
    "notifications",
  ]) {
    await page.goto(url + "#/" + section);
    await open();
    await completeSteps();
    await done.click();
    await tip.waitFor({ state: "hidden" });
    assert.equal(new URL(page.url()).hash, "#/" + section);
  }
  await page.goto(url + "#/buildings");
  await page.getByLabel("Поиск по реестру").fill("Нет такого здания 000");
  await open();
  await completeSteps();
  await done.click();
  assert.equal(
    await page.getByLabel("Поиск по реестру").inputValue(),
    "Нет такого здания 000",
  );
  assert.equal(await getData(), snapshot);
  await page.goto(url + "#/home");
  console.log(
    "Contextual tutorials passed across all five roles, record cards and mobile.",
  );
}
