import React, { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUpFromLine,
  Building2,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  Download,
  FileClock,
  FileText,
  Layers3,
  ListFilter,
  MapPin,
  Plus,
  SquareStack,
  TriangleAlert,
  Wallet,
  Warehouse,
  Wrench,
} from "lucide-react";
import {
  ROLES,
  allowed,
  day,
  fmt,
  compact,
  rub,
  date,
  financeRole,
  visible,
  activeLease,
  expiring,
  overdue,
  unpaid,
  principal,
  baseType,
  canSee,
  canWrite,
  iso,
} from "./model";
import { useApp, Icon, PageTop, Records, Empty, csv } from "./shared";
export function dashboardStats(s, r) {
  const b = visible(s, r, "buildings"),
    rooms = visible(s, r, "rooms"),
    ls = visible(s, r, "leases"),
    ledger = visible(s, r, "ledger"),
    tasks = visible(s, r, "tasks"),
    req = visible(s, r, r === 4 ? "supply" : "requests"),
    row = (label, value, t, filter = "") => ({ label, value, t, filter });
  return [
    row("Все объекты", b.length, "buildings"),
    row(
      "Действующие здания",
      b.filter((x) => x.status !== "Строится").length,
      "buildings",
      "Действующие",
    ),
    row(
      "Строящиеся объекты",
      b.filter((x) => x.status === "Строится").length,
      "construction",
      "Строится",
    ),
    row(
      "Требуют ремонта",
      b.filter(
        (x) =>
          x.condition === "Требует ремонта" || x.status === "Требует ремонта",
      ).length,
      "buildings",
      "Требуют ремонта",
    ),
    row(
      "Свободные помещения",
      rooms.filter((x) => x.status === "Свободно").length,
      "rooms",
      "Свободно",
    ),
    row(
      "Помещения в аренде",
      rooms.filter((x) => x.status === "Арендуется").length,
      "rooms",
      "Арендуется",
    ),
    row(
      "Используются компанией",
      rooms.filter((x) => x.status === "Используется компанией").length,
      "rooms",
      "Используется компанией",
    ),
    row(
      "Общая площадь",
      fmt(b.reduce((a, x) => a + x.area, 0)) + " м²",
      "buildings",
    ),
    ...(financeRole(r)
      ? [
          row(
            "Действующие договоры",
            ls.filter(activeLease).length,
            "leases",
            "Действует",
          ),
          row(
            "Истекающие договоры",
            ls.filter(expiring).length,
            "leases",
            "Истекают",
          ),
          row(
            "Дебиторская задолженность",
            rub(
              ledger
                .filter((x) => x.due <= day())
                .reduce((a, x) => a + unpaid(s, x), 0),
            ),
            "ledger",
            "Задолженность",
          ),
        ]
      : []),
    row(
      "Просроченные задачи",
      tasks.filter(overdue).length,
      "tasks",
      "Просрочено",
    ),
    row(
      "Незавершённые заявки",
      req.filter((x) => !["Доставлено", "Отклонена"].includes(x.status)).length,
      r === 4 ? "supply" : "requests",
      "Открытые",
    ),
    ...(r === 0 || r === 1 || r === 2
      ? [
          row(
            "Ожидают согласования",
            req.filter((x) => x.status === "На согласовании").length,
            "requests",
            "На согласовании",
          ),
        ]
      : []),
  ];
}
function Metric({ title, value, sub, icon: I, tone, onClick }) {
  return (
    <button className="metric" onClick={onClick}>
      <div className="metric-head">
        <span className={"metric-icon " + tone}>
          <I size={18} />
        </span>
        <ArrowUpRight size={15} />
      </div>
      <span className="metric-label">{title}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </button>
  );
}
export function FlowChart() {
  const { s, go } = useApp();
  const [months, setMonths] = useState(6),
    [hover, setHover] = useState(null);
  const now = new Date();
  const series = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1),
      pref = iso(d).slice(0, 7),
      rows = s.ledger.filter((x) => x.date?.startsWith(pref)),
      sum = (k) =>
        rows.filter((x) => x.kind === k).reduce((a, x) => a + x.amount, 0);
    return {
      p: pref,
      label: d.toLocaleString("ru-RU", { month: "short" }).replace(".", ""),
      income: sum("Поступление"),
      expense: sum("Расход"),
    };
  });
  const max = Math.max(1, ...series.map((x) => Math.max(x.income, x.expense))),
    step =
      max > 1500000
        ? 1000000
        : max > 300000
          ? 250000
          : max > 60000
            ? 50000
            : Math.max(1, 10 ** Math.floor(Math.log10(max))),
    upper = Math.ceil(max / step) * step;
  const money = (n) =>
    n >= 1e6
      ? (n / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " млн"
      : n >= 1000
        ? Math.round(n / 1000) + " тыс."
        : fmt(Math.round(n));
  return (
    <section className="panel flow">
      <div className="panel-title">
        <div>
          <h2>Денежный поток</h2>
          <small>Поступления и расходы, ₽</small>
        </div>
        <select
          aria-label="Период графика"
          value={months}
          onChange={(e) => {
            setMonths(+e.target.value);
            setHover(null);
          }}
        >
          <option value={6}>6 месяцев</option>
          <option value={3}>3 месяца</option>
          <option value={12}>12 месяцев</option>
        </select>
      </div>
      <div className="chart">
        <div className="y-axis">
          {[1, 0.75, 0.5, 0.25, 0].map((f) => (
            <span key={f}>{money(upper * f)}</span>
          ))}
        </div>
        <div className="plot">
          <div className="grid-lines">
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} />
            ))}
          </div>
          <div className="bars">
            {series.map((x, i) => (
              <button
                key={x.p}
                aria-label={
                  x.label +
                  " — поступления " +
                  rub(x.income) +
                  ", расходы " +
                  rub(x.expense)
                }
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => go("ledger", "", { month: x.p })}
              >
                <i style={{ height: (x.income / upper) * 100 + "%" }} />
                <i style={{ height: (x.expense / upper) * 100 + "%" }} />
                <small>{x.label}</small>
              </button>
            ))}
          </div>
          {hover !== null && (
            <div className="chart-tip">
              {series[hover].label} · {compact(series[hover].income)} /{" "}
              {compact(series[hover].expense)}
            </div>
          )}
        </div>
      </div>
      <div className="legend">
        <span>
          <i />
          Поступления
        </span>
        <span>
          <i />
          Расходы
        </span>
      </div>
    </section>
  );
}
function Attention() {
  const { s, r, go } = useApp();
  const groups = [
    {
      t: "requests",
      label: "Заявки на согласовании",
      sub: "Ожидают решения директора",
      filter: "На согласовании",
      icon: ClipboardCheck,
      tone: "sand",
      n: visible(s, r, "requests").filter((x) => x.status === "На согласовании")
        .length,
      ok: r < 3,
    },
    {
      t: "tasks",
      label: "Просроченные задачи",
      sub: "Истёк срок выполнения",
      filter: "Просрочено",
      icon: Clock3,
      tone: "rose",
      n: visible(s, r, "tasks").filter(overdue).length,
      ok: r < 3,
    },
    {
      t: "leases",
      label: "Истекающие договоры",
      sub: "В течение 30 дней",
      filter: "Истекают",
      icon: FileClock,
      tone: "blueish",
      n: visible(s, r, "leases").filter(expiring).length,
      ok: financeRole(r),
    },
    {
      t: "ledger",
      label: "Задолженность арендаторов",
      sub: "Начисления к оплате",
      filter: "Задолженность",
      icon: Wallet,
      tone: "sand",
      n: visible(s, r, "ledger").filter(
        (x) => x.due <= day() && unpaid(s, x) > 0,
      ).length,
      ok: r === 3,
    },
    {
      t: "supply",
      label: "Согласованные заявки",
      sub: "Можно принять в закупку",
      filter: "Согласована",
      icon: ClipboardCheck,
      tone: "mint",
      n: visible(s, r, "supply").filter((x) => x.status === "Согласована")
        .length,
      ok: r === 4,
    },
  ];
  return (
    <section className="panel attention">
      <div className="panel-title">
        <div>
          <h2>Требует внимания</h2>
          <small>Оперативный контроль</small>
        </div>
        <span className="live-dot" />
      </div>
      <div className="attention-body">
        {groups
          .filter((x) => x.ok)
          .map((x) => (
            <button key={x.t} onClick={() => go(x.t, "", { filter: x.filter })}>
              <span className={"attention-icon " + x.tone}>
                <x.icon size={19} />
              </span>
              <span className="grow">
                <b>{x.label}</b>
                <small>{x.sub}</small>
              </span>
              <strong>{x.n}</strong>
              <ChevronRight size={15} />
            </button>
          ))}
      </div>
    </section>
  );
}
export default function Dashboard() {
  const { s, r, go, modal } = useApp();
  const [more, setMore] = useState(false);
  const b = visible(s, r, "buildings"),
    rm = visible(s, r, "rooms"),
    rented = rm.filter((x) => x.status === "Арендуется").length,
    occ = rm.length ? Math.round((rented / rm.length) * 100) : 0,
    month = day().slice(0, 7),
    income = visible(s, r, "ledger")
      .filter((x) => x.kind === "Поступление" && x.date.startsWith(month))
      .reduce((a, x) => a + x.amount, 0),
    open = visible(s, r, "tasks").filter(
      (x) => !["Выполнена", "Закрыта", "Отменена"].includes(x.status),
    ),
    stats = dashboardStats(s, r).filter((x) => allowed(r, x.t));
  const recent = s.audit
    .filter((x) =>
      canSee(
        s,
        r,
        x.type,
        s[baseType(x.type)]?.find((y) => y.id === x.ref),
      ),
    )
    .slice(0, 4);
  const ops = r === 4;
  return (
    <>
      <PageTop
        title={r === 0 ? "Обзор портфеля" : ROLES[r]}
        hint={new Date().toLocaleDateString("ru-RU", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      >
        <button
          className="btn secondary"
          onClick={() =>
            csv(
              "Обзор портфеля",
              ["Показатель", "Значение"],
              stats.map((x) => [x.label, x.value]),
            )
          }
        >
          <Download size={16} /> Отчёт
        </button>
        {!ops && (
          <button
            className="btn primary"
            onClick={() => modal({ kind: "create" })}
          >
            <Plus size={17} /> Создать
          </button>
        )}
      </PageTop>
      <section className="portfolio-hero">
        <div className="hero-photo" />
        <div className="hero-veil" />
        <div className="hero-body">
          <span className="hero-location">
            <MapPin size={13} /> Москва и область
          </span>
          <h2>{ops ? "Закупки и поставки" : "Коммерческая недвижимость"}</h2>
          <button onClick={() => go(ops ? "supply" : "map")}>
            {ops ? "Открыть снабжение" : "Открыть карту объектов"}{" "}
            <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
      <div className="metrics">
        {!ops && (
          <>
            <Metric
              title="Объекты в портфеле"
              value={fmt(b.length)}
              sub={fmt(b.reduce((a, x) => a + x.area, 0)) + " м² общей площади"}
              icon={Building2}
              tone="mint"
              onClick={() => go("buildings")}
            />
            <Metric
              title="Заполняемость"
              value={occ + "%"}
              sub={rented + " из " + rm.length + " помещений в аренде"}
              icon={DoorOpen}
              tone="blueish"
              onClick={() => go("rooms", "", { filter: "Арендуется" })}
            />
          </>
        )}
        {financeRole(r) && (
          <Metric
            title="Поступления за месяц"
            value={compact(income)}
            sub={new Date().toLocaleDateString("ru-RU", {
              month: "long",
              year: "numeric",
            })}
            icon={Wallet}
            tone="sand"
            onClick={() => go("ledger", "", { month, filter: "Поступление" })}
          />
        )}
        {r < 3 && (
          <Metric
            title="Открытые задачи"
            value={open.length}
            sub={open.filter(overdue).length + " с истёкшим сроком"}
            icon={Wrench}
            tone="lilac"
            onClick={() => go("tasks", "", { filter: "Открытые" })}
          />
        )}
        {r === 3 && (
          <Metric
            title="Активные договоры"
            value={visible(s, r, "leases").filter(activeLease).length}
            sub="Действуют на сегодня"
            icon={FileText}
            tone="lilac"
            onClick={() => go("leases", "", { filter: "Действует" })}
          />
        )}
        {r === 1 || r === 2 ? (
          <Metric
            title="Заявки на согласовании"
            value={
              visible(s, r, "requests").filter(
                (x) => x.status === "На согласовании",
              ).length
            }
            sub="Ожидают решения"
            icon={ClipboardCheck}
            tone="sand"
            onClick={() => go("requests", "", { filter: "На согласовании" })}
          />
        ) : null}
        {ops &&
          ["Согласована", "В закупке", "Заказано", "Доставлено"].map((v, i) => (
            <Metric
              key={v}
              title={
                [
                  "Ожидают закупки",
                  "В закупке",
                  "Ожидают доставки",
                  "Доставлено",
                ][i]
              }
              value={
                visible(s, r, "supply").filter((x) => x.status === v).length
              }
              sub="Заявки отдела снабжения"
              icon={ClipboardCheck}
              tone={["mint", "blueish", "sand", "lilac"][i]}
              onClick={() => go("supply", "", { filter: v })}
            />
          ))}
      </div>
      <div className="dash-split">
        {financeRole(r) ? (
          <FlowChart />
        ) : (
          <section className="panel">
            <div className="panel-title">
              <h2>Ближайшие сроки</h2>
              <button className="plain" onClick={() => go("calendar")}>
                Календарь <ArrowRight size={14} />
              </button>
            </div>
            {(ops ? visible(s, r, "supply") : open)
              .filter((x) => x.due)
              .sort((a, b) => a.due.localeCompare(b.due))
              .slice(0, 4)
              .map((x) => (
                <button
                  className="line-link"
                  key={x.id}
                  onClick={() => go(ops ? "supply" : "tasks", x.id)}
                >
                  {x.name}
                  <small>{date(x.due)}</small>
                </button>
              ))}
          </section>
        )}
        <Attention />
      </div>
      {b.length > 0 && (
        <section className="panel portfolio-table">
          <div className="panel-title">
            <div className="inline">
              <h2>Объекты портфеля</h2>
              <span className="count">{b.length}</span>
            </div>
            <button className="plain" onClick={() => go("buildings")}>
              Все объекты <ArrowRight size={15} />
            </button>
          </div>
          <Records compact type="buildings" rows={b.slice(0, 4)} />
        </section>
      )}
      <section className="panel">
        <div className="panel-title">
          <h2>Последние события</h2>
          <button
            className="plain"
            onClick={() => go(r === 0 ? "audit" : "notifications")}
          >
            Все события <ArrowRight size={14} />
          </button>
        </div>
        {recent.length ? (
          recent.map((x) => (
            <button
              className="line-link"
              key={x.id}
              onClick={() =>
                go(r === 4 && x.type === "requests" ? "supply" : x.type, x.ref)
              }
            >
              <span>
                {x.action} · {x.name}
              </span>
              <small>{date(x.time)}</small>
            </button>
          ))
        ) : (
          <Empty />
        )}
      </section>
      <section className="panel">
        <button className="expand" onClick={() => setMore(!more)}>
          Все показатели портфеля <ChevronDown size={16} />
        </button>
        {more && (
          <div className="summary-grid">
            {stats
              .filter((x) => r !== 4 || x.t === "supply")
              .map((x) => (
                <button
                  key={x.label}
                  onClick={() => go(x.t, "", { filter: x.filter })}
                >
                  <small>{x.label}</small>
                  <b>{x.value}</b>
                </button>
              ))}
          </div>
        )}
      </section>
    </>
  );
}
