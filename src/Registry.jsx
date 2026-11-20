import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FilePlus2,
  Filter,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  useApp,
  PageTop,
  Icon,
  Records,
  Badge,
  Empty,
  Modal,
  fileOp,
  download,
  headers,
  cellData,
  csv,
  statusOf,
} from "./shared";
import { fields, docTargets } from "./forms";
import { transitions } from "./Actions";
import {
  allowed,
  audit,
  baseType,
  canWrite,
  canSee,
  compact,
  date,
  day,
  expiring,
  financeRole,
  fmt,
  get,
  losses,
  name,
  overdue,
  principal,
  rub,
  singular,
  titles,
  unpaid,
  visible,
} from "./model";
export function matches(s, t, x, filter) {
  if (!filter) return true;
  if (filter === "Открытые")
    return ![
      "Выполнена",
      "Закрыта",
      "Отменена",
      "Доставлено",
      "Отклонена",
    ].includes(x.status);
  if (filter === "Просрочено")
    return t === "tasks" ? overdue(x) : statusOf(s, t, x) === filter;
  if (filter === "Задолженность") return x.due <= day() && unpaid(s, x) > 0;
  if (filter === "Истекают") return expiring(x);
  if (filter === "Требуют ремонта")
    return x.condition === "Требует ремонта" || x.status === "Требует ремонта";
  if (filter === "Действующие") return x.status !== "Строится";
  return statusOf(s, t, x) === filter || x.kind === filter;
}
export function Registry({ t, params = {} }) {
  const { s, r, go, modal } = useApp(),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState(params.filter || ""),
    [obj, setObj] = useState(params.building || ""),
    [person, setPerson] = useState(""),
    [cond, setCond] = useState(""),
    [sort, setSort] = useState("default"),
    [page, setPage] = useState(1);
  const rows = visible(s, r, t),
    opts = [
      ...new Set([
        ...rows.map((x) => statusOf(s, t, x)),
        ...(params.filter ? [params.filter] : []),
        ...(t === "ledger"
          ? ["Задолженность", "Начисление"]
          : t === "tasks"
            ? ["Просрочено", "Открытые"]
            : t === "leases"
              ? ["Истекают"]
              : []),
      ]),
    ].filter(Boolean);
  const filtered = rows.filter(
    (x) =>
      matches(s, t, x, filter) &&
      (!obj || x.building === obj) &&
      (!person || x.manager === person || x.worker === person) &&
      (!cond || x.condition === cond) &&
      (!params.month || x.date?.startsWith(params.month)) &&
      cellData(s, r, t, x).join(" ").toLowerCase().includes(q.toLowerCase()),
  );
  if (sort !== "default")
    filtered.sort((a, b) =>
      sort === "asc"
        ? a.name.localeCompare(b.name, "ru")
        : b.name.localeCompare(a.name, "ru"),
    );
  useEffect(() => setPage(1), [q, filter, obj, person, cond, sort]);
  const last = Math.max(1, Math.ceil(filtered.length / 12)),
    p = Math.min(page, last),
    bf = baseType(t) === "buildings",
    isBuild = ["buildings", "construction"].includes(t);
  const exportList = () =>
    csv(
      titles[t],
      headers(t),
      filtered.map((x) => cellData(s, r, t, x)),
    );
  return (
    <>
      <PageTop
        title={titles[t]}
        hint={
          t === "supply"
            ? "Согласованные заявки и ход поставок"
            : t === "construction"
              ? "Проекты, этапы работ и ввод в эксплуатацию"
              : t === "ledger"
                ? "Начисления, поступления и расходы по объектам"
                : undefined
        }
      >
        <button className="btn secondary" onClick={exportList}>
          <Download size={16} /> Экспорт
        </button>
        {canWrite(r, t) && (
          <button
            className="btn primary"
            onClick={() =>
              modal({ kind: "edit", t, ctx: obj ? { building: obj } : {} })
            }
          >
            <Plus size={16} /> Добавить
          </button>
        )}
      </PageTop>
      {t === "ledger" && (
        <div className="summary-grid financial">
          {["Поступление", "Расход", "Задолженность"].map((v, i) => (
            <button key={v} onClick={() => setFilter(v)}>
              <small>{["Поступления", "Расходы", "Задолженность"][i]}</small>
              <b>
                {compact(
                  rows
                    .filter(
                      (x) =>
                        (!obj || x.building === obj) &&
                        (!params.month || x.date?.startsWith(params.month)),
                    )
                    .reduce(
                      (a, x) =>
                        a +
                        (v === "Задолженность"
                          ? x.due <= day()
                            ? unpaid(s, x)
                            : 0
                          : x.kind === v
                            ? x.amount
                            : 0),
                      0,
                    ),
                )}
              </b>
            </button>
          ))}
        </div>
      )}
      <section className="panel">
        <div className="panel-title">
          <div className="inline">
            <h2>
              {t === "ledger"
                ? "Операции"
                : t === "requests"
                  ? "Реестр заявок"
                  : t === "docs"
                    ? "Файлы"
                    : "Реестр"}
            </h2>
            <span className="count">{filtered.length}</span>
          </div>
          {params.month && (
            <button className="plain" onClick={() => go(t)}>
              {params.month} ×
            </button>
          )}
        </div>
        <div className="filters">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Поиск по реестру"
              placeholder="Найти в реестре…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <select
            aria-label="Фильтр по статусу"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Все статусы</option>
            {opts.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          {!bf && !["tenants", "staff"].includes(t) && (
            <select
              aria-label="Фильтр по объекту"
              value={obj}
              onChange={(e) => setObj(e.target.value)}
            >
              <option value="">Все объекты</option>
              {(r === 4
                ? s.buildings.filter((b) =>
                    rows.some((x) => x.building === b.id),
                  )
                : visible(s, r, "buildings")
              ).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )}
          {(isBuild || t === "tasks") && (
            <select
              aria-label="Фильтр по сотруднику"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            >
              <option value="">Все ответственные</option>
              {s.staff
                .filter((w) =>
                  rows.some((x) => x.manager === w.id || x.worker === w.id),
                )
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          )}
          {isBuild && (
            <select
              aria-label="Техническое состояние"
              value={cond}
              onChange={(e) => setCond(e.target.value)}
            >
              <option value="">Любое состояние</option>
              {[...new Set(rows.map((x) => x.condition))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
          <button
            className="filter-sort"
            aria-label="Сортировка по названию"
            title="Сортировка по названию"
            onClick={() => setSort(sort === "asc" ? "desc" : "asc")}
          >
            <ArrowUpDown size={15} />
            {sort === "asc" ? "А–Я" : sort === "desc" ? "Я–А" : "Сортировка"}
          </button>
        </div>
        <Records type={t} rows={filtered.slice((p - 1) * 12, p * 12)} />
        <div className="pagination">
          <span>
            {filtered.length ? (p - 1) * 12 + 1 : 0}–
            {Math.min(p * 12, filtered.length)} из {filtered.length}
          </span>
          <button
            className="iconbtn"
            aria-label="Предыдущая страница"
            disabled={p === 1}
            onClick={() => setPage(p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <b>
            {p} / {last}
          </b>
          <button
            className="iconbtn"
            aria-label="Следующая страница"
            disabled={p === last}
            onClick={() => setPage(p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </>
  );
}
export function History({ list }) {
  return list.length ? (
    <div className="timeline">
      {list.map((h, i) => (
        <div key={h.id || i}>
          <i />
          <section>
            <b>{h.action}</b>
            <small>
              {h.by || h.who} · {new Date(h.time).toLocaleString("ru-RU")}
            </small>
            {(h.note || h.report || h.comment) && (
              <p>{h.note || h.report || h.comment}</p>
            )}
            {h.materials && <p>Материалы · {h.materials}</p>}
            {h.version && <small>Версия {h.version}</small>}
          </section>
        </div>
      ))}
    </div>
  ) : (
    <Empty
      title="История пока пуста"
      text="Изменения появятся здесь после сохранения."
    />
  );
}
function DetailPhoto({ x }) {
  const { s } = useApp(),
    [img, setImg] = useState(null);
  useEffect(() => {
    let alive = true,
      url;
    const doc = get(s, "docs", x.coverDoc);
    setImg(null);
    if (doc?.blob)
      fileOp("get", doc.blob)
        .then((b) => {
          if (b && alive) {
            url = URL.createObjectURL(b);
            setImg(url);
          }
        })
        .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [x.coverDoc, s.docs]);
  return img || x.photo ? (
    <img className="detail-photo" src={img || x.photo} alt={x.name} />
  ) : null;
}
function related(s, r, t, x, sub) {
  const key = baseType(t),
    arr = visible(s, r, sub);
  if (sub === "docs")
    return arr.filter(
      (y) =>
        (y.entity === key && y.link === x.id) ||
        (key === "buildings" && y.building === x.id),
    );
  if (sub === "tenants") {
    const ids = new Set(
      s.leases
        .filter((l) =>
          key === "buildings" ? l.building === x.id : l.room === x.id,
        )
        .map((l) => l.tenant),
    );
    return arr.filter((y) => ids.has(y.id));
  }
  if (key === "tenants" && sub === "rooms") {
    const ids = s.leases.filter((l) => l.tenant === x.id).map((l) => l.room);
    return arr.filter((y) => ids.includes(y.id));
  }
  if (key === "tasks" && sub === "repairs")
    return arr.filter((y) => y.task === x.id);
  if (key === "repairs" && sub === "tasks")
    return arr.filter((y) => y.id === x.task);
  if (key === "staff" && sub === "tasks")
    return arr.filter((y) => y.worker === x.id || y.manager === x.id);
  return arr.filter((y) =>
    key === "buildings"
      ? y.building === x.id
      : key === "rooms"
        ? y.room === x.id
        : key === "tenants"
          ? y.tenant === x.id
          : key === "leases"
            ? y.lease === x.id
            : false,
  );
}
const relatedTabs = {
  buildings: [
    "rooms",
    "tenants",
    "leases",
    "repairs",
    "tasks",
    "requests",
    "docs",
    "ledger",
  ],
  rooms: ["leases", "tenants", "repairs", "tasks", "docs"],
  tenants: ["rooms", "leases", "ledger", "docs"],
  leases: ["ledger", "docs"],
  tasks: ["repairs", "docs"],
  repairs: ["tasks", "docs"],
  requests: ["docs"],
  staff: ["tasks"],
  ledger: ["docs"],
  docs: [],
};
export function Details({ t, id }) {
  const { s, r, go, modal, save, toast } = useApp(),
    x = get(s, t, id),
    [tab, setTab] = useState("overview"),
    [confirm, setConfirm] = useState(false),
    [preview, setPreview] = useState("");
  const k = baseType(t);
  useEffect(() => {
    setTab("overview");
    setPreview("");
  }, [t, id]);
  if (!x || !canSee(s, r, t, x))
    return (
      <Empty
        title="Карточка недоступна"
        text="Проверьте роль или выберите запись из реестра."
      />
    );
  const canEdit =
    (canWrite(r, t) || (r === 1 && t === "buildings")) &&
    !(t === "construction" && x.status !== "Строится" && r !== 0) &&
    !(t === "requests" && r !== 0 && x.author !== principal(s, r)?.id) &&
    !(t === "ledger" && (x.repair || (x.kind === "Поступление" && x.charge)));
  const actions = transitions(r, t, x, s),
    linked = (relatedTabs[k] || []).filter((v) => allowed(r, v)),
    ctx = {
      building: k === "buildings" ? id : x.building,
      room: k === "rooms" ? id : x.room,
      tenant: k === "tenants" ? id : x.tenant,
      lease: k === "leases" ? id : undefined,
      task: k === "tasks" ? id : undefined,
    };
  const openDoc = async (dl) => {
    try {
      const b = x.blob
        ? await fileOp("get", x.blob)
        : await fetch(x.url).then((res) => {
            if (!res.ok) throw Error();
            return res.blob();
          });
      if (!b) throw Error();
      if (dl) download(x.filename || x.name, b);
      else {
        if (!x.mime?.startsWith("image/") && x.mime !== "application/pdf") {
          download(x.filename || x.name, b);
          return;
        }
        setPreview(URL.createObjectURL(b));
      }
    } catch {
      toast("Файл недоступен в этом браузере");
    }
  };
  const records = linked.includes(tab) ? related(s, r, t, x, tab) : [];
  const history = s.audit
    .filter(
      (a) =>
        (a.type === k && a.ref === id) ||
        (k === "buildings" && a.after?.building === id) ||
        (k === "rooms" && a.after?.room === id),
    )
    .filter((a) => r === 0 || canSee(s, r, a.type, get(s, a.type, a.ref)));
  const rowFields = fields(t, x, r)
    .filter(
      (f) =>
        !["file", "status", "name"].includes(f.k) &&
        x[f.k] !== undefined &&
        x[f.k] !== "" &&
        !(r === 4 && f.k === "author"),
    )
    .map((f) => ({
      k: f.k,
      label: f.l,
      v:
        f.kind === "ref"
          ? name(s, f.table, x[f.k])
          : f.kind === "date"
            ? date(x[f.k])
            : f.kind === "number"
              ? fmt(x[f.k])
              : f.k === "entity"
                ? docTargets[x[f.k]]
                : x[f.k],
      table: f.table,
    }));
  const addRelated =
    tab === "docs" ||
    (tab === "tasks" && ["rooms", "buildings"].includes(k)) ||
    (tab === "rooms" && k === "buildings") ||
    (tab === "repairs" && ["rooms", "buildings", "tasks"].includes(k)) ||
    (tab === "requests" && k === "buildings") ||
    (tab === "leases" && ["rooms", "tenants", "buildings"].includes(k)) ||
    (tab === "ledger" && ["leases", "buildings", "tenants"].includes(k));
  const remove = async () => {
    const used =
      k === "staff" &&
      (x.persona !== undefined ||
        ["tasks", "repairs", "requests", "buildings", "staff", "docs"].some(
          (tt) =>
            s[tt].some((y) =>
              ["manager", "worker", "author", "supervisor", "staff"].some(
                (f) => y[f] === id,
              ),
            ),
        ));
    if (used) {
      toast("Сотрудник связан с записями. Измените его статус в карточке.");
      setConfirm(false);
      return;
    }
    const ok = save((ns) => {
      ns[k] = ns[k].filter((y) => y.id !== id);
      if (k === "docs") {
        for (const owner of [...ns.buildings, ...ns.rooms])
          if (owner.coverDoc === id) delete owner.coverDoc;
      }
      audit(ns, r, k, id, "Удалена запись", x, null);
    });
    if (ok) {
      if (x.blob) await fileOp("delete", x.blob);
      go(t);
      toast("Запись удалена");
    }
  };
  return (
    <>
      <button className="back" onClick={() => go(t)}>
        <ArrowLeft size={15} />
        {titles[t]}
      </button>
      <PageTop
        title={x.name}
        hint={
          x.address ||
          [singular[t], x.building && name(s, "buildings", x.building)]
            .filter(Boolean)
            .join(" · ")
        }
      >
        {canEdit && (
          <button
            className="btn secondary"
            onClick={() => modal({ kind: "edit", t, id })}
          >
            <Pencil size={15} /> Изменить
          </button>
        )}
        {((k === "docs" && r === 0) ||
          (k === "staff" && r === 0 && x.persona === undefined)) && (
          <button
            className="iconbtn"
            aria-label="Удалить запись"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={16} />
          </button>
        )}
      </PageTop>
      <div className="detail-strip">
        <Badge value={statusOf(s, t, x)} />
        {x.version && <span>Версия {x.version}</span>}
        {(x.created || x.date) && (
          <span>
            <CalendarDays size={14} /> {date(x.created || x.date)}
          </span>
        )}
        {k === "buildings" && (
          <button
            className="plain"
            onClick={() => go("map", "", { building: id })}
          >
            <MapPin size={15} /> На карте
          </button>
        )}
      </div>
      {actions.length > 0 && (
        <div className="workflow-actions">
          {actions.map((a, i) => (
            <button
              className={"btn " + (i === 0 ? "primary" : "secondary")}
              key={a.key}
              data-tour-action={a.key}
              onClick={() => modal({ kind: "workflow", t, id, action: a })}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      {t === "ledger" && x.kind === "Начисление" && unpaid(s, x) > 0 && (
        <button
          className="btn primary mb"
          data-tour-action="payment"
          onClick={() =>
            modal({
              kind: "edit",
              t: "ledger",
              ctx: {
                kind: "Поступление",
                name: "Оплата · " + x.name,
                building: x.building,
                tenant: x.tenant,
                lease: x.lease,
                charge: id,
                amount: unpaid(s, x),
                category: x.category,
              },
            })
          }
        >
          Зарегистрировать оплату · {rub(unpaid(s, x))}
        </button>
      )}
      {t === "leases" && canEdit && (
        <button
          className="btn secondary mb"
          onClick={() => modal({ kind: "edit", t, id })}
        >
          Продлить договор
        </button>
      )}
      <div className="tabs">
        {[
          ["overview", "Обзор"],
          ...linked.map((v) => [
            v,
            v === "repairs" ? "История ремонтов" : titles[v],
          ]),
          ["history", "История изменений"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={tab === v ? "active" : ""}
            onClick={() => setTab(v)}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <div className="detail-layout">
          <section className="panel">
            <div className="panel-title">
              <h2>Общая информация</h2>
            </div>
            <div className="data-grid">
              {rowFields.map((f) => (
                <div key={f.k}>
                  <small>{f.label}</small>
                  {f.table &&
                  allowed(r, f.table) &&
                  canSee(s, r, f.table, get(s, f.table, x[f.k])) ? (
                    <button
                      className="plain"
                      onClick={() =>
                        go(
                          r === 4 && f.table === "requests"
                            ? "supply"
                            : f.table,
                          x[f.k],
                        )
                      }
                    >
                      {f.v} <ArrowRight size={13} />
                    </button>
                  ) : (
                    <b>{String(f.v)}</b>
                  )}
                </div>
              ))}
              {k === "buildings" && (
                <div>
                  <small>Помещений в реестре</small>
                  <b>{s.rooms.filter((y) => y.building === id).length}</b>
                </div>
              )}
              {k === "rooms" &&
                financeRole(r) &&
                s.leases
                  .filter((l) => l.room === id && l.id === x.lease)
                  .map((l) => (
                    <React.Fragment key={l.id}>
                      <div>
                        <small>Арендатор</small>
                        <b>{name(s, "tenants", l.tenant)}</b>
                      </div>
                      <div>
                        <small>Аренда в месяц</small>
                        <b>{rub(l.rate)}</b>
                      </div>
                      <div>
                        <small>Период аренды</small>
                        <b>
                          {date(l.start)} — {date(l.end)}
                        </b>
                      </div>
                    </React.Fragment>
                  ))}
              {k === "tenants" && (
                <div>
                  <small>Текущая задолженность</small>
                  <b>
                    {rub(
                      s.ledger
                        .filter((y) => y.tenant === id && y.due <= day())
                        .reduce((a, y) => a + unpaid(s, y), 0),
                    )}
                  </b>
                </div>
              )}
              {k === "repairs" && financeRole(r) && (
                <div>
                  <small>Общая сумма убытков</small>
                  <b>{rub(losses(x))}</b>
                </div>
              )}
              {k === "ledger" && x.repair && (
                <div>
                  <small>Основание расхода</small>
                  {allowed(r, "repairs") ? (
                    <button
                      className="plain"
                      onClick={() => go("repairs", x.repair)}
                    >
                      {name(s, "repairs", x.repair)}
                    </button>
                  ) : (
                    <b>{name(s, "repairs", x.repair)}</b>
                  )}
                </div>
              )}
              {k === "ledger" && x.kind === "Начисление" && (
                <div>
                  <small>Остаток к оплате</small>
                  <b>{rub(unpaid(s, x))}</b>
                </div>
              )}
              {k === "buildings" && x.project && financeRole(r) && (
                <div>
                  <small>Фактические расходы</small>
                  <b>
                    {rub(
                      s.ledger
                        .filter((o) => o.kind === "Расход" && o.building === id)
                        .reduce((a, o) => a + o.amount, 0),
                    )}
                  </b>
                </div>
              )}
              {Object.entries({
                author: "Создал",
                report: "Отчёт исполнителя",
                materials: "Использованные материалы",
                reviewed: "Проверил",
                finished: "Принято",
                supplier: "Поставщик",
                buyer: "Ответственный за закупку",
                price: "Стоимость закупки, ₽",
                received: "Получено",
                actual: "Фактическая дата",
                delivery: "Плановая доставка",
              })
                .filter(
                  ([key]) =>
                    x[key] !== undefined &&
                    x[key] !== "" &&
                    (key !== "price" || financeRole(r) || r === 4),
                )
                .map(([key, l]) => (
                  <div key={key}>
                    <small>{l}</small>
                    <b>
                      {key === "author"
                        ? name(s, "staff", x[key])
                        : ["actual", "delivery", "finished"].includes(key)
                          ? date(x[key])
                          : String(x[key])}
                    </b>
                  </div>
                ))}
              {x.started && x.finished && (
                <div>
                  <small>Время выполнения</small>
                  <b>
                    {Math.max(
                      1,
                      Math.round(
                        (new Date(x.finished) - new Date(x.started)) / 60000,
                      ),
                    )}{" "}
                    мин
                  </b>
                </div>
              )}
            </div>
            {k === "docs" && (
              <div className="workflow-actions inset">
                {(x.mime?.startsWith("image/") ||
                  x.mime === "application/pdf") && (
                  <button
                    className="btn primary"
                    onClick={() => openDoc(false)}
                  >
                    <ExternalLink size={15} /> Просмотр
                  </button>
                )}
                <button className="btn secondary" onClick={() => openDoc(true)}>
                  <Download size={15} /> Скачать
                </button>
              </div>
            )}
          </section>
          <aside>
            {(k === "buildings" || k === "rooms") && <DetailPhoto x={x} />}
            {x.approval && (
              <section className="panel decision">
                <CheckCircle2 size={21} />
                <h3>Решение директора</h3>
                <Badge value={x.approval.decision} />
                <p>
                  {x.approval.by} · {date(x.approval.time)}
                </p>
                <small>Версия {x.approval.version}</small>
                <code>{x.approval.signature}</code>
                {x.approval.comment && <p>{x.approval.comment}</p>}
              </section>
            )}
            {x.project && (
              <section className="panel decision">
                <h3>Ход строительства</h3>
                <b>{x.progress}%</b>
                <progress value={x.progress} max="100" />
                <p>{x.stage}</p>
              </section>
            )}
          </aside>
        </div>
      ) : tab === "history" ? (
        <section className="panel">
          <div className="panel-title">
            <h2>История изменений</h2>
          </div>
          <History
            list={[...(x.history || [])]
              .reverse()
              .concat(
                history.filter(
                  (h) =>
                    !x.history?.some(
                      (e) =>
                        e.action === h.action &&
                        Math.abs(new Date(e.time) - new Date(h.time)) < 2000,
                    ),
                ),
              )}
          />
        </section>
      ) : (
        <section className="panel">
          <div className="panel-title">
            <h2>
              {titles[tab]} <span className="count">{records.length}</span>
            </h2>
            {canWrite(r, tab) && addRelated && (
              <button
                className="btn secondary"
                onClick={() =>
                  modal({
                    kind: "edit",
                    t: tab,
                    ctx: Object.fromEntries(
                      Object.entries({
                        ...ctx,
                        ...(tab === "docs" ? { entity: k, link: id } : {}),
                      }).filter(([, v]) => v !== undefined),
                    ),
                  })
                }
              >
                <Plus size={15} /> Добавить
              </button>
            )}
          </div>
          {tab === "repairs" && records.length > 0 && (
            <div className="note inset">
              {records.length} записей обслуживания
              {financeRole(r)
                ? " · Сумма убытков " +
                  rub(records.reduce((a, y) => a + losses(y), 0))
                : ""}{" "}
              ·{" "}
              {[...new Set(records.map((y) => y.category))]
                .map(
                  (c) =>
                    c +
                    " (" +
                    records.filter((y) => y.category === c).length +
                    ")",
                )
                .join(", ")}
            </div>
          )}
          <Records type={tab} rows={records} />
        </section>
      )}
      {confirm && (
        <Modal
          title="Удалить запись?"
          description={x.name}
          onClose={() => setConfirm(false)}
        >
          <div className="modal-foot">
            <button className="btn secondary" onClick={() => setConfirm(false)}>
              Отмена
            </button>
            <button className="btn danger" onClick={remove}>
              Удалить
            </button>
          </div>
        </Modal>
      )}
      {preview && (
        <Modal
          title={x.name}
          wide
          onClose={() => {
            URL.revokeObjectURL(preview);
            setPreview("");
          }}
        >
          {x.mime?.startsWith("image/") ? (
            <img className="doc-preview" alt={x.name} src={preview} />
          ) : (
            <iframe title={x.name} className="pdf-preview" src={preview} />
          )}
        </Modal>
      )}
    </>
  );
}
