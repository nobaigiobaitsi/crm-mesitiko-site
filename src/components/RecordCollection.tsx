import { useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Link2,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { fields } from "../domain/fields";
import {
  dateText,
  matches,
  money,
  normalizeText,
  recordTitle,
  type Entry,
  type Kind,
  type Workspace,
} from "../domain/model";
import { Badge, Empty, Person } from "./Common";
import { PropertyTable } from "./PropertyTable";
import { TaskList } from "./TaskList";

export function RecordCollection({
  kind,
  data,
  onOpen,
  onToggleTask,
  busy,
}: {
  kind: Kind;
  data: Workspace;
  onOpen: (entry: Entry) => void;
  onToggleTask: (entry: Entry) => void;
  busy: boolean;
}) {
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [assignee, setAssignee] = useState("");
  const filters =
    fields[kind].find(
      (field) => field.key === (kind === "contact" ? "type" : "status"),
    )?.options || [];
  const properties = data.entries.filter((entry) => entry.kind === "property");
  const entries = data.entries
    .filter((entry) => entry.kind === kind)
    .filter(
      (entry) =>
        !status || entry.data.status === status || entry.data.type === status,
    )
    .filter((entry) => !assignee || entry.assigned_to === assignee)
    .filter((entry) =>
      normalizeText(
        [
          entry.data.title,
          entry.data.area,
          entry.data.code,
          entry.data.email,
          entry.data.phone,
          recordTitle(data.entries, entry.data.contact),
        ].join(" "),
      ).includes(normalizeText(query)),
    );
  return (
    <>
      <div className="collection-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Αναζήτηση εγγραφών"
            placeholder={
              kind === "property"
                ? "Αναζήτηση τίτλου, κωδικού ή περιοχής…"
                : "Αναζήτηση…"
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              aria-label="Καθαρισμός αναζήτησης"
              onClick={() => setQuery("")}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <label className="filter">
          <SlidersHorizontal size={16} />
          <select
            aria-label="Φίλτρο κατάστασης"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Όλες οι καταστάσεις</option>
            {filters.map((filter) => (
              <option key={filter}>{filter}</option>
            ))}
          </select>
        </label>
        <label className="filter">
          <Users size={14} />
          <select
            aria-label="Φίλτρο υπευθύνου"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
          >
            <option value="">Όλοι οι υπεύθυνοι</option>
            {data.members
              .filter((member) => member.active)
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.id === data.me.id ? "Οι αναθέσεις μου" : member.name}
                </option>
              ))}
          </select>
        </label>
        <span className="result-count">{entries.length} εγγραφές</span>
      </div>
      {kind === "property" ? (
        <section className="panel">
          <PropertyTable
            entries={entries}
            members={data.members}
            onOpen={onOpen}
          />
        </section>
      ) : kind === "task" ? (
        <section className="panel">
          <TaskList
            tasks={entries}
            entries={data.entries}
            members={data.members}
            me={data.me}
            onOpen={onOpen}
            onToggle={onToggleTask}
            busy={busy}
          />
        </section>
      ) : (
        <div className="cards-grid">
          {entries.map((entry) => (
            <button
              className="record-card"
              key={entry.id}
              onClick={() => onOpen(entry)}
            >
              <div className="record-top">
                <span className="record-icon">
                  {kind === "contact" ? (
                    <Users size={21} />
                  ) : kind === "request" ? (
                    <Search size={21} />
                  ) : (
                    <CalendarDays size={21} />
                  )}
                </span>
                <Badge value={entry.data.status || entry.data.type} />
                <ChevronRight size={17} />
              </div>
              <h3>{entry.data.title}</h3>
              {kind === "contact" ? (
                <>
                  <p>{entry.data.email || "Χωρίς email"}</p>
                  <p>{entry.data.phone || "Χωρίς τηλέφωνο"}</p>
                  <div className="card-detail">
                    {
                      data.entries.filter(
                        (item) => item.data.contact === entry.id,
                      ).length
                    }{" "}
                    συνδεδεμένες εγγραφές
                  </div>
                </>
              ) : kind === "request" ? (
                <>
                  <p>
                    <MapPin size={14} />
                    {entry.data.area || "Όλες οι περιοχές"}
                    <span>·</span>
                    {entry.data.transaction}
                  </p>
                  <div className="budget">
                    έως<strong>{money(entry.data.budget)}</strong>
                    <small>από {entry.data.minsqm || "0"} τ.μ.</small>
                  </div>
                  <div className="card-detail">
                    <Link2 size={14} />
                    {matches(entry, properties).length} συμβατά ακίνητα
                    <span>·</span>
                    {recordTitle(data.entries, entry.data.contact)}
                  </div>
                </>
              ) : (
                <>
                  <p>
                    <Clock size={14} />
                    {dateText(entry.data.date)}
                    <span>·</span>
                    {entry.data.time}
                  </p>
                  <p>{recordTitle(data.entries, entry.data.property)}</p>
                  <div className="card-detail">
                    {recordTitle(data.entries, entry.data.contact)}
                  </div>
                </>
              )}
              <div className="card-person">
                <Person members={data.members} id={entry.assigned_to} />
              </div>
            </button>
          ))}
          {!entries.length && (
            <div className="panel full-width">
              <Empty label="Δεν βρέθηκαν εγγραφές. Δοκιμάστε άλλα φίλτρα ή προσθέστε μια νέα." />
            </div>
          )}
        </div>
      )}
    </>
  );
}
