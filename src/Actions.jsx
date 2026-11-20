import React, { useState } from "react";
import { ArrowRight, Check, FileUp, Search } from "lucide-react";
import { useApp, Modal, Icon, fileOp, download } from "./shared";
import { fields, defaults, formResult, validate, choices } from "./forms";
import {
  allowed,
  canWrite,
  singular,
  titles,
  baseType,
  uid,
  day,
  audit,
  syncLeases,
  syncRepairExpense,
  visible,
  principal,
  get,
  name,
  users,
  ROLES,
  financeRole,
  unpaid,
  date,
} from "./model";
const allowedFiles = /\.(pdf|docx?|xlsx?|jpe?g|png)$/i;
export function Edit({ config, close }) {
  const { s, r, save, go, toast } = useApp(),
    { t, id, ctx = {} } = config,
    old = get(s, t, id);
  const [d, setD] = useState(() => ({ ...defaults(s, t, r, ctx), ...old }));
  const [err, error] = useState(""),
    [file, setFile] = useState(null),
    [busy, setBusy] = useState(false);
  const ff = fields(t, d, r);
  const set = (k, v) =>
    setD((prev) => {
      const n = { ...prev, [k]: v };
      if (k === "building") {
        n.room = "";
        n.task = "";
        n.lease = "";
        n.charge = "";
        n.link = n.entity === "buildings" ? v : "";
        const b = get(s, "buildings", v);
        if (b) {
          n.manager = b.manager;
          n.worker = b.staff;
        }
      }
      if (k === "entity") n.link = v === "buildings" ? n.building : "";
      if (k === "kind") {
        n.lease = "";
        n.tenant = "";
        n.charge = "";
        n.reference = "";
        n.category = v === "Расход" ? "Коммунальные услуги" : "Аренда";
      }
      if (k === "tenant") {
        n.lease = "";
        n.charge = "";
      }
      if (k === "lease") n.charge = "";
      if (k === "charge" && v) {
        const c = get(s, "ledger", v);
        n.amount = unpaid(s, c);
        n.tenant = c.tenant;
        n.lease = c.lease;
        n.name = "Оплата · " + c.name;
      }
      return n;
    });
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    error("");
    const res = formResult(t, d, r, old);
    res.id = id || uid();
    const e1 = validate(s, t, res, old);
    if (e1) {
      error(e1);
      return;
    }
    for (const f of ff) {
      if (f.required && f.kind !== "file" && !String(res[f.k] ?? "").trim()) {
        error("Заполните поле «" + f.l + "».");
        return;
      }
      if (
        f.kind === "ref" &&
        res[f.k] &&
        !choices(s, r, t, f, d).some((o) => o.value === res[f.k]) &&
        res[f.k] !== old?.[f.k]
      ) {
        error("Проверьте поле «" + f.l + "».");
        return;
      }
    }
    if (
      t === "docs" &&
      (!old || file) &&
      (!file || !allowedFiles.test(file.name) || file.size > 15 * 1024 * 1024)
    ) {
      error("Выберите PDF, Word, Excel, JPG или PNG размером до 15 МБ.");
      return;
    }
    setBusy(true);
    try {
      if (t === "docs" && file) {
        res.blob = uid();
        res.mime = file.type;
        res.filename = file.name;
        res.size = file.size;
        delete res.url;
        await fileOp("put", res.blob, file);
      }
      const key = baseType(t);
      const ok = save((ns) => {
        if (id) {
          const at = ns[key].findIndex((x) => x.id === id);
          ns[key][at] = res;
        } else ns[key].unshift(res);
        if (t === "leases") syncLeases(ns);
        if (t === "repairs") syncRepairExpense(ns, res);
        if (t === "requests" && old) {
          res.history = [
            ...(old.history || []),
            {
              action: "Новая редакция отправлена на согласование",
              by: principal(s, r).name,
              time: new Date().toISOString(),
              version: res.version,
              previousDecision: old.approval,
            },
          ];
        }
        if ((t === "repairs" || t === "tasks") && res.task) {
          const task = get(ns, "tasks", res.task);
          if (task) {
            task.history = [
              ...(task.history || []),
              {
                action: "Запись обслуживания: " + res.name,
                by: principal(s, r).name,
                time: new Date().toISOString(),
              },
            ];
          }
        }
        if (
          t === "docs" &&
          ["buildings", "rooms"].includes(res.entity) &&
          res.mime?.startsWith("image/")
        ) {
          const obj = get(ns, res.entity, res.link);
          if (obj) obj.coverDoc = res.id;
        }
        audit(
          ns,
          r,
          key,
          res.id,
          old ? "Изменена запись" : "Создана запись",
          old || null,
          res,
        );
      });
      if (!ok) {
        if (res.blob && file) await fileOp("delete", res.blob);
        throw Error("Не удалось сохранить запись");
      }
      if (old?.blob && file) await fileOp("delete", old.blob);
      close();
      go(t, res.id);
      toast(old ? "Изменения сохранены" : "Запись создана");
    } catch (ex) {
      error(ex.message || "Ошибка сохранения файла");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={(id ? "Редактирование" : "Новая запись") + " · " + singular[t]}
      onClose={close}
      wide
    >
      <form onSubmit={submit}>
        <div className="modal-scroll form-grid">
          {ff.map((f) => {
            const opts = ["select", "ref"].includes(f.kind)
                ? choices(s, r, t, f, d)
                : [],
              locked =
                (f.k === "room" && old?.lease) ||
                (t === "rooms" && f.k === "building" && old) ||
                (t === "ledger" &&
                  old &&
                  ["kind", "building", "tenant", "lease", "charge"].includes(
                    f.k,
                  )) ||
                (t === "staff" &&
                  old?.persona !== undefined &&
                  f.k === "role") ||
                (t === "construction" && r === 1 && !id && f.k === "manager");
            return (
              <label
                key={f.k}
                className={["textarea", "file"].includes(f.kind) ? "span2" : ""}
              >
                {f.l}
                {f.required ? " *" : ""}
                {f.kind === "textarea" ? (
                  <textarea
                    value={d[f.k] || ""}
                    onChange={(e) => set(f.k, e.target.value)}
                    rows="3"
                  />
                ) : f.kind === "file" ? (
                  <>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      required={f.required}
                      onChange={(e) => {
                        const v = e.target.files[0];
                        setFile(v);
                        if (v && !d.name) set("name", v.name);
                      }}
                    />
                    <small>PDF, Word, Excel, JPG или PNG · до 15 МБ</small>
                  </>
                ) : ["select", "ref"].includes(f.kind) ? (
                  <select
                    required={f.required}
                    disabled={!!locked}
                    value={d[f.k] || ""}
                    onChange={(e) => set(f.k, e.target.value)}
                  >
                    <option value="">
                      {f.required ? "Выберите…" : "Не указано"}
                    </option>
                    {opts.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                    {d[f.k] &&
                      !opts.some((o) => o.value === d[f.k]) &&
                      old?.[f.k] === d[f.k] && (
                        <option value={d[f.k]}>
                          {f.table ? name(s, f.table, d[f.k]) : d[f.k]}
                        </option>
                      )}
                  </select>
                ) : (
                  <input
                    required={
                      f.required ||
                      (f.kind === "number" &&
                        ["amount", "quantity", "area", "rate"].includes(f.k))
                    }
                    type={f.kind}
                    step={
                      f.kind === "number"
                        ? f.k === "floors" || f.k === "floor"
                          ? "1"
                          : "any"
                        : undefined
                    }
                    min={f.min}
                    max={f.max}
                    value={d[f.k] ?? ""}
                    onChange={(e) => set(f.k, e.target.value)}
                  />
                )}
              </label>
            );
          })}
        </div>
        {err && (
          <p role="alert" className="error">
            {err}
          </p>
        )}
        <div className="modal-foot">
          <button type="button" className="btn secondary" onClick={close}>
            Отмена
          </button>
          <button className="btn primary" disabled={busy}>
            <Check size={15} />
            {busy
              ? "Сохранение…"
              : t === "requests"
                ? "Отправить на согласование"
                : "Сохранить"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export const transitions = (r, t, x, s) => {
  const a = [],
    me = principal(s, r)?.id,
    add = (key, label, next, inputs = []) =>
      a.push({ key, label, next, inputs });
  if (t === "tasks") {
    if (r === 0 || (r === 2 && x.worker === me)) {
      if (["Назначена", "Новая"].includes(x.status))
        add("accept", "Принять задачу", "Принята исполнителем");
      if (
        ["Принята исполнителем", "На доработке", "Ожидает материалов"].includes(
          x.status,
        )
      )
        add("start", "Начать работу", "В работе");
      if (x.status === "В работе") {
        add("submit", "Передать на проверку", "На проверке", [
          "report",
          "materials",
        ]);
        add("hold", "Запросить материалы", "Ожидает материалов", ["note"]);
      }
    }
    if (
      (r === 0 || (r === 1 && x.manager === me)) &&
      x.status === "На проверке"
    ) {
      add("approvework", "Принять работу", "Выполнена");
      add("return", "Вернуть на доработку", "На доработке", ["note"]);
      add("info", "Запросить сведения", "На доработке", ["note"]);
    }
    if (r === 0 && x.status === "Выполнена")
      add("close", "Закрыть задачу", "Закрыта");
    if (
      [0, 1].includes(r) &&
      !["Отменена", "Закрыта", "Выполнена"].includes(x.status)
    )
      add("cancel", "Отменить задачу", "Отменена", ["note"]);
    if ([0, 1, 2].includes(r))
      add("comment", "Комментарий", x.status, ["note"]);
  } else if (t === "requests" || t === "supply") {
    if (r === 0 && x.status === "На согласовании") {
      add("sign", "Подписать и согласовать", "Согласована", ["comment"]);
      add("reject", "Отклонить", "Отклонена", ["note"]);
    }
    if ((r === 0 || r === 4) && x.status === "Согласована")
      add("buy", "Принять в закупку", "В закупке", ["buyer"]);
    if ((r === 0 || r === 4) && x.status === "В закупке")
      add("order", "Оформить заказ", "Заказано", [
        "supplier",
        "price",
        "delivery",
      ]);
    if ((r === 0 || r === 4) && x.status === "Заказано")
      add("deliver", "Подтвердить поставку", "Доставлено", [
        "received",
        "actual",
      ]);
  } else if (t === "construction" && x.status === "Строится" && r === 0)
    add("commission", "Ввести в эксплуатацию", "Частично сдается", ["actual"]);
  return a;
};
const inputNames = {
  report: "Выполненные работы",
  materials: "Использованные материалы",
  note: "Комментарий / причина",
  comment: "Комментарий (необязательно)",
  buyer: "Ответственный за закупку",
  supplier: "Поставщик",
  price: "Стоимость закупки, ₽",
  delivery: "Плановая дата доставки",
  actual: "Фактическая дата",
  received: "Получено единиц",
};
export function Workflow({ config, close }) {
  const { s, r, save, toast } = useApp(),
    { t, id, action } = config,
    x = get(s, t, id),
    [d, set] = useState({
      buyer: principal(s, 4)?.name,
      received: x.quantity,
      actual: day(),
      delivery: x.due,
    }),
    [err, error] = useState(""),
    [proof, setProof] = useState(null),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const current = transitions(r, t, x, s).find((a) => a.key === action.key);
    if (!current) {
      error("Действие больше недоступно");
      return;
    }
    const payload = Object.fromEntries(
      action.inputs.map((k) => [
        k,
        ["price", "received"].includes(k)
          ? Number(d[k])
          : String(d[k] || "").trim(),
      ]),
    );
    if (
      action.inputs.some(
        (k) =>
          k !== "comment" &&
          k !== "materials" &&
          !String(payload[k] ?? "").trim(),
      )
    ) {
      error("Заполните обязательные поля");
      return;
    }
    let evidence;
    if (proof) {
      if (!allowedFiles.test(proof.name) || proof.size > 15 * 1024 * 1024) {
        error("Допустимы PDF, Word, Excel и изображения до 15 МБ.");
        return;
      }
      setBusy(true);
      evidence = {
        id: uid(),
        name: proof.name,
        filename: proof.name,
        mime: proof.type,
        size: proof.size,
        blob: uid(),
        category: action.key === "deliver" ? "Накладная" : "Фотоотчёт",
        entity: baseType(t),
        link: id,
        building: x.building,
        author: principal(s, r).id,
        date: day(),
      };
      try {
        await fileOp("put", evidence.blob, proof);
      } catch {
        error("Не удалось сохранить вложение.");
        setBusy(false);
        return;
      }
    }
    const ok = save((ns) => {
      const rec = get(ns, t, id),
        before = structuredClone(rec),
        time = new Date().toISOString(),
        by = principal(ns, r).name;
      rec.status = action.next;
      if (evidence) {
        ns.docs.unshift(evidence);
        audit(ns, r, "docs", evidence.id, "Приложен документ", null, evidence);
      }
      Object.assign(rec, payload);
      rec.history = [
        ...(rec.history || []),
        { action: action.label, by, time, version: rec.version, ...payload },
      ];
      if (["sign", "reject"].includes(action.key))
        rec.approval = {
          by,
          time,
          decision: action.next,
          version: rec.version,
          comment: payload.comment || payload.note,
          signature:
            action.key === "sign"
              ? "АТР-" +
                rec.id.slice(0, 8).toUpperCase() +
                "-V" +
                rec.version +
                "-" +
                time.replace(/\D/g, "").slice(0, 14)
              : "",
        };
      if (action.key === "start" && !rec.started) rec.started = time;
      if (action.key === "submit") rec.submitted = time;
      if (action.key === "approvework") {
        rec.reviewed = by;
        rec.finished = time;
      }
      if (action.key === "commission") {
        rec.progress = 100;
        rec.commissioned = payload.actual;
      }
      audit(ns, r, baseType(t), id, action.label, before, rec);
    });
    setBusy(false);
    if (ok) {
      close();
      toast("Сохранено · " + action.next);
    } else if (evidence) await fileOp("delete", evidence.blob);
  };
  return (
    <Modal
      title={action.label}
      description={x.name + (x.version ? " · версия " + x.version : "")}
      onClose={close}
    >
      <form onSubmit={submit}>
        <div className="modal-scroll form-grid">
          {action.key === "sign" && (
            <div className="note span2">
              Решение будет сохранено для версии {x.version}. Подписант —{" "}
              {principal(s, r).name}.
            </div>
          )}
          {!action.inputs.length && (
            <div className="note span2">
              Новый статус — {action.next.toLowerCase()}.
            </div>
          )}
          {action.inputs.map((k) => (
            <label key={k} className="span2">
              {inputNames[k]}
              {["note", "comment", "materials", "report"].includes(k) ? (
                <textarea
                  required={!["comment", "materials"].includes(k)}
                  value={d[k] || ""}
                  onChange={(e) => set({ ...d, [k]: e.target.value })}
                  rows={3}
                />
              ) : (
                <input
                  type={
                    ["price", "received"].includes(k)
                      ? "number"
                      : ["actual", "delivery"].includes(k)
                        ? "date"
                        : "text"
                  }
                  step="any"
                  min={k === "received" ? "0.01" : "0"}
                  required
                  value={d[k] ?? ""}
                  onChange={(e) => set({ ...d, [k]: e.target.value })}
                />
              )}
            </label>
          ))}
          {["deliver", "submit"].includes(action.key) && (
            <label className="span2">
              {action.key === "deliver"
                ? "Накладная или чек"
                : "Фото результата или акт"}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setProof(e.target.files[0])}
              />
            </label>
          )}
        </div>
        {err && <p className="error">{err}</p>}
        <div className="modal-foot">
          <button type="button" className="btn secondary" onClick={close}>
            Отмена
          </button>
          <button className="btn primary" disabled={busy}>
            Подтвердить
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Picker({ kind, close }) {
  const { s, r, go, modal } = useApp(),
    [q, set] = useState("");
  const keys = Object.keys(singular).filter(
    (t) =>
      allowed(r, t) && t !== "supply" && (kind !== "create" || canWrite(r, t)),
  );
  const results = q.trim()
    ? keys
        .flatMap((t) =>
          visible(s, r, t)
            .filter((x) =>
              (x.name + " " + (x.address || ""))
                .toLowerCase()
                .includes(q.toLowerCase()),
            )
            .slice(0, 5)
            .map((x) => ({ t, x })),
        )
        .slice(0, 40)
    : [];
  return (
    <Modal
      title={kind === "create" ? "Создать запись" : "Поиск по портфелю"}
      onClose={close}
    >
      {kind === "search" && (
        <div className="search-dialog">
          <Search size={17} />
          <input
            autoFocus
            placeholder="Название, адрес или номер…"
            value={q}
            onChange={(e) => set(e.target.value)}
          />
        </div>
      )}
      <div className="picker-list">
        {(kind === "create"
          ? keys.map((t) => ({ t }))
          : q
            ? results
            : keys.map((t) => ({ t }))
        ).map(({ t, x }) => (
          <button
            key={t + (x?.id || "")}
            onClick={() => {
              close();
              kind === "create" ? modal({ kind: "edit", t }) : go(t, x?.id);
            }}
          >
            <Icon type={t} />
            <span>
              {x ? x.name : kind === "create" ? singular[t] : titles[t]}
              {x && <small>{titles[t]}</small>}
            </span>
            <ArrowRight size={15} />
          </button>
        ))}
        {kind === "search" && q && !results.length && (
          <p>Совпадений не найдено</p>
        )}
      </div>
    </Modal>
  );
}
