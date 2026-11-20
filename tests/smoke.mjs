import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
const url = process.env.ATRIUM_URL || "http://127.0.0.1:4192/";
const executablePath =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
  ].find(existsSync);
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  acceptDownloads: true,
});
page.setDefaultTimeout(7000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const db = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("atrium.db.v1")));
async function visit(t, id = "") {
  await page.goto(url + "#/" + t + (id ? "/" + id : ""));
  await page.locator("main h1").waitFor();
}
const btn = (label) => page.getByRole("button", { name: label, exact: true });
const dlg = () => page.getByRole("dialog");
const dialogButton = (n) =>
  dlg().getByRole("button", { name: n, exact: true }).click();
async function role(text) {
  await btn("Сменить роль").click();
  await dlg()
    .getByRole("button", { name: new RegExp("^" + text + "|" + text) })
    .first()
    .click();
  await dlg().waitFor({ state: "hidden" });
}
async function action(label, fields = {}) {
  await btn(label).click();
  for (const [l, v] of Object.entries(fields))
    await dlg().getByLabel(l, { exact: false }).fill(v);
  await dialogButton("Подтвердить");
  await dlg().waitFor({ state: "hidden" });
}
async function saveForm() {
  await dialogButton("Сохранить");
  await dlg().waitFor({ state: "hidden" });
}
async function add(t, fields, selects = {}) {
  await visit(t);
  await btn("Добавить").click();
  for (const [l, v] of Object.entries(fields))
    await dlg().getByLabel(l, { exact: false }).fill(v);
  for (const [l, v] of Object.entries(selects))
    await dlg().getByLabel(l, { exact: false }).selectOption(v);
  await saveForm();
  return decodeURIComponent(new URL(page.url()).hash.split("/").at(-1));
}
try {
  await visit("home");
  assert.equal((await db()).buildings.length, 52);
  for (const t of [
    "buildings",
    "rooms",
    "tenants",
    "leases",
    "ledger",
    "construction",
    "repairs",
    "tasks",
    "requests",
    "supply",
    "staff",
    "docs",
    "map",
    "calendar",
    "reports",
    "audit",
    "notifications",
  ]) {
    await visit(t);
    assert.ok((await page.locator("main h1").textContent()).length);
  }
  console.log("17 sections rendered");
  await visit("home");
  await btn("Создать").click();
  assert.ok(
    await dlg().getByRole("button", { name: "Объект", exact: true }).count(),
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await dlg().getByPlaceholder("Название, адрес или номер…").fill("Меридиан");
  assert.ok((await dlg().getByRole("button").count()) > 1);
  await page.keyboard.press("Escape");
  const b = await add("buildings", {
    Название: "Тестовый корпус",
    Адрес: "Москва, тестовый проезд",
    "Общая площадь": "5100",
    Этажность: "4",
  });
  assert.ok((await db()).buildings.find((x) => x.id === b));
  const room = await add(
    "rooms",
    { "Номер или название": "QA-401", Площадь: "120" },
    { Объект: b },
  );
  const tenant = await add("tenants", {
    "Организация или ФИО": "Тестовый арендатор",
    "Контактное лицо": "Контакт",
  });
  const lease = await add(
    "leases",
    { "Номер договора": "QA-LEASE", "Аренда в месяц": "95000" },
    { Объект: b, Помещение: room, Арендатор: tenant },
  );
  assert.equal((await db()).rooms.find((x) => x.id === room).lease, lease);
  await visit("ledger", "c0-0");
  await page.getByRole("button", { name: /Зарегистрировать оплату/ }).click();
  await dlg().getByLabel("Номер платёжного документа").fill("QA-PAYMENT-001");
  await saveForm();
  await visit("ledger", "c0-0");
  assert.equal(
    await page.getByRole("button", { name: /Зарегистрировать оплату/ }).count(),
    0,
  );
  console.log("Assets, lease and payment linked");
  await role("Технический специалист");
  assert.equal(
    await page.locator("nav").getByText("Финансы", { exact: true }).count(),
    0,
  );
  await visit("ledger");
  assert.ok(
    await page
      .getByRole("heading", { name: "Технический специалист", exact: true })
      .count(),
  );
  await visit("tasks", "t0");
  await action("Передать на проверку", {
    "Выполненные работы": "Проверено и исправлено",
    "Использованные материалы": "Клапан",
  });
  assert.equal(
    (await db()).tasks.find((x) => x.id === "t0").status,
    "На проверке",
  );
  await role("Управляющий");
  await visit("tasks", "t0");
  await action("Вернуть на доработку", {
    "Комментарий / причина": "Добавить замер",
  });
  await role("Технический специалист");
  await visit("tasks", "t0");
  await action("Начать работу");
  await action("Передать на проверку", {
    "Выполненные работы": "Контрольный замер выполнен",
  });
  await role("Управляющий");
  await visit("tasks", "t0");
  await action("Принять работу");
  await role("Директор");
  await visit("tasks", "t0");
  await action("Закрыть задачу");
  await visit("requests", "q0");
  await action("Подписать и согласовать", {
    "Комментарий (необязательно)": "Согласовано",
  });
  await role("Снабжение");
  await visit("supply");
  await page.getByLabel("Поиск по реестру").fill("Фильтры");
  assert.equal(await page.locator("tbody tr").count(), 1);
  await visit("supply", "q0");
  await action("Принять в закупку");
  await action("Оформить заказ", {
    Поставщик: "Тест-снаб",
    "Стоимость закупки": "4500",
  });
  await action("Подтвердить поставку");
  assert.equal(
    (await db()).requests.find((x) => x.id === "q0").status,
    "Доставлено",
  );
  await role("Директор");
  await visit("requests", "q0");
  await btn("Изменить").click();
  await dlg().getByLabel("Количество").fill("22");
  await dialogButton("Отправить на согласование");
  await dlg().waitFor({ state: "hidden" });
  let req = (await db()).requests.find((x) => x.id === "q0");
  assert.equal(req.status, "На согласовании");
  assert.equal(req.approval, null);
  assert.equal(req.version, 2);
  await role("Снабжение");
  await visit("supply");
  await page.getByLabel("Поиск по реестру").fill("Фильтры");
  assert.equal(await page.locator("tbody tr").count(), 0);
  console.log("Task review, versioned purchasing and role filtering passed");
  await role("Директор");
  const repair = await add(
    "repairs",
    {
      "Название работ": "Тестовый ремонт",
      "Стоимость работ": "1300",
      "Материалы, ₽": "200",
    },
    { Объект: "b0", Помещение: "r0-0", "Связанная задача": "t0" },
  );
  await visit("rooms", "r0-0");
  await btn("История ремонтов").click();
  assert.ok(await page.getByText("Тестовый ремонт", { exact: true }).count());
  await visit("tasks", "t0");
  await btn("История ремонтов").click();
  assert.ok(await page.getByText("Тестовый ремонт", { exact: true }).count());
  await visit("construction", "b3");
  await action("Ввести в эксплуатацию");
  assert.equal((await db()).buildings.find((x) => x.id === "b3").project, true);
  assert.notEqual(
    (await db()).buildings.find((x) => x.id === "b3").status,
    "Строится",
  );
  await visit("docs");
  await btn("Добавить").click();
  await dlg()
    .getByLabel("Файл", { exact: false })
    .setInputFiles({
      name: "Проверка.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8xkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await saveForm();
  await btn("Просмотр").click();
  await dlg().locator("img").waitFor();
  await page.keyboard.press("Escape");
  const dl = page.waitForEvent("download");
  await btn("Скачать").click();
  assert.ok((await dl).suggestedFilename().includes(".png"));
  await visit("calendar");
  await btn("Неделя").click();
  await btn("День").click();
  await btn("Сегодня").click();
  await visit("reports");
  const dl2 = page.waitForEvent("download");
  await btn("Скачать CSV").click();
  assert.ok((await dl2).suggestedFilename().includes(".csv"));
  await visit("map");
  assert.ok((await page.locator(".leaflet-interactive").count()) >= 52);
  await page.locator(".map-row").nth(1).click();
  await page.getByRole("button", { name: "Карточка объекта" }).click();
  assert.ok(page.url().includes("/buildings/"));
  await visit("notifications");
  await btn("Прочитать все").click();
  await page.getByRole("button", { name: "Непрочитанные · 0" }).waitFor();
  await visit("home");
  await page.reload();
  assert.equal((await db()).tasks.find((x) => x.id === "t0").status, "Закрыта");
  await page.setViewportSize({ width: 390, height: 844 });
  await btn("Открыть меню").click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Помещения", exact: true })
    .click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Files, reports, map, calendar, notifications, persistence and mobile navigation passed",
  );
} finally {
  await browser.close();
}
