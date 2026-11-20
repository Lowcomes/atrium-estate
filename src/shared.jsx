import React, { useContext, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Construction,
  DoorOpen,
  FileClock,
  FileText,
  FolderClosed,
  HardHat,
  History,
  LayoutDashboard,
  Map,
  Package,
  ScrollText,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";
import {
  get,
  name,
  date,
  fmt,
  rub,
  financeRole,
  unpaid,
  activeLease,
  day,
  baseType,
  losses,
  visible,
  roomStatus,
} from "./model";
export const C = React.createContext(null);
export const useApp = () => useContext(C);
export const icons = {
  home: LayoutDashboard,
  buildings: Building2,
  rooms: DoorOpen,
  tenants: Users,
  leases: ScrollText,
  ledger: Wallet,
  construction: HardHat,
  repairs: Wrench,
  tasks: ClipboardList,
  requests: ClipboardCheck,
  supply: Package,
  staff: Users,
  docs: FolderClosed,
  map: Map,
  calendar: CalendarDays,
  reports: BarChart3,
  audit: History,
  notifications: Bell,
};
export function Icon({ type, size = 18, ...props }) {
  const I = icons[type] || Activity;
  return <I size={size} strokeWidth={1.7} {...props} />;
}
export function Badge({ value }) {
  let tone = "neutral";
  if (
    /согласована|закрыта|выполнена|доставлено|сдаётся|арендуется|свободно|хорошее|действует|работает|завершён|погашено|активен/i.test(
      value,
    )
  )
    tone = "green";
  if (
    /ремонт|согласовании|проверке|ожидает|удовлет|частично|заказано|строится|запланирован/i.test(
      value,
    )
  )
    tone = "amber";
  if (/отклонена|доработке|просроч|задолж|высокий/i.test(value)) tone = "red";
  if (/назначена|в работе|компанией|в закупке|поступление/i.test(value))
    tone = "blue";
  return (
    <span className={"badge " + tone}>
      <i />
      {value || "—"}
    </span>
  );
}
export function Empty({
  title = "Записей пока нет",
  text = "Здесь появятся записи раздела.",
}) {
  return (
    <div className="empty">
      <FolderClosed size={25} />
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}
export function Modal({ title, description, children, onClose, wide = false }) {
  return (
    <Dialog.Root
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className={"modal " + (wide ? "wide" : "")}
          aria-describedby={description ? "modal-desc" : undefined}
        >
          <div className="modal-head">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description && (
                <Dialog.Description id="modal-desc">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="iconbtn" aria-label="Закрыть">
              <X size={19} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function download(filename, content, type = "text/plain") {
  const url = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function csv(filename, headers, rows) {
  const cell = (v) => {
    let t = String(v ?? "");
    if (/^[=+@\-]/.test(t)) t = "'" + t;
    return '"' + t.replaceAll('"', '""') + '"';
  };
  download(
    filename + ".csv",
    "\uFEFF" +
      [headers, ...rows].map((r) => r.map(cell).join(";")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
let database;
function openFiles() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const q = indexedDB.open("atrium.files.v1", 1);
      q.onupgradeneeded = () => q.result.createObjectStore("files");
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
  return database;
}
export async function fileOp(action, key, value) {
  const db = await openFiles();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      "files",
      action === "get" ? "readonly" : "readwrite",
    );
    const os = tx.objectStore("files");
    const query =
      action === "put"
        ? os.put(value, key)
        : action === "delete"
          ? os.delete(key)
          : os.get(key);
    tx.oncomplete = () => resolve(query.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export function statusOf(s, t, x) {
  if (t === "ledger")
    return x.kind === "Начисление"
      ? unpaid(s, x)
        ? x.due < day()
          ? "Просрочено"
          : "К оплате"
        : "Погашено"
      : x.kind;
  if (t === "leases")
    return x.status === "Расторгнут"
      ? "Расторгнут"
      : x.end < day()
        ? "Истёк"
        : x.start > day()
          ? "Запланирован"
          : "Действует";
  return x.status || x.category || "";
}
export function cellData(s, r, t, x) {
  switch (baseType(t)) {
    case "buildings":
      return [
        x.name,
        x.address,
        name(s, "staff", x.manager),
        fmt(x.area) + " м²",
        statusOf(s, t, x),
      ];
    case "rooms":
      return [
        x.name,
        name(s, "buildings", x.building),
        x.purpose,
        fmt(x.area) + " м²",
        x.status,
      ];
    case "tenants":
      return [x.name, x.contact, x.phone, x.email, x.status];
    case "leases":
      return [
        x.name,
        name(s, "tenants", x.tenant),
        name(s, "buildings", x.building),
        date(x.end),
        statusOf(s, t, x),
      ];
    case "ledger":
      return [
        x.name,
        name(s, "buildings", x.building),
        date(x.date),
        rub(x.amount),
        statusOf(s, t, x),
      ];
    case "tasks":
      return [
        x.name,
        name(s, "buildings", x.building),
        name(s, "staff", x.worker),
        date(x.due),
        x.status,
      ];
    case "repairs":
      return [
        x.name,
        name(s, "buildings", x.building),
        x.category,
        date(x.due),
        x.status,
      ];
    case "requests":
      return [
        x.name,
        name(s, "buildings", x.building),
        fmt(x.quantity) + " " + x.unit,
        date(x.due),
        x.status,
      ];
    case "staff":
      return [
        x.name,
        x.role,
        x.email || "—",
        name(s, "staff", x.supervisor),
        x.status,
      ];
    case "docs":
      return [
        x.name,
        name(s, "buildings", x.building),
        name(s, "staff", x.author),
        date(x.date),
        x.category,
      ];
    default:
      return [x.name, "", "", "", x.status];
  }
}
export function headers(t) {
  return {
    buildings: ["Объект", "Адрес", "Управляющий", "Площадь", "Статус"],
    rooms: ["Помещение", "Объект", "Назначение", "Площадь", "Статус"],
    tenants: ["Арендатор", "Контактное лицо", "Телефон", "Почта", "Статус"],
    leases: ["Договор", "Арендатор", "Объект", "Окончание", "Статус"],
    ledger: ["Операция", "Объект", "Дата", "Сумма", "Статус"],
    tasks: ["Задача", "Объект", "Исполнитель", "Срок", "Статус"],
    repairs: ["Работы", "Объект", "Категория", "Дата работ", "Статус"],
    requests: ["Заявка", "Объект", "Количество", "Срок", "Статус"],
    staff: ["Сотрудник", "Роль", "Почта", "Руководитель", "Статус"],
    docs: ["Документ", "Объект", "Загрузил", "Дата", "Категория"],
  }[baseType(t)];
}
export function Records({ type, rows, compact = false }) {
  const { s, r, go } = useApp();
  if (!rows.length)
    return (
      <Empty
        title="Записей не найдено"
        text="Попробуйте изменить фильтры или добавьте запись."
      />
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers(type).map((h, i) => (
              <th key={h} className={compact && i === 2 ? "hide-sm" : ""}>
                {h}
              </th>
            ))}
            <th aria-label="Открыть" />
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr
              key={x.id}
              tabIndex={0}
              onClick={() => go(type, x.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go(type, x.id);
              }}
            >
              {cellData(s, r, type, x).map((v, i) => (
                <td
                  key={i}
                  className={
                    (i === 0 ? "first-cell " : "") +
                    (compact && i === 2 ? "hide-sm" : "")
                  }
                >
                  {i === 4 ? (
                    <Badge value={v} />
                  ) : i === 0 ? (
                    <div className="record-name">
                      {baseType(type) === "buildings" && (
                        <img src={x.photo || "./media/building-2.jpg"} alt="" />
                      )}
                      {v}
                    </div>
                  ) : (
                    v
                  )}
                </td>
              ))}
              <td>
                <ChevronRight size={14} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function PageTop({ title, hint, children }) {
  return (
    <section className="page-title">
      <div>
        <h1>{title}</h1>
        {hint && <p>{hint}</p>}
      </div>
      <div className="actions">{children}</div>
    </section>
  );
}
export function BuildingStats({ s, b }) {
  const rooms = s.rooms.filter((x) => x.building === b.id);
  return [
    { label: "Площадь", value: fmt(b.area) + " м²" },
    { label: "Помещения", value: rooms.length },
    {
      label: "В аренде",
      value: rooms.filter((x) => x.status === roomStatus[1]).length,
    },
    { label: "Этажность", value: b.floors },
  ];
}
