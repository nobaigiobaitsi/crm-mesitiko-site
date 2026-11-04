import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Clock,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  personName,
  recordTitle,
  today,
  type Entry,
  type Kind,
  type View,
  type Workspace,
} from "../domain/model";
import { PropertyTable } from "./PropertyTable";
import { TaskList } from "./TaskList";
import { Empty } from "./Common";

export function Dashboard({
  data,
  onNavigate,
  onOpen,
  onCreate,
  onToggleTask,
  busy,
}: {
  data: Workspace;
  onNavigate: (view: View) => void;
  onOpen: (entry: Entry) => void;
  onCreate: (kind: Kind) => void;
  onToggleTask: (entry: Entry) => void;
  busy: boolean;
}) {
  const properties = data.entries.filter((entry) => entry.kind === "property");
  const pending = data.entries
    .filter(
      (entry) => entry.kind === "task" && entry.data.status !== "Ολοκληρώθηκε",
    )
    .sort((a, b) => a.data.date.localeCompare(b.data.date));
  const appointments = data.entries
    .filter(
      (entry) =>
        entry.kind === "appointment" &&
        entry.data.status === "Προγραμματισμένο" &&
        entry.data.date >= today(),
    )
    .sort((a, b) =>
      (a.data.date + a.data.time).localeCompare(b.data.date + b.data.time),
    );
  const stats = [
    {
      label: "Ακίνητα στο χαρτοφυλάκιο",
      value: properties.length,
      sub: `${properties.filter((entry) => entry.data.status === "Διαθέσιμο").length} διαθέσιμα αυτή τη στιγμή`,
      icon: Building2,
      target: "property",
    },
    {
      label: "Ενεργές ζητήσεις",
      value: data.entries.filter(
        (entry) => entry.kind === "request" && entry.data.status === "Ενεργή",
      ).length,
      sub: "Οι αναζητήσεις των πελατών σας",
      icon: Search,
      target: "request",
    },
    {
      label: "Επόμενα ραντεβού",
      value: appointments.length,
      sub: "Προγραμματισμένες συναντήσεις",
      icon: CalendarDays,
      target: "appointment",
    },
    {
      label: "Ανοιχτές εργασίες",
      value: pending.length,
      sub: `${pending.filter((entry) => entry.data.date <= today()).length} χρειάζονται προσοχή σήμερα`,
      icon: CheckCheck,
      target: "task",
    },
  ] as const;
  return (
    <>
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <button
            className={`stat-card stat-${index}`}
            key={stat.target}
            onClick={() => onNavigate(stat.target)}
          >
            <div className="stat-top">
              <span>{stat.label}</span>
              <stat.icon size={19} />
            </div>
            <div className="stat-value">
              {stat.value}
              <ArrowUpRight size={21} />
            </div>
            <small>{stat.sub}</small>
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel agenda">
          <div className="panel-heading">
            <div>
              <h2>Στο πρόγραμμά σας</h2>
              <p>Οι επόμενες συναντήσεις της ομάδας</p>
            </div>
            <button
              className="text-btn"
              onClick={() => onNavigate("appointment")}
            >
              Όλα τα ραντεβού
              <ArrowRight size={15} />
            </button>
          </div>
          <div className="agenda-list">
            {appointments.slice(0, 3).map((entry, index) => (
              <button
                className="agenda-item"
                key={entry.id}
                onClick={() => onOpen(entry)}
              >
                <div className={`date-box date-${index}`}>
                  <strong>
                    {new Date(`${entry.data.date}T12:00:00`).getDate()}
                  </strong>
                  <span>
                    {new Date(`${entry.data.date}T12:00:00`).toLocaleDateString(
                      "el-GR",
                      { month: "short" },
                    )}
                  </span>
                </div>
                <div className="agenda-info">
                  <div className="agenda-time">
                    <Clock size={12} />
                    {entry.data.time}
                    <span>·</span>
                    {personName(data.members, entry.assigned_to)}
                  </div>
                  <strong>{entry.data.title}</strong>
                  <small>{recordTitle(data.entries, entry.data.contact)}</small>
                </div>
                <ChevronRight size={17} />
              </button>
            ))}
            {!appointments.length && (
              <Empty label="Δεν υπάρχουν επερχόμενα ραντεβού." />
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Επόμενες κινήσεις</h2>
              <p>Οι εκκρεμότητες της ομάδας</p>
            </div>
            <button
              className="icon-btn"
              aria-label="Νέα εργασία"
              onClick={() => onCreate("task")}
            >
              <Plus size={19} />
            </button>
          </div>
          <TaskList
            tasks={pending.slice(0, 3)}
            entries={data.entries}
            members={data.members}
            me={data.me}
            onOpen={onOpen}
            onToggle={onToggleTask}
            busy={busy}
          />
          <button
            className="panel-bottom-link"
            onClick={() => onNavigate("task")}
          >
            Προβολή όλων των εργασιών
            <ArrowRight size={15} />
          </button>
        </section>
      </div>
      <section className="panel properties-panel">
        <div className="panel-heading">
          <div>
            <h2>
              Το χαρτοφυλάκιο με μια ματιά
              <span className="count">{properties.length}</span>
            </h2>
            <p>Τα πιο πρόσφατα ακίνητα</p>
          </div>
          <button className="text-btn" onClick={() => onNavigate("property")}>
            Όλα τα ακίνητα
            <ArrowRight size={15} />
          </button>
        </div>
        <PropertyTable
          entries={properties.slice(0, 4)}
          members={data.members}
          onOpen={onOpen}
          compact
        />
      </section>
      <div className="bottom-note">
        <ShieldCheck size={14} />
        Εταιρικός χώρος εργασίας<span>·</span>Leaf Properties
      </div>
    </>
  );
}
