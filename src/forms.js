import {
  ROLES,
  buildStatus,
  roomStatus,
  condition,
  categories,
  docsCat,
  day,
  baseType,
  principal,
  get,
  visible,
  financeRole,
  activeLease,
  unpaid,
  finDoc,
} from "./model";
const text = (k, l, required = false) => ({ k, l, kind: "text", required });
const num = (k, l, min = 0, max = undefined) => ({
  k,
  l,
  kind: "number",
  min,
  max,
});
const sel = (k, l, options, required = true) => ({
  k,
  l,
  kind: "select",
  options,
  required,
});
const ref = (k, l, table, required = true) => ({
  k,
  l,
  kind: "ref",
  table,
  required,
});
const dt = (k, l, required = false) => ({ k, l, kind: "date", required });
const area = (k, l) => ({ k, l, kind: "textarea" });
const building = () => ref("building", "Объект", "buildings");
const room = () => ref("room", "Помещение", "rooms", false);
const worker = () => ref("worker", "Исполнитель", "staff");
const manager = () => ref("manager", "Управляющий", "staff");
const status = (o) => sel("status", "Статус", o);
export const docTargets = {
  buildings: "Объект",
  rooms: "Помещение",
  tasks: "Задача",
  requests: "Заявка",
  repairs: "Ремонт",
  leases: "Договор",
  tenants: "Арендатор",
  ledger: "Операция",
};
export function fields(t, d, r = 0) {
  switch (t) {
    case "buildings":
    case "construction":
      return [
        text("name", "Название", true),
        text("address", "Адрес", true),
        num("area", "Общая площадь, м²", 1),
        num("floors", "Этажность", 1, 250),
        manager(),
        ref("staff", "Технический специалист", "staff", false),
        sel("condition", "Техническое состояние", condition),
        ...(t === "construction"
          ? []
          : [
              status(
                d.status === "Строится"
                  ? ["Строится"]
                  : buildStatus.filter((x) => x !== "Строится"),
              ),
            ]),
        num("lat", "Широта", -85, 85),
        num("lng", "Долгота", -180, 180),
        ...(t === "construction" || d.project
          ? [
              text("stage", "Этап строительства", true),
              num("progress", "Готовность, %", 0, 100),
              text("contractor", "Подрядчик"),
              dt("start", "Начало строительства"),
              dt("due", "Плановая сдача", true),
              ...(financeRole(r) ? [num("budget", "Плановый бюджет, ₽")] : []),
              area("changes", "Корректировки проекта"),
            ]
          : []),
        area("description", "Описание"),
      ];
    case "rooms":
      return [
        building(),
        text("name", "Номер или название", true),
        num("floor", "Этаж", -10, 250),
        num("area", "Площадь, м²", 0.1),
        sel("purpose", "Назначение", [
          "Офис",
          "Магазин",
          "Торговый зал",
          "Склад",
          "Производство",
          "Другое",
        ]),
        status(
          d.lease
            ? ["Арендуется"]
            : roomStatus.filter((x) => x !== "Арендуется"),
        ),
        area("features", "Характеристики"),
      ];
    case "tenants":
      return [
        text("name", "Организация или ФИО", true),
        text("contact", "Контактное лицо", true),
        text("phone", "Телефон"),
        { ...text("email", "Электронная почта"), kind: "email" },
        text("address", "Адрес"),
        area("details", "Реквизиты"),
        status(["Активен", "Архив"]),
      ];
    case "leases":
      return [
        text("name", "Номер договора", true),
        building(),
        ref("room", "Помещение", "rooms"),
        ref("tenant", "Арендатор", "tenants"),
        dt("start", "Начало аренды", true),
        dt("end", "Окончание аренды", true),
        num("rate", "Аренда в месяц, ₽", 1),
        sel("period", "Периодичность", [
          "Ежемесячно",
          "Ежеквартально",
          "Ежегодно",
        ]),
        dt("next", "Следующий платёж", true),
        status(["Действует", "Расторгнут"]),
        area("description", "Условия договора"),
      ];
    case "ledger":
      return [
        sel("kind", "Тип операции", ["Поступление", "Расход", "Начисление"]),
        building(),
        ...(d.kind !== "Расход"
          ? [
              ref("tenant", "Арендатор", "tenants", d.kind === "Начисление"),
              ref("lease", "Договор", "leases", false),
            ]
          : []),
        ...(d.kind === "Поступление"
          ? [ref("charge", "В счёт начисления", "ledger", false)]
          : []),
        text("name", "Назначение операции", true),
        sel(
          "category",
          "Категория",
          d.kind === "Расход"
            ? [
                "Коммунальные услуги",
                "Содержание",
                "Материалы",
                "Ремонт",
                "Подрядные работы",
                "Обслуживание",
                "Прочее",
              ]
            : ["Аренда", "Дополнительный платёж", "Прочее"],
        ),
        num("amount", "Сумма, ₽", 0.01),
        dt("date", "Дата операции", true),
        ...(d.kind === "Расход"
          ? [dt("next", "Следующий плановый платёж")]
          : []),
        ...(d.kind === "Начисление" ? [dt("due", "Срок оплаты", true)] : []),
        ...(d.kind === "Поступление"
          ? [text("reference", "Номер платёжного документа", true)]
          : []),
      ];
    case "tasks":
      return [
        text("name", "Название задачи", true),
        building(),
        room(),
        sel("category", "Категория", categories),
        sel("priority", "Приоритет", ["Обычный", "Высокий", "Низкий"]),
        manager(),
        worker(),
        dt("due", "Срок выполнения", true),
        area("description", "Описание задания"),
      ];
    case "repairs":
      return [
        text("name", "Название работ", true),
        building(),
        room(),
        ref("task", "Связанная задача", "tasks", false),
        sel("category", "Вид обслуживания", categories),
        dt("start", "Дата неисправности", true),
        dt("due", "Дата работ", true),
        worker(),
        status(["Запланирован", "В работе", "Завершён"]),
        text("reason", "Причина повреждения"),
        text("damageType", "Характер повреждения"),
        area("description", "Описание проблемы"),
        area("work", "Выполненные работы"),
        ...(financeRole(r)
          ? [
              num("cost", "Стоимость работ, ₽"),
              num("materialsCost", "Материалы, ₽"),
              num("extra", "Прочие расходы, ₽"),
              num("damage", "Ущерб имуществу, ₽"),
              num("lost", "Потерянный доход, ₽"),
            ]
          : []),
      ];
    case "requests":
      return [
        text("name", "Материалы или работы", true),
        building(),
        sel("category", "Тип заявки", [
          "Материалы",
          "Инструменты",
          "Оборудование",
          "Доставка",
          "Услуги",
          "Строительные работы",
        ]),
        num("quantity", "Количество", 0.01),
        sel("unit", "Единица измерения", [
          "шт.",
          "м",
          "м²",
          "м³",
          "кг",
          "компл.",
          "усл.",
        ]),
        dt("due", "Требуется к", true),
        area("description", "Обоснование заявки"),
      ];
    case "staff":
      return [
        text("name", "Имя и фамилия", true),
        sel("role", "Роль", r === 1 ? [ROLES[2]] : ROLES),
        { ...text("email", "Рабочая почта", true), kind: "email" },
        text("phone", "Телефон"),
        ref("supervisor", "Руководитель", "staff", false),
        status(["Работает", "В отпуске", "Неактивен"]),
      ];
    case "docs":
      return [
        text("name", "Название документа", true),
        building(),
        sel(
          "entity",
          "Связать с",
          Object.entries(docTargets)
            .filter(
              ([k]) =>
                financeRole(r) || !["leases", "tenants", "ledger"].includes(k),
            )
            .filter(([k]) => r !== 4 || k === "requests")
            .map(([value, label]) => ({ value, label })),
        ),
        ref("link", "Запись", d.entity || "buildings"),
        sel(
          "category",
          "Категория",
          docsCat.filter(
            (c) =>
              financeRole(r) ||
              !finDoc({ category: c }) ||
              (r === 4 &&
                d.entity === "requests" &&
                ["Счёт", "Чек"].includes(c)),
          ),
        ),
        { k: "file", l: "Файл", kind: "file", required: !d.id },
      ];
    default:
      return [];
  }
}
export function defaults(s, t, r, ctx = {}) {
  const me = principal(s, r)?.id;
  const b =
    ctx.building ||
    visible(s, r, "buildings")[0]?.id ||
    (r === 4 ? visible(s, r, "supply")[0]?.building : "");
  const obj = get(s, "buildings", b);
  const d = {
    building: b,
    created: day(),
    author: me,
    date: day(),
    start: day(),
    due: day(7),
    end: day(365),
    next: day(30),
    manager: obj?.manager || "u1",
    worker: r === 2 ? me : obj?.staff || "u2",
    supervisor: r === 1 ? me : "",
    kind: "Поступление",
    entity: r === 4 ? "requests" : "buildings",
    link: b,
    lat: 55.75,
    lng: 37.61,
    version: 1,
    quantity: 1,
    ...ctx,
  };
  for (const f of fields(t, d, r))
    if (f.kind === "select" && d[f.k] === undefined)
      d[f.k] = f.options[0]?.value || f.options[0];
  if (t === "construction") {
    d.status = "Строится";
    d.project = true;
    d.progress = 0;
  }
  if (t === "docs" && r === 4 && !ctx.link)
    d.link = visible(s, r, "supply").find((x) => x.building === b)?.id || "";
  if (t === "ledger" && !ctx.next) d.next = "";
  if (t === "tasks") d.status = "Назначена";
  if (t === "requests") d.status = "На согласовании";
  return d;
}
export function choices(s, r, t, f, d) {
  if (f.kind === "select")
    return f.options.map((o) =>
      typeof o === "string" ? { value: o, label: o } : o,
    );
  let rows = visible(s, r, f.table);
  if (f.table === "staff")
    rows = s.staff.filter(
      (x) =>
        x.status !== "Неактивен" &&
        (f.k === "manager" || f.k === "supervisor"
          ? x.role === ROLES[1]
          : x.role === ROLES[2]) &&
        (r !== 1 ||
          (f.k === "manager" && x.id === principal(s, r)?.id) ||
          (f.k === "supervisor" && x.id === principal(s, r)?.id) ||
          x.supervisor === principal(s, r)?.id) &&
        (r !== 2 || x.id === principal(s, r)?.id),
    );
  if (f.table === "buildings" && r === 4)
    rows = s.buildings.filter((b) =>
      visible(s, r, "supply").some((x) => x.building === b.id),
    );
  if (f.table === "buildings" && r === 2 && t === "requests")
    rows = visible(s, r, "buildings");
  if (f.k === "link" && f.table === "buildings")
    rows = rows.filter((x) => x.id === d.building);
  if (
    ["rooms", "tasks", "requests", "ledger", "leases", "repairs"].includes(
      f.table,
    )
  )
    rows = rows.filter((x) => x.building === d.building);
  if (f.k === "charge")
    rows = rows.filter(
      (x) =>
        x.kind === "Начисление" &&
        (!d.tenant || x.tenant === d.tenant) &&
        (!d.lease || d.lease === x.lease) &&
        unpaid(s, x) > 0,
    );
  if (f.table === "leases" && d.tenant)
    rows = rows.filter((x) => x.tenant === d.tenant);
  return rows.map((x) => ({
    value: x.id,
    label:
      x.name +
      (f.k === "charge"
        ? " · " + unpaid(s, x).toLocaleString("ru-RU") + " ₽"
        : ""),
  }));
}
export function validate(s, t, d, old) {
  if (t === "leases") {
    if (d.end < d.start) return "Окончание аренды должно быть позже её начала.";
    if (
      d.status !== "Расторгнут" &&
      s.leases.some(
        (x) =>
          x.id !== d.id &&
          x.room === d.room &&
          x.status !== "Расторгнут" &&
          x.start <= d.end &&
          x.end >= d.start,
      )
    )
      return "На эти даты у помещения уже есть договор.";
  }
  if (t === "ledger") {
    if (
      d.reference &&
      s.ledger.some(
        (x) =>
          x.id !== d.id &&
          x.reference?.trim().toLowerCase() ===
            d.reference.trim().toLowerCase(),
      )
    )
      return "Операция с таким номером уже зарегистрирована.";
    if (d.charge) {
      const x = get(s, "ledger", d.charge);
      if (
        !x ||
        x.building !== d.building ||
        x.tenant !== d.tenant ||
        Number(d.amount) >
          unpaid(s, x) + (old?.charge === x.id ? old.amount : 0)
      )
        return "Проверьте начисление и остаток к оплате.";
    }
    if (
      d.kind === "Начисление" &&
      old &&
      d.amount < old.amount - unpaid(s, old)
    )
      return "Сумма меньше уже полученных платежей.";
  }
  if (t === "repairs" && d.due < d.start)
    return "Дата работ должна быть не раньше даты неисправности.";
  if (t === "construction" && d.due < d.start)
    return "Проверьте плановые сроки строительства.";
  if (
    t === "staff" &&
    old?.persona !== undefined &&
    (old.role !== d.role || d.status === "Неактивен")
  )
    return "Этот сотрудник представляет роль в презентации. Его профиль должен оставаться активным.";
  if (
    t === "rooms" &&
    s.rooms.some(
      (x) =>
        x.id !== d.id &&
        x.building === d.building &&
        x.name.toLowerCase() === d.name.toLowerCase(),
    )
  )
    return "В здании уже есть помещение с таким номером.";
  return "";
}
export function formResult(t, d, r, old) {
  const result = { ...old };
  if (!old) Object.assign(result, { created: day(), author: d.author });
  for (const f of fields(t, d, r)) {
    if (f.kind === "file") continue;
    result[f.k] =
      f.kind === "number"
        ? Number(d[f.k] || 0)
        : typeof d[f.k] === "string"
          ? d[f.k].trim()
          : d[f.k] || "";
  }
  if (t === "construction")
    Object.assign(result, { project: true, status: old?.status || "Строится" });
  if (t === "tasks" && !old)
    Object.assign(result, { status: "Назначена", history: [] });
  if (t === "requests" && old) {
    for (const k of [
      "buyer",
      "supplier",
      "price",
      "delivery",
      "received",
      "actual",
      "note",
      "comment",
    ])
      delete result[k];
  }
  if (t === "requests")
    Object.assign(result, {
      status: "На согласовании",
      version: (old?.version || 0) + 1,
      approval: null,
      history: old?.history || [],
    });
  if (t === "docs") result.date = day();
  return result;
}
