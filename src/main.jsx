import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  Command,
  Menu,
  PanelLeftClose,
  Presentation,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  ROLES,
  SEED_VERSION,
  allowed,
  baseType,
  canSee,
  get,
  load,
  principal,
  seed,
  singular,
  titles,
} from "./model";
import { C, Icon, Modal, fileOp } from "./shared";
import { Edit, Picker, Workflow } from "./Actions";
import Dashboard from "./Dashboard";
import { Registry, Details } from "./Registry";
import {
  MapView,
  Calendar,
  Notifications,
  Reports,
  Audit,
  alerts,
} from "./Workspaces";
import "./style.css";
const groups = [
  [
    "Рабочее пространство",
    ["home", "buildings", "rooms", "tenants", "leases", "ledger"],
  ],
  ["Операции", ["construction", "tasks", "repairs", "requests", "supply"]],
  ["Инструменты", ["map", "calendar", "docs", "reports", "staff", "audit"]],
];
const navLabels = {
  home: "Обзор",
  ledger: "Финансы",
  construction: "Строительство",
  repairs: "Обслуживание",
  reports: "Аналитика",
  audit: "Журнал действий",
  leases: "Договоры",
};
function route() {
  const str = location.hash.slice(1).replace(/^\//, ""),
    [path = "", query = ""] = str.split("?"),
    [t = "home", id = ""] = path.split("/");
  return {
    t: t || "home",
    id,
    params: Object.fromEntries(new URLSearchParams(query)),
  };
}
function Brand() {
  return (
    <div className="brand">
      <span className="brandmark">
        <i />
        <i />
        <i />
      </span>
      <strong>Атриум</strong>
    </div>
  );
}
function App() {
  const [s, setS] = useState(load),
    [r, setR] = useState(() =>
      Math.min(
        4,
        Math.max(0, Number(localStorage.getItem("atrium.role")) || 0),
      ),
    ),
    [path, setPath] = useState(route),
    [dialog, modal] = useState(null),
    [mobile, setMobile] = useState(false),
    [msg, setMsg] = useState(""),
    [error, setError] = useState(""),
    [reset, setReset] = useState(false);
  const go = (t, id = "", params = {}) => {
    const qp = new URLSearchParams(
      Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );
    const target = "#/" + t + (id ? "/" + id : "") + (qp.size ? "?" + qp : "");
    if (location.hash === target) setPath(route());
    else location.hash = target;
    setMobile(false);
    modal(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  useEffect(() => {
    const hash = () => {
        setPath(route());
        setMobile(false);
        modal(null);
        window.scrollTo(0, 0);
      },
      sync = (e) => {
        if (e.key === SEED_VERSION) setS(load());
      },
      key = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          modal({ kind: "search" });
        }
        if (e.key === "Escape") setMobile(false);
      };
    addEventListener("hashchange", hash);
    addEventListener("storage", sync);
    addEventListener("keydown", key);
    return () => {
      removeEventListener("hashchange", hash);
      removeEventListener("storage", sync);
      removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(""), 3400);
      return () => clearTimeout(t);
    }
  }, [msg]);
  const toast = (m) => setMsg(m);
  const save = (fn) => {
    try {
      const current = JSON.parse(localStorage.getItem(SEED_VERSION) || "null");
      if (current && (current.rev || 0) !== (s.rev || 0)) {
        setS(current);
        setError("Данные обновлены в другой вкладке. Повторите действие.");
        return false;
      }
      const next = structuredClone(s);
      fn(next);
      next.rev = (s.rev || 0) + 1;
      localStorage.setItem(SEED_VERSION, JSON.stringify(next));
      setS(next);
      return true;
    } catch {
      setError(
        "Не удалось сохранить данные в браузере. Проверьте доступное место.",
      );
      return false;
    }
  };
  const role = (v) => {
    localStorage.setItem("atrium.role", String(v));
    setR(v);
    go("home");
    toast("Рабочее пространство · " + ROLES[v]);
  };
  const t = allowed(r, path.t) && titles[path.t] ? path.t : "home",
    id = t === path.t ? path.id : "",
    me = principal(s, r);
  const unread = alerts(s, r).filter((x) => !s.read[r]?.includes(x.key)).length;
  const badge = s.requests.filter(
    (x) => x.status === "На согласовании" && canSee(s, r, "requests", x),
  ).length;
  const child =
    id && singular[t] ? (
      <Details t={t} id={id} />
    ) : t === "home" ? (
      <Dashboard />
    ) : t === "map" ? (
      <MapView params={path.params} />
    ) : t === "calendar" ? (
      <Calendar />
    ) : t === "reports" ? (
      <Reports />
    ) : t === "audit" ? (
      <Audit />
    ) : t === "notifications" ? (
      <Notifications />
    ) : (
      <Registry t={t} params={path.params} />
    );
  return (
    <C.Provider value={{ s, r, go, save, modal, toast }}>
      <div className="app">
        {mobile && (
          <div className="mobile-overlay" onClick={() => setMobile(false)} />
        )}
        <aside className={"sidebar " + (mobile ? "open" : "")}>
          <button
            className="brand-link"
            aria-label="Атриум — главная"
            onClick={() => go("home")}
          >
            <Brand />
          </button>
          <div className="workspace">
            <div className="workspace-logo">
              <Building2 size={17} />
            </div>
            <div>
              <b>Атриум Менеджмент</b>
              <small>Управляющая компания</small>
            </div>
          </div>
          <nav>
            {groups.map(
              ([label, items]) =>
                items.some((k) => allowed(r, k)) && (
                  <div className="navgroup" key={label}>
                    <small>{label}</small>
                    {items
                      .filter((k) => allowed(r, k))
                      .map((k) => (
                        <button
                          key={k}
                          className={"navitem " + (t === k ? "active" : "")}
                          onClick={() => go(k)}
                        >
                          <Icon type={k} size={17} />
                          <span>{navLabels[k] || titles[k]}</span>
                          {k === "requests" && badge > 0 && <em>{badge}</em>}
                        </button>
                      ))}
                  </div>
                ),
            )}
          </nav>
          <div className="side-foot">
            <button onClick={() => modal({ kind: "guide" })}>
              <Presentation size={16} /> Режим презентации
            </button>
            <button className="profile" onClick={() => modal({ kind: "role" })}>
              <span className="avatar">
                {me.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </span>
              <span>
                <b>{me.name}</b>
                <small>{ROLES[r]}</small>
              </span>
              <ChevronsUpDown size={15} />
            </button>
          </div>
        </aside>
        <main>
          <header className="topbar">
            <button
              className="iconbtn mobile-menu"
              aria-label="Открыть меню"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <div className="crumb">
              <span>Рабочее пространство</span>
              <ChevronRight size={14} />
              <b>{navLabels[t] || titles[t]}</b>
            </div>
            <div className="tools">
              <button
                className="global-search"
                onClick={() => modal({ kind: "search" })}
              >
                <Search size={15} />
                <span>Поиск</span>
                <kbd>Ctrl K</kbd>
              </button>
              <button
                className="bell iconbtn"
                aria-label="Уведомления"
                onClick={() => go("notifications")}
              >
                <Bell size={18} />
                {unread > 0 && <i />}
              </button>
              <span className="vline" />
              <button
                className="header-profile"
                aria-label="Сменить роль"
                title="Сменить роль"
                onClick={() => modal({ kind: "role" })}
              >
                <span className="avatar small">
                  {me.name
                    .split(" ")
                    .map((x) => x[0])
                    .join("")}
                </span>
                <ChevronDown size={13} />
              </button>
            </div>
          </header>
          <div className="content" key={JSON.stringify(path) + r}>
            {child}
          </div>
        </main>
      </div>
      {dialog?.kind === "edit" && (
        <Edit
          key={dialog.t + (dialog.id || "")}
          config={dialog}
          close={() => modal(null)}
        />
      )}
      {dialog?.kind === "workflow" && (
        <Workflow config={dialog} close={() => modal(null)} />
      )}
      {["search", "create"].includes(dialog?.kind) && (
        <Picker kind={dialog.kind} close={() => modal(null)} />
      )}
      {dialog?.kind === "role" && (
        <Modal
          title="Рабочее пространство"
          description="Выберите роль для презентации."
          onClose={() => modal(null)}
        >
          <div className="picker-list">
            {ROLES.map((v, i) => (
              <button key={v} onClick={() => role(i)}>
                <span className="avatar small">
                  {principal(s, i)
                    .name.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <span>
                  {v}
                  <small>{principal(s, i).name}</small>
                </span>
                {r === i ? <Check size={17} /> : <ArrowRight size={15} />}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {dialog?.kind === "guide" && (
        <Modal
          title="Режим презентации"
          description="Данные вымышлены. Изменения и файлы сохраняются в этом браузере."
          onClose={() => {
            modal(null);
            setReset(false);
          }}
        >
          <div className="guide">
            <h3>Сценарии</h3>
            {[
              [
                "Согласование закупки",
                "Директор подписывает заявку, снабжение оформляет заказ.",
                "requests",
                "q0",
              ],
              [
                "Проверка работ",
                "Исполнитель сдаёт отчёт, управляющий проверяет результат.",
                "tasks",
                "t0",
              ],
              [
                "Оплата аренды",
                "Бухгалтер вносит платёж и погашает задолженность.",
                "ledger",
                "c0-0",
              ],
            ].map(([title, desc, v, key]) => (
              <button
                key={v}
                onClick={() => {
                  setR(0);
                  localStorage.setItem("atrium.role", "0");
                  go(v, key);
                }}
              >
                <span>
                  <b>{title}</b>
                  <small>{desc}</small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
            <button
              className="btn secondary"
              onClick={() => modal({ kind: "role" })}
            >
              <ShieldCheck size={16} /> Сменить роль
            </button>
            <div className="reset">
              <p>
                {reset
                  ? "Все изменения и загруженные документы этой презентации будут удалены из браузера."
                  : "Можно восстановить исходные данные перед следующим показом."}
              </p>
              <button
                className="btn secondary"
                onClick={() => {
                  if (!reset) {
                    setReset(true);
                    return;
                  }
                  const fresh = seed();
                  fresh.rev = (s.rev || 0) + 1;
                  localStorage.setItem(SEED_VERSION, JSON.stringify(fresh));
                  setS(fresh);
                  Promise.allSettled(
                    s.docs
                      .filter((x) => x.blob)
                      .map((x) => fileOp("delete", x.blob)),
                  );
                  setReset(false);
                  role(0);
                  toast("Исходные данные восстановлены");
                }}
              >
                <RotateCcw size={14} />
                {reset ? "Подтвердить сброс" : "Сбросить данные"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {msg && (
        <div role="status" className="toast">
          <Check size={16} />
          {msg}
        </div>
      )}
      {error && (
        <Modal
          title="Сохранение"
          description={error}
          onClose={() => setError("")}
        >
          <div className="modal-foot">
            <button className="btn primary" onClick={() => setError("")}>
              Понятно
            </button>
          </div>
        </Modal>
      )}
    </C.Provider>
  );
}
class Boundary extends React.Component {
  state = { bad: false };
  static getDerivedStateFromError() {
    return { bad: true };
  }
  render() {
    if (this.state.bad)
      return (
        <div className="fatal">
          <h1>Не удалось открыть рабочее пространство</h1>
          <p>
            Обновите страницу. Проверьте, что браузеру разрешено сохранять
            локальные данные.
          </p>
          <button onClick={() => location.reload()}>Обновить</button>
        </div>
      );
    return this.props.children;
  }
}
createRoot(document.getElementById("root")).render(
  <Boundary>
    <App />
  </Boundary>,
);
