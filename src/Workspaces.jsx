import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  ListFilter,
  MapPin,
  Search,
} from "lucide-react";
import {
  useApp,
  PageTop,
  Records,
  Icon,
  Badge,
  Empty,
  Modal,
  csv,
  headers,
  cellData,
  statusOf,
} from "./shared";
import {
  ROLES,
  allowed,
  baseType,
  canSee,
  compact,
  date,
  day,
  eventList,
  financeRole,
  fmt,
  get,
  iso,
  losses,
  name,
  overdue,
  principal,
  rub,
  titles,
  unpaid,
  visible,
} from "./model";
export function MapView({ params }) {
  const { s, r, go } = useApp(),
    bs = visible(s, r, "buildings"),
    [pick, setPick] = useState(params.building || bs[0]?.id),
    [stat, ss] = useState(""),
    [cond, sc] = useState(""),
    [offline, off] = useState(false),
    holder = useRef(),
    map = useRef(),
    layer = useRef(),
    initial = useRef(true);
  const rows = bs.filter(
      (x) => (!stat || x.status === stat) && (!cond || x.condition === cond),
    ),
    sel = rows.find((x) => x.id === pick);
  useEffect(() => {
    const m = L.map(holder.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView([55.75, 37.61], 10);
    map.current = m;
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    ).addTo(m);
    tiles.on("tileerror", () => off(true));
    tiles.on("tileload", () => off(false));
    layer.current = L.layerGroup().addTo(m);
    return () => {
      m.stop();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    layer.current.clearLayers();
    const points = [];
    rows.forEach((x) => {
      if (!Number.isFinite(x.lat) || !Number.isFinite(x.lng)) return;
      points.push([x.lat, x.lng]);
      const c =
        x.id === pick
          ? "#d48142"
          : x.status === "Строится"
            ? "#b98b42"
            : "#246455";
      const m = L.circleMarker([x.lat, x.lng], {
        radius: x.id === pick ? 11 : 7,
        weight: 2,
        color: "white",
        fillColor: c,
        fillOpacity: 1,
      }).addTo(layer.current);
      const label = document.createElement("span");
      label.textContent = x.name;
      m.bindTooltip(label);
      m.on("click", () => setPick(x.id));
    });
    if (initial.current && points.length) {
      if (params.building && sel) map.current.setView([sel.lat, sel.lng], 14);
      else map.current.fitBounds(points, { padding: [30, 30], maxZoom: 14 });
      initial.current = false;
    }
  }, [s, stat, cond, pick, r]);
  return (
    <>
      <PageTop
        title="Карта объектов"
        hint="Расположение и состояние недвижимости"
      />
      <section className="panel">
        <div className="filters">
          <select
            aria-label="Статус объекта"
            value={stat}
            onChange={(e) => ss(e.target.value)}
          >
            <option value="">Все статусы</option>
            {[...new Set(bs.map((x) => x.status))].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Состояние объекта"
            value={cond}
            onChange={(e) => sc(e.target.value)}
          >
            <option value="">Любое состояние</option>
            {[...new Set(bs.map((x) => x.condition))].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <span className="count">{rows.length} объектов</span>
        </div>
        <div className="map-layout">
          <div className="mapbox" ref={holder} />
          <div className="map-list">
            {sel && (
              <div className="map-card">
                <img src={sel.photo || "./media/building-2.jpg"} alt="" />
                <h3>{sel.name}</h3>
                <p>{sel.address}</p>
                <Badge value={sel.status} />
                <p>
                  {sel.condition} · {name(s, "staff", sel.manager)}
                </p>
                <button
                  className="btn primary"
                  onClick={() => go("buildings", sel.id)}
                >
                  Карточка объекта <ArrowUpRight size={15} />
                </button>
              </div>
            )}
            {rows.map((x) => (
              <button
                className={"map-row " + (pick === x.id ? "selected" : "")}
                key={x.id}
                onClick={() => {
                  setPick(x.id);
                  map.current.setView([x.lat, x.lng], 14, { animate: false });
                }}
              >
                <MapPin size={14} />
                {x.name}
              </button>
            ))}
          </div>
        </div>
        {offline && (
          <p className="note">
            Для картографической подложки требуется доступ к OpenStreetMap.
            Метки объектов доступны.
          </p>
        )}
      </section>
    </>
  );
}
export function Calendar() {
  const { s, r, go } = useApp(),
    [mode, setMode] = useState("Месяц"),
    [sel, setSel] = useState(day()),
    [anchor, setAnchor] = useState(day());
  const all = eventList(s, r),
    d = new Date(anchor + "T12:00:00"),
    month = d.getMonth(),
    year = d.getFullYear(),
    start = new Date(d);
  if (mode === "Месяц") start.setDate(1);
  if (mode !== "День")
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const count =
      mode === "День"
        ? 1
        : mode === "Неделя"
          ? 7
          : Math.ceil(
              (((new Date(year, month, 1).getDay() + 6) % 7) +
                new Date(year, month + 1, 0).getDate()) /
                7,
            ) * 7,
    dates = Array.from({ length: count }, (_, i) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      return iso(dt);
    });
  const move = (n) => {
    const c = new Date(d);
    if (mode === "Месяц") c.setMonth(month + n, 1);
    else c.setDate(c.getDate() + n * (mode === "Неделя" ? 7 : 1));
    setAnchor(iso(c));
    setSel(iso(c));
  };
  const items = all.filter((x) => x.date === sel);
  return (
    <>
      <PageTop title="Календарь" hint="Задачи, договоры, платежи и поставки" />
      <section className="panel">
        <div className="panel-title wrap">
          <div className="inline">
            <button
              className="iconbtn"
              aria-label="Назад"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="capitalize">
              {mode === "День"
                ? date(anchor)
                : d.toLocaleDateString("ru-RU", {
                    month: "long",
                    year: "numeric",
                  })}
            </h2>
            <button
              className="iconbtn"
              aria-label="Вперёд"
              onClick={() => move(1)}
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="plain"
              onClick={() => {
                setAnchor(day());
                setSel(day());
              }}
            >
              Сегодня
            </button>
          </div>
          <div className="segmented">
            {["День", "Неделя", "Месяц"].map((v) => (
              <button
                key={v}
                className={v === mode ? "active" : ""}
                onClick={() => {
                  setMode(v);
                  setAnchor(sel);
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {mode !== "День" && (
          <div className="calendar-grid">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((w) => (
              <b key={w}>{w}</b>
            ))}
            {dates.map((d) => {
              const es = all.filter((x) => x.date === d);
              return (
                <button
                  key={d}
                  className={
                    (d === sel ? "chosen " : "") +
                    (d.slice(5, 7) !== anchor.slice(5, 7) ? "muted " : "") +
                    (d === day() ? "today" : "")
                  }
                  onClick={() => setSel(d)}
                >
                  <b>{Number(d.slice(-2))}</b>
                  {es.length > 0 && <small>{es.length} событий</small>}
                </button>
              );
            })}
          </div>
        )}
      </section>
      <section className="panel">
        <div className="panel-title">
          <h2>{date(sel)}</h2>
          <span className="count">{items.length}</span>
        </div>
        {items.length ? (
          items.map((x) => (
            <button
              className="line-link"
              key={x.key}
              onClick={() => go(x.type, x.id)}
            >
              <span>
                {x.title}
                <small>{x.label}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))
        ) : (
          <Empty
            title="Нет событий на этот день"
            text="Выберите другую дату в календаре."
          />
        )}
      </section>
    </>
  );
}
export function alerts(s, r) {
  const events = eventList(s, r)
    .filter((x) => x.date <= day(14) && x.date >= day(-60))
    .map((x) => ({
      ...x,
      text: (x.date < day() ? "Срок прошёл · " : "") + x.label,
    }));
  const nowEvents = s.audit
    .filter((x) => canSee(s, r, x.type, get(s, x.type, x.ref)))
    .slice(0, 80)
    .map((x) => ({
      key: x.id,
      type: r === 4 && x.type === "requests" ? "supply" : x.type,
      id: x.ref,
      date: x.time.slice(0, 10),
      title: x.name,
      text: x.action,
    }));
  return [...nowEvents, ...events];
}
export function Notifications() {
  const { s, r, save, go } = useApp(),
    [only, setOnly] = useState(false),
    [limit, setLimit] = useState(30);
  const all = alerts(s, r),
    seen = new Set(s.read[r] || []),
    rows = all.filter((x) => !only || !seen.has(x.key));
  const read = (ids) =>
    save((ns) => {
      ns.read[r] = [...new Set([...(ns.read[r] || []), ...ids])];
    });
  return (
    <>
      <PageTop
        title="Уведомления"
        hint="События и сроки вашего рабочего пространства"
      >
        <button
          className="btn secondary"
          onClick={() => read(all.map((x) => x.key))}
        >
          <CheckCheck size={16} /> Прочитать все
        </button>
      </PageTop>
      <section className="panel">
        <div className="filters">
          <button
            className={"btn " + (!only ? "primary" : "secondary")}
            onClick={() => setOnly(false)}
          >
            Все
          </button>
          <button
            className={"btn " + (only ? "primary" : "secondary")}
            onClick={() => setOnly(true)}
          >
            Непрочитанные · {all.filter((x) => !seen.has(x.key)).length}
          </button>
        </div>
        {rows.slice(0, limit).map((x) => (
          <button
            className="line-link"
            key={x.key}
            onClick={() => {
              read([x.key]);
              go(x.type, x.id);
            }}
          >
            <span className="inline">
              <span
                className={
                  "notification-dot " + (seen.has(x.key) ? "read" : "")
                }
              />
              <span>
                <b>{x.title}</b>
                <small>{x.text}</small>
              </span>
            </span>
            <small>{date(x.date)}</small>
          </button>
        ))}
        {!rows.length && (
          <Empty
            title="Все уведомления прочитаны"
            text="Новые события появятся здесь."
          />
        )}
        {rows.length > limit && (
          <button className="expand" onClick={() => setLimit(limit + 30)}>
            Показать ещё
          </button>
        )}
      </section>
    </>
  );
}
export function Audit() {
  const { s } = useApp(),
    [q, setQ] = useState(""),
    [item, setItem] = useState(null),
    [limit, setLimit] = useState(25);
  const list = s.audit.filter((x) =>
    [x.who, x.name, x.action].join(" ").toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageTop title="Журнал действий" hint="Хронология изменений и решений" />
      <section className="panel">
        <div className="filters">
          <label className="search">
            <Search size={15} />
            <input
              placeholder="Сотрудник, объект или действие…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>
        {list.slice(0, limit).map((x) => (
          <button className="line-link" key={x.id} onClick={() => setItem(x)}>
            <span>
              <b>
                {x.action} · {x.name}
              </b>
              <small>
                {x.who} · {titles[x.type]}
              </small>
            </span>
            <small>{new Date(x.time).toLocaleString("ru-RU")}</small>
          </button>
        ))}
        {list.length > limit && (
          <button className="expand" onClick={() => setLimit(limit + 25)}>
            Показать ещё
          </button>
        )}
        {!list.length && <Empty />}
      </section>
      {item && (
        <Modal
          title={item.action}
          description={item.name + " · " + item.who}
          wide
          onClose={() => setItem(null)}
        >
          <div className="modal-scroll">
            <div className="audit-diff">
              {["before", "after"].map((k, i) => (
                <section key={k}>
                  <h3>{i ? "После изменения" : "До изменения"}</h3>
                  <pre>
                    {item[k] ? JSON.stringify(item[k], null, 2) : "Нет записи"}
                  </pre>
                </section>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
const reportTypes = [
  ["buildings", "Отчёт по зданиям"],
  ["rooms", "Использование помещений"],
  ["tenants", "Арендаторы"],
  ["ledger", "Доходы и расходы"],
  ["debt", "Задолженность арендаторов"],
  ["profit", "Рентабельность объектов"],
  ["repairs", "Ремонты и убытки"],
  ["condition", "Техническое состояние"],
  ["construction", "Ход строительства"],
  ["complete", "Выполненные задачи"],
  ["tasks", "Сроки выполнения работ"],
  ["supply", "Закупки и поставки"],
];
export function Reports() {
  const { s, r } = useApp();
  const types = reportTypes.filter(([k]) =>
    allowed(
      r,
      {
        debt: "ledger",
        profit: "ledger",
        condition: "buildings",
        complete: "tasks",
      }[k] || k,
    ),
  );
  const [report, setReport] = useState(types[0][0]),
    [building, B] = useState(""),
    [from, F] = useState(""),
    [to, T] = useState(""),
    [worker, W] = useState(""),
    [stat, S] = useState(""),
    [limit, Lm] = useState(25);
  const t =
    {
      debt: "ledger",
      profit: "buildings",
      condition: "buildings",
      complete: "tasks",
    }[report] || report;
  let rows = visible(s, r, t);
  if (report === "debt")
    rows = rows.filter((x) => x.due <= day() && unpaid(s, x) > 0);
  if (report === "complete")
    rows = rows.filter((x) => ["Закрыта", "Выполнена"].includes(x.status));
  const options = [...new Set(rows.map((x) => statusOf(s, t, x)))].filter(
    Boolean,
  );
  rows = rows.filter((x) => {
    const dt = x.date || x.due || x.created || x.start;
    return (
      (!building ||
        (baseType(t) === "buildings" ? x.id : x.building) === building ||
        (t === "tenants" &&
          s.leases.some(
            (l) => l.tenant === x.id && l.building === building,
          ))) &&
      (!stat || statusOf(s, t, x) === stat) &&
      (report === "profit" || ((!from || dt >= from) && (!to || dt <= to))) &&
      (!worker ||
        [
          x.worker,
          x.manager,
          x.author,
          get(s, "buildings", x.building)?.manager,
        ].includes(worker))
    );
  });
  let heads = headers(t),
    body = rows.map((x) => cellData(s, r, t, x));
  if (report === "profit") {
    heads = ["Объект", "Поступления, ₽", "Расходы, ₽", "Прибыль, ₽", "Маржа"];
    body = rows.map((x) => {
      const ops = s.ledger.filter(
        (y) =>
          y.building === x.id &&
          (!from || y.date >= from) &&
          (!to || y.date <= to),
      );
      const sum = (k) =>
          ops.filter((y) => y.kind === k).reduce((a, y) => a + y.amount, 0),
        i = sum("Поступление"),
        e = sum("Расход");
      return [
        x.name,
        fmt(i),
        fmt(e),
        fmt(i - e),
        i ? Math.round(((i - e) / i) * 100) + "%" : "—",
      ];
    });
  }
  if (report === "debt") {
    heads = [...heads, "Остаток, ₽"];
    body = body.map((row, i) => [...row, fmt(unpaid(s, rows[i]))]);
  }
  if (report === "condition") {
    heads = [...heads, "Состояние"];
    body = body.map((row, i) => [...row, rows[i].condition]);
  }
  if (report === "construction") {
    heads = [...heads, "Этап", "Готовность"];
    body = body.map((row, i) => [
      ...row,
      rows[i].stage,
      rows[i].progress + "%",
    ]);
  }
  if (report === "repairs" && financeRole(r)) {
    heads = [...heads, "Убытки, ₽"];
    body = body.map((row, i) => [...row, fmt(losses(rows[i]))]);
  }
  const label = types.find((x) => x[0] === report)?.[1];
  return (
    <>
      <PageTop
        title="Аналитика и отчёты"
        hint="Отчёты формируются из текущих записей портфеля"
      >
        <button className="btn primary" onClick={() => csv(label, heads, body)}>
          <Download size={16} /> Скачать CSV
        </button>
      </PageTop>
      <section className="panel">
        <div className="report-filters">
          <label>
            Вид отчёта
            <select
              value={report}
              onChange={(e) => {
                setReport(e.target.value);
                S("");
                Lm(25);
              }}
            >
              {types.map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Объект
            <select value={building} onChange={(e) => B(e.target.value)}>
              <option value="">Все объекты</option>
              {s.buildings
                .filter(
                  (x) =>
                    canSee(s, r, "buildings", x) ||
                    (r === 4 &&
                      visible(s, r, "supply").some((q) => q.building === x.id)),
                )
                .map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            С даты
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => F(e.target.value)}
            />
          </label>
          <label>
            По дату
            <input
              type="date"
              min={from || undefined}
              value={to}
              onChange={(e) => T(e.target.value)}
            />
          </label>
          <label>
            Сотрудник
            <select value={worker} onChange={(e) => W(e.target.value)}>
              <option value="">Все сотрудники</option>
              {s.staff
                .filter(
                  (x) =>
                    r === 0 ||
                    visible(s, r, t).some((y) =>
                      [
                        y.author,
                        y.worker,
                        y.manager,
                        get(s, "buildings", y.building)?.manager,
                      ].includes(x.id),
                    ),
                )
                .map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Статус
            <select value={stat} onChange={(e) => S(e.target.value)}>
              <option value="">Все статусы</option>
              {options.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">
          <h2>{label}</h2>
          <span className="count">{body.length}</span>
        </div>
        {body.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {heads.map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.slice(0, limit).map((row, i) => (
                  <tr key={i}>
                    {row.map((v, j) => (
                      <td key={j}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
        {body.length > limit && (
          <button className="expand" onClick={() => Lm(limit + 50)}>
            Показать ещё
          </button>
        )}
      </section>
    </>
  );
}
