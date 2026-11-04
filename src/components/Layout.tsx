import { useState, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  History,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  canManage,
  createLabels,
  initials,
  roleLabels,
  type Kind,
  type View,
  type Workspace,
} from "../domain/model";
import { Brand } from "./Common";

const navigation = [
  { id: "dashboard", label: "Επισκόπηση", icon: LayoutDashboard },
  { id: "property", label: "Ακίνητα", icon: Building2 },
  { id: "contact", label: "Επαφές", icon: Users },
  { id: "request", label: "Ζητήσεις", icon: Search },
  { id: "appointment", label: "Ραντεβού", icon: CalendarDays },
  { id: "task", label: "Εργασίες", icon: CheckCheck },
] as const;
const management = [
  { id: "team", label: "Ομάδα", icon: Users },
  { id: "history", label: "Ιστορικό", icon: History },
  { id: "settings", label: "Ρυθμίσεις", icon: Settings },
] as const;
const headings: Record<View, [string, string]> = {
  dashboard: [
    "Η μεγάλη εικόνα.",
    "Ακίνητα, άνθρωποι και επόμενες κινήσεις. Όλα σε έναν χώρο.",
  ],
  property: [
    "Το χαρτοφυλάκιό σας.",
    "Από την πρώτη ανάθεση μέχρι το κλείσιμο της συμφωνίας.",
  ],
  contact: [
    "Οι άνθρωποί σας.",
    "Ιδιοκτήτες, αγοραστές και ενοικιαστές, με συνδεδεμένο ιστορικό.",
  ],
  request: [
    "Κάθε αναζήτηση, μια ευκαιρία.",
    "Συνδέστε αυτό που ψάχνει ο πελάτης με το κατάλληλο ακίνητο.",
  ],
  appointment: [
    "Το επόμενο ραντεβού.",
    "Οργανώστε τις υποδείξεις και κρατήστε το αποτέλεσμα κάθε επίσκεψης.",
  ],
  task: [
    "Οι επόμενες κινήσεις.",
    "Αναθέσεις, προθεσμίες και follow-up της ομάδας.",
  ],
  team: ["Η ομάδα της Leaf.", "Ξεκάθαροι ρόλοι για μια ομάδα που μεγαλώνει."],
  history: [
    "Κάθε κίνηση μετράει.",
    "Ιστορικό δημιουργίας, ενημέρωσης και διαγραφής εγγραφών.",
  ],
  settings: ["Ο χώρος σας.", "Σύνδεση εταιρικής βάσης και εξαγωγή δεδομένων."],
};
export function Layout({
  data,
  view,
  onNavigate,
  onCreate,
  onSignOut,
  onRefresh,
  busy,
  children,
}: {
  data: Workspace;
  view: View;
  onNavigate: (view: View) => void;
  onCreate: (kind: Kind) => void;
  onSignOut: () => void;
  onRefresh: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const [mobile, setMobile] = useState(false);
  const pending = data.entries.filter(
    (entry) => entry.kind === "task" && entry.data.status !== "Ολοκληρώθηκε",
  ).length;
  const navigate = (next: View) => {
    onNavigate(next);
    setMobile(false);
  };
  const label =
    [...navigation, ...management].find((item) => item.id === view)?.label ||
    "Επισκόπηση";
  const creatingKind =
    view === "dashboard"
      ? "property"
      : navigation.some((item) => item.id === view)
        ? (view as Kind)
        : null;
  return (
    <div className="shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <a
          href="#"
          onClick={(event) => {
            event.preventDefault();
            navigate("dashboard");
          }}
          aria-label="Leaf CRM αρχική"
        >
          <Brand />
        </a>
        <div className="workspace">
          <span className="workspace-icon">L</span>
          <div>
            <strong>Leaf Properties</strong>
            <small>Εταιρικός χώρος εργασίας</small>
          </div>
          <ShieldCheck size={15} />
        </div>
        <div className="nav-caption">ΧΩΡΟΣ ΕΡΓΑΣΙΑΣ</div>
        <nav aria-label="Κύριο μενού">
          {navigation.map((item) => (
            <button
              className={view === item.id ? "active" : ""}
              key={item.id}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={19} />
              {item.label}
              {item.id === "task" && pending > 0 && (
                <span className="nav-count">{pending}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-caption manage-caption">ΔΙΑΧΕΙΡΙΣΗ</div>
        <nav aria-label="Διαχείριση">
          {management
            .filter((item) => item.id !== "history" || canManage(data.me))
            .map((item) => (
              <button
                className={view === item.id ? "active" : ""}
                key={item.id}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={19} />
                {item.label}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <Leaf size={20} />
            <strong>Κάθε ακίνητο, μια νέα αρχή.</strong>
            <p>Ο δικός σας χώρος για το επόμενο βήμα.</p>
          </div>
          <div className="profile">
            <span className="avatar">{initials(data.me.name)}</span>
            <div>
              <strong>{data.me.name}</strong>
              <small>{roleLabels[data.me.role]}</small>
            </div>
            <button aria-label="Αποσύνδεση" disabled={busy} onClick={onSignOut}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Κλείσιμο μενού"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-wrap">
        <header className="topbar">
          <button
            className="mobile-toggle"
            aria-label="Άνοιγμα μενού"
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            Leaf Properties
            <ChevronRight size={13} />
            <strong>{label}</strong>
          </div>
          <div className="top-right">
            <span className="top-date">
              {new Date().toLocaleDateString("el-GR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <span className="mode-pill live">
              <span />
              Εταιρικός χώρος
            </span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">LEAF PROPERTIES / WORKSPACE</div>
              <h1>{headings[view][0]}</h1>
              <p>{headings[view][1]}</p>
            </div>
            {creatingKind && (
              <button
                className="primary"
                aria-label={createLabels[creatingKind]}
                disabled={busy}
                onClick={() => onCreate(creatingKind)}
              >
                <Plus size={17} />
                {createLabels[creatingKind]}
              </button>
            )}
          </div>
          <div className="sync-notice">
            <span>Κοινή εταιρική βάση</span>
            <button disabled={busy} onClick={onRefresh}>
              <RefreshCw size={14} />
              Ανανέωση
            </button>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
