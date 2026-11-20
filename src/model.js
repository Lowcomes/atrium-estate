export const ROLES = [
  "Директор",
  "Управляющий",
  "Технический специалист",
  "Бухгалтер",
  "Снабжение",
];
export const users = [
  "Анна Волкова",
  "Михаил Соколов",
  "Ирина Белова",
  "Елена Смирнова",
  "Павел Орлов",
];
export const uid = () => crypto.randomUUID();
export const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");
export const rub = (n) => fmt(n) + " ₽";
export const compact = (n) =>
  Math.abs(n) >= 1e6
    ? (n / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + " млн ₽"
    : rub(n);
export const day = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return iso(d);
};
export function iso(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export const date = (d) =>
  d
    ? new Date(d.length === 10 ? d + "T12:00:00" : d)
        .toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
        .replace(" г.", "")
    : "—";
export const financeRole = (r) => r === 0 || r === 3;
export const buildStatus = [
  "Сдаётся в аренду",
  "Частично сдается",
  "Используется компанией",
  "Простаивает",
  "Требует ремонта",
  "На реконструкции",
  "Строится",
  "Частично используется",
];
export const roomStatus = [
  "Свободно",
  "Арендуется",
  "Используется компанией",
  "На ремонте",
];
export const condition = ["Хорошее", "Удовлетворительное", "Требует ремонта"];
export const taskStatus = [
  "Новая",
  "Назначена",
  "Принята исполнителем",
  "В работе",
  "Ожидает материалов",
  "На проверке",
  "На доработке",
  "Выполнена",
  "Закрыта",
  "Отменена",
];
export const reqStatus = [
  "На согласовании",
  "Согласована",
  "Отклонена",
  "В закупке",
  "Заказано",
  "Доставлено",
];
export const categories = [
  "Ремонт",
  "Электрика",
  "Отопление",
  "Водоснабжение",
  "Вентиляция",
  "Уборка",
  "Обслуживание оборудования",
  "Проверка состояния",
  "Строительные работы",
  "Доставка материалов",
  "Прочее",
];
export const docsCat = [
  "Акт",
  "Договор аренды",
  "Дополнительное соглашение",
  "Техническая документация",
  "Проектная документация",
  "Смета",
  "Счёт",
  "Накладная",
  "Чек",
  "Фотоотчёт",
  "Фото до ремонта",
  "Фото после ремонта",
];
export const finDoc = (d) =>
  [
    "Договор аренды",
    "Дополнительное соглашение",
    "Смета",
    "Счёт",
    "Чек",
  ].includes(d.category) || ["ledger", "leases", "tenants"].includes(d.entity);
export const entities = [
  "buildings",
  "rooms",
  "tenants",
  "leases",
  "ledger",
  "tasks",
  "repairs",
  "requests",
  "staff",
  "docs",
  "audit",
];
export const titles = {
  home: "Обзор портфеля",
  buildings: "Объекты",
  rooms: "Помещения",
  tenants: "Арендаторы",
  leases: "Договоры аренды",
  ledger: "Финансы",
  construction: "Строительство",
  repairs: "Обслуживание и ремонты",
  tasks: "Задачи",
  requests: "Согласования",
  supply: "Снабжение",
  staff: "Сотрудники",
  docs: "Документы",
  map: "Карта объектов",
  calendar: "Календарь",
  reports: "Отчёты",
  audit: "Журнал действий",
  notifications: "Уведомления",
};
export const singular = {
  buildings: "Объект",
  rooms: "Помещение",
  tenants: "Арендатор",
  leases: "Договор",
  ledger: "Операция",
  construction: "Строительный объект",
  repairs: "Ремонт",
  tasks: "Задача",
  requests: "Заявка",
  supply: "Закупка",
  staff: "Сотрудник",
  docs: "Документ",
};
export const photo = (i) => "./media/building-" + i + ".jpg";
export const baseType = (t) =>
  t === "construction" ? "buildings" : t === "supply" ? "requests" : t;
export const get = (s, t, id) =>
  (s[baseType(t)] || []).find((x) => x.id === id);
export const name = (s, t, id) => get(s, t, id)?.name || "—";
export const buildingOf = (s, t, x) =>
  baseType(t) === "buildings"
    ? x.id
    : x.building || (x.room && get(s, "rooms", x.room)?.building) || "";
export const unpaid = (s, x) =>
  x.kind === "Начисление"
    ? Math.max(
        0,
        x.amount -
          s.ledger
            .filter((p) => p.charge === x.id && p.kind === "Поступление")
            .reduce((a, b) => a + b.amount, 0),
      )
    : 0;
export const losses = (x) =>
  ["cost", "materialsCost", "extra", "damage", "lost"].reduce(
    (a, k) => a + Number(x[k] || 0),
    0,
  );
export function activeLease(x) {
  return x.start <= day() && x.end >= day() && x.status !== "Расторгнут";
}
export const expiring = (x) => activeLease(x) && x.end <= day(30);
export const overdue = (x) =>
  !!x.due &&
  x.due < day() &&
  ![
    "Закрыта",
    "Выполнена",
    "Отменена",
    "Доставлено",
    "Отклонена",
    "Завершён",
  ].includes(x.status);
export function principal(s, role) {
  return (
    s.staff.find((x) => x.persona === role) ||
    s.staff.find((x) => x.role === ROLES[role])
  );
}
export function canSee(s, role, t, x) {
  if (!x) return false;
  if (role === 0) return true;
  const me = principal(s, role)?.id,
    b = buildingOf(s, t, x),
    key = baseType(t);
  if (key === "audit" || (key === "ledger" && !financeRole(role))) return false;
  if (
    key === "docs" &&
    finDoc(x) &&
    !financeRole(role) &&
    !(
      role === 4 &&
      x.entity === "requests" &&
      ["Счёт", "Чек"].includes(x.category)
    )
  )
    return false;
  if (key === "docs" && x.entity && x.link) {
    const owner = get(s, x.entity, x.link);
    if (!owner || !canSee(s, role, x.entity, owner)) return false;
  }
  if (role === 3)
    return [
      "buildings",
      "rooms",
      "tenants",
      "leases",
      "ledger",
      "docs",
    ].includes(key);
  if (role === 4)
    return key === "requests"
      ? reqStatus.indexOf(x.status) >= 1 && x.status !== "Отклонена"
      : key === "docs" && x.entity === "requests";
  if (key === "staff")
    return role === 1 ? x.id === me || x.supervisor === me : x.id === me;
  if (key === "leases" || key === "tenants") return false;
  if (role === 1) return get(s, "buildings", b)?.manager === me;
  if (key === "tasks") return x.worker === me;
  if (key === "requests") return x.author === me;
  if (key === "repairs") return x.worker === me;
  if (key === "docs")
    return (
      x.author === me ||
      (x.entity === "tasks" && get(s, "tasks", x.link)?.worker === me)
    );
  if (key === "rooms" || key === "buildings")
    return s.tasks.some(
      (q) =>
        q.worker === me &&
        (key === "rooms" ? q.room === x.id : q.building === b),
    );
  return false;
}
export function visible(s, r, t) {
  return (s[baseType(t)] || []).filter(
    (x) =>
      canSee(s, r, t, x) &&
      (t !== "construction" || x.project) &&
      (t !== "supply" ||
        ["Согласована", "В закупке", "Заказано", "Доставлено"].includes(
          x.status,
        )),
  );
}
export function allowed(r, t) {
  if (r === 0) return true;
  const set = {
    1: [
      "home",
      "buildings",
      "rooms",
      "construction",
      "repairs",
      "tasks",
      "requests",
      "staff",
      "docs",
      "map",
      "calendar",
      "reports",
      "notifications",
    ],
    2: [
      "home",
      "buildings",
      "rooms",
      "repairs",
      "tasks",
      "requests",
      "docs",
      "map",
      "calendar",
      "notifications",
    ],
    3: [
      "home",
      "buildings",
      "rooms",
      "tenants",
      "leases",
      "ledger",
      "docs",
      "map",
      "calendar",
      "reports",
      "notifications",
    ],
    4: ["home", "supply", "docs", "calendar", "reports", "notifications"],
  };
  return set[r]?.includes(t);
}
export function canWrite(role, t) {
  if (role === 0) return !["audit", "supply"].includes(t);
  return role === 1
    ? [
        "rooms",
        "tasks",
        "repairs",
        "requests",
        "construction",
        "docs",
        "staff",
      ].includes(t)
    : role === 2
      ? ["requests", "repairs", "docs"].includes(t)
      : role === 3
        ? ["ledger", "leases", "tenants", "docs"].includes(t)
        : t === "docs";
}
export function audit(s, role, type, id, action, before = null, after = null) {
  s.audit.unshift({
    id: uid(),
    type,
    ref: id,
    action,
    name: after?.name || before?.name || "",
    who: principal(s, role)?.name || users[role],
    time: new Date().toISOString(),
    before: before ? structuredClone(before) : null,
    after: after ? structuredClone(after) : null,
  });
}
export function syncRepairExpense(s, repair) {
  const id = "repair-expense-" + repair.id,
    at = s.ledger.findIndex((x) => x.id === id);
  const amount = ["cost", "materialsCost", "extra"].reduce(
    (a, k) => a + Number(repair[k] || 0),
    0,
  );
  if (repair.status !== "Завершён" || !amount) {
    if (at >= 0) s.ledger.splice(at, 1);
    return;
  }
  const entry = {
    id,
    name: "Ремонт · " + repair.name,
    kind: "Расход",
    category: "Ремонт",
    building: repair.building,
    room: repair.room,
    repair: repair.id,
    amount,
    date: repair.due || day(),
  };
  if (at < 0) s.ledger.unshift(entry);
  else s.ledger[at] = { ...s.ledger[at], ...entry };
}
export function syncLeases(s) {
  for (const room of s.rooms) {
    const lease = s.leases.find((x) => x.room === room.id && activeLease(x));
    if (lease) {
      room.status = "Арендуется";
      room.lease = lease.id;
    } else if (room.lease) {
      room.status = "Свободно";
      delete room.lease;
    }
  }
}
export function eventList(s, r) {
  const rows = [];
  const add = (t, x, k, d, label) => {
    if (d)
      rows.push({
        key: t + x.id + k + d,
        type: t,
        id: x.id,
        date: d,
        label,
        title: x.name,
        building: buildingOf(s, t, x),
      });
  };
  for (const x of visible(s, r, "tasks"))
    if (!["Закрыта", "Выполнена", "Отменена"].includes(x.status))
      add("tasks", x, "t", x.due, "Срок задачи");
  for (const x of visible(s, r, "repairs"))
    add("repairs", x, "r", x.due || x.start, "Обслуживание");
  for (const x of visible(s, r, "leases"))
    if (x.status !== "Расторгнут") {
      add("leases", x, "e", x.end, "Окончание аренды");
      add("leases", x, "p", x.next, "Арендный платёж");
    }
  for (const x of visible(s, r, "ledger")) {
    if (unpaid(s, x) > 0) add("ledger", x, "d", x.due, "Ожидаемый платёж");
    if (x.kind === "Расход" && x.next)
      add("ledger", x, "u", x.next, "Плановый платёж · " + x.category);
  }
  for (const x of visible(s, r, "buildings"))
    if (x.project && x.status === "Строится")
      add("construction", x, "c", x.due, "Срок строительства");
  for (const x of visible(s, r, r === 4 ? "supply" : "requests"))
    if (!["Доставлено", "Отклонена"].includes(x.status))
      add(
        r === 4 ? "supply" : "requests",
        x,
        "q",
        x.delivery || x.due,
        "Поставка",
      );
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}
export const SEED_VERSION = "atrium.db.v1";
const zones = ["Север", "Запад", "Юг", "Восток"];
const streets = [
  "Ленинградский проспект",
  "Большая Тульская улица",
  "Береговой проезд",
  "улица Архитектора Власова",
  "Варшавское шоссе",
  "Дмитровское шоссе",
  "Пресненская набережная",
  "Складочная улица",
  "Новодмитровская улица",
  "Ленинский проспект",
  "Шарикоподшипниковская улица",
  "Электрозаводская улица",
  "Звенигородское шоссе",
];
export function seed() {
  const s = Object.fromEntries(entities.map((k) => [k, []]));
  s.read = {};
  s.staff = users.map((name, i) => ({
    id: "u" + i,
    persona: i,
    name,
    role: ROLES[i],
    email:
      ["director", "manager", "engineer", "accounting", "supply"][i] +
      "@atrium.example",
    supervisor: i === 2 ? "u1" : "",
    status: "Работает",
  }));
  s.staff.push(
    {
      id: "u5",
      name: "Алексей Громов",
      role: ROLES[1],
      email: "gromov@atrium.example",
      status: "Работает",
    },
    {
      id: "u6",
      name: "Никита Фомин",
      role: ROLES[2],
      supervisor: "u5",
      email: "fomin@atrium.example",
      status: "Работает",
    },
  );
  const names = [
    "Меридиан",
    "Парк Лайн",
    "Северная башня",
    "Речной квартал",
    "Атлас",
    "Горизонт",
    "Вектор",
    "Каскад",
    "Фабрика",
    "Панорама",
    "Платформа",
    "Маяк",
    "Орбита",
  ];
  const tenants = [
    "Бюро «Форма»",
    "ООО «Линия»",
    "Студия «Модуль»",
    "АО «Полюс»",
    "ООО «Точка роста»",
    "Группа «Контекст»",
    "ООО «Альта»",
    "Бюро «Масштаб»",
  ];
  s.tenants = tenants.map((name, i) => ({
    id: "a" + i,
    name,
    contact: [
      "Александр Котов",
      "Мария Павлова",
      "Николай Зотов",
      "Екатерина Лукина",
    ][i % 4],
    phone: "+7 (495) 555-01-0" + i,
    email: "office" + (i + 1) + "@arenda.example",
    address: "Москва, " + streets[i] + ", " + (i + 6),
    details: "Учебная организация",
    status: "Активен",
  }));
  for (let i = 0; i < 52; i++) {
    const project = i === 3 || i >= 49,
      manager = i % 4 === 2 ? "u5" : "u1";
    const b = {
      id: "b" + i,
      name:
        (i === 3 ? "МФК " : i % 7 === 6 ? "ТК " : "БЦ ") +
        "«" +
        names[i % 13] +
        (i >= 13 ? " • " + zones[Math.floor(i / 13)] : "") +
        "»",
      address: "Москва, " + streets[i % 13] + ", " + (8 + i * 2),
      area: 3400 + ((i * 1681 + 9120) % 23570),
      floors: 4 + (i % 13),
      manager,
      staff: manager === "u1" ? "u2" : "u6",
      condition: i % 14 === 7 ? condition[2] : condition[i % 5 === 0 ? 1 : 0],
      status: project
        ? "Строится"
        : i % 14 === 7
          ? buildStatus[4]
          : i % 7 === 2
            ? buildStatus[2]
            : i % 3 === 0
              ? buildStatus[1]
              : buildStatus[0],
      created: day(-420 + i),
      lat: +(55.75 + Math.sin(i * 2.45) * (0.015 + (i % 7) * 0.014)).toFixed(5),
      lng: +(37.61 + Math.cos(i * 1.73) * (0.024 + (i % 9) * 0.019)).toFixed(5),
      photo: photo([0, 2, 5, 2, 1, 5, 4][i % 7]),
      project,
      stage: project
        ? [
            "Монтаж фасада",
            "Отделочные работы",
            "Фундамент",
            "Инженерные сети",
          ][i === 3 ? 0 : i - 48]
        : "",
      progress: project ? (i === 3 ? 68 : 24 + (i - 49) * 19) : 100,
      budget: project ? 45000000 : 0,
      contractor: project ? "СМУ «Профиль»" : "",
      start: day(-100 - i),
      due: day(70 + i),
    };
    s.buildings.push(b);
    if (project) continue;
    for (let j = 0; j < 4; j++) {
      const rr = {
        id: "r" + i + "-" + j,
        name: j + 1 + "0" + ((i % 8) + 1),
        building: b.id,
        floor: j + 1,
        area: 70 + ((i * 7 + j * 11) % 94),
        purpose: ["Офис", "Офис", "Торговый зал", "Склад"][j],
        status:
          j === 3 && i % 3 === 0
            ? "Свободно"
            : j === 2 && i % 5 === 1
              ? "Используется компанией"
              : j === 3 && i % 8 === 4
                ? "На ремонте"
                : "Арендуется",
        features: "Отдельный вход, доступ по пропускам",
      };
      s.rooms.push(rr);
      if (rr.status === "Арендуется") {
        const l = {
          id: "l" + i + "-" + j,
          name: "ДА-" + String(1000 + i * 4 + j),
          building: b.id,
          room: rr.id,
          tenant: "a" + ((i + j) % 8),
          start: day(-210 - i),
          end: day(j === 0 && i % 12 === 0 ? 12 + (i % 10) : 155 + i + j),
          rate: rr.area * 1150,
          period: "Ежемесячно",
          next: day(8 + (i % 19)),
          status: "Действует",
        };
        s.leases.push(l);
        rr.lease = l.id;
      }
    }
  }
  for (let m = 5; m >= 0; m--) {
    for (let i = 0; i < 18; i++) {
      const l = s.leases[(i * 7) % s.leases.length];
      const d = new Date();
      d.setMonth(
        d.getMonth() - m,
        Math.min(1 + (i % 12), new Date().getDate()),
      );
      const dt = iso(d);
      const amount = (((85000 + i * 5300) * (11 - m)) / 8) | 0;
      const row = {
        id: "c" + m + "-" + i,
        name: "Аренда · " + l.name,
        building: l.building,
        tenant: l.tenant,
        lease: l.id,
        kind: "Начисление",
        category: "Аренда",
        amount,
        date: dt,
        due: dt,
      };
      s.ledger.push(row);
      if (m !== 0 || i > 3)
        s.ledger.push({
          ...row,
          id: "p" + m + "-" + i,
          kind: "Поступление",
          charge: row.id,
          reference: "ПЛ-" + m + "-" + i,
        });
      s.ledger.push({
        id: "e" + m + "-" + i,
        name: [
          "Коммунальные услуги",
          "Обслуживание здания",
          "Подрядные работы",
        ][i % 3],
        kind: "Расход",
        category: ["Коммунальные услуги", "Обслуживание", "Подрядные работы"][
          i % 3
        ],
        building: l.building,
        amount: Math.round(amount * (0.32 + ((i + m) % 4) * 0.055)),
        date: dt,
        due: dt,
        ...(m === 0 && i % 3 === 0 ? { next: day(2 + i) } : {}),
      });
    }
  }
  const taskNames = [
    "Проверить приточную вентиляцию",
    "Заменить светильники в холле",
    "Устранить течь в санузле",
    "Провести ревизию электрощита",
    "Принять отделочные работы",
    "Обслужить тепловой узел",
    "Проверить пожарную автоматику",
    "Осмотреть кровлю",
  ];
  for (let i = 0; i < 16; i++) {
    const b = s.buildings[i],
      room = s.rooms.find((x) => x.building === b.id);
    s.tasks.push({
      id: "t" + i,
      name: taskNames[i % 8],
      description:
        "Провести осмотр, зафиксировать результат и передать отчёт управляющему.",
      building: b.id,
      room: room?.id || "",
      manager: b.manager,
      worker: b.staff,
      category: categories[i % 7],
      priority: i % 4 === 0 ? "Высокий" : "Обычный",
      status: [
        "В работе",
        "Назначена",
        "На проверке",
        "Ожидает материалов",
        "Закрыта",
      ][i % 5],
      due: day(i < 3 ? -3 + i : 2 + i),
      created: day(-8),
      author: "u1",
      report: i % 5 === 2 ? "Оборудование проверено, замечания устранены." : "",
      history: [],
    });
  }
  const rq = [
    "Фильтры для вентиляции",
    "Кабель для щитовой",
    "Светильники для холла",
    "Бетон для перекрытий",
    "Доставка радиаторов",
    "Запорная арматура",
    "Крепёж для фасада",
    "Насос циркуляционный",
  ];
  rq.forEach((name, i) => {
    const b = s.buildings[i];
    const status = reqStatus[[0, 0, 0, 0, 1, 3, 4, 5][i]];
    s.requests.push({
      id: "q" + i,
      name,
      building: b.id,
      category: "Материалы",
      description: "Для плановых работ на объекте",
      quantity: 12 + i * 3,
      unit: "шт.",
      due: day(2 + i),
      author: "u2",
      status,
      version: 1,
      created: day(-3),
      ...(i > 3
        ? {
            approval: {
              version: 1,
              by: users[0],
              time: day(-1) + "T10:00:00",
              decision: "Согласовано",
            },
          }
        : {}),
      history: [],
    });
  });
  s.repairs.push({
    id: "w1",
    name: "Замена клапана отопления",
    building: "b0",
    room: "r0-0",
    task: "t0",
    worker: "u2",
    category: "Отопление",
    reason: "Износ уплотнения",
    damageType: "Протечка",
    description: "Потеря герметичности соединения",
    work: "Установлен новый клапан, выполнена опрессовка",
    start: day(-15),
    due: day(-12),
    status: "Завершён",
    cost: 12000,
    materialsCost: 3600,
    extra: 1000,
    damage: 0,
    lost: 3000,
  });
  syncRepairExpense(s, s.repairs[0]);
  s.ledger.push({
    id: "construction-expense-1",
    name: "Монтаж фасадных панелей",
    kind: "Расход",
    category: "Подрядные работы",
    building: "b3",
    amount: 695000,
    date: day(-6),
  });
  s.docs.push(
    {
      id: "d0",
      name: "Фото фасада — Меридиан.jpg",
      building: "b0",
      entity: "buildings",
      link: "b0",
      category: "Фотоотчёт",
      url: photo(0),
      mime: "image/jpeg",
      author: "u1",
      date: day(-4),
    },
    {
      id: "d1",
      name: "Строительная площадка.jpg",
      building: "b3",
      entity: "buildings",
      link: "b3",
      category: "Проектная документация",
      url: photo(2),
      mime: "image/jpeg",
      author: "u1",
      date: day(-3),
    },
  );
  for (let i = 0; i < 6; i++) {
    const t = [
        "tasks",
        "requests",
        "repairs",
        "buildings",
        "tasks",
        "requests",
      ][i],
      x = s[t][i % s[t].length];
    s.audit.push({
      id: "ev" + i,
      type: t,
      ref: x.id,
      name: x.name,
      who: users[i % 3],
      action: [
        "Обновлена задача",
        "Создана заявка",
        "Завершён ремонт",
        "Обновлён объект",
        "Создана задача",
        "Заявка согласована",
      ][i],
      time: new Date(Date.now() - (i + 1) * 75 * 60000).toISOString(),
      before: null,
      after: { name: x.name, status: x.status },
    });
  }
  return s;
}
export function load() {
  const raw = localStorage.getItem(SEED_VERSION);
  if (!raw) {
    const s = seed();
    localStorage.setItem(SEED_VERSION, JSON.stringify(s));
    return s;
  }
  const s = JSON.parse(raw);
  if (!entities.every((k) => Array.isArray(s[k])))
    throw new Error("Не удалось прочитать базу демонстрации");
  syncLeases(s);
  return s;
}
