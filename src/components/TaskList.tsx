import { Check } from "lucide-react";
import {
  canEdit,
  dateText,
  personName,
  recordTitle,
  today,
  type Entry,
  type Member,
} from "../domain/model";
import { Empty } from "./Common";

export function TaskList({
  tasks,
  entries,
  members,
  me,
  onOpen,
  onToggle,
  busy,
}: {
  tasks: Entry[];
  entries: Entry[];
  members: Member[];
  me: Member;
  onOpen: (entry: Entry) => void;
  onToggle: (entry: Entry) => void;
  busy: boolean;
}) {
  return (
    <div className="task-list">
      {tasks.map((entry) => {
        const completed = entry.data.status === "Ολοκληρώθηκε";
        return (
          <div className={`task-row ${completed ? "done" : ""}`} key={entry.id}>
            <button
              aria-label={
                completed ? "Επαναφορά εργασίας" : "Ολοκλήρωση εργασίας"
              }
              className="checkbox"
              disabled={busy || !canEdit(me, entry)}
              onClick={() => onToggle(entry)}
            >
              {completed && <Check size={14} />}
            </button>
            <button className="task-title" onClick={() => onOpen(entry)}>
              <strong>{entry.data.title}</strong>
              <small>
                {entry.data.property
                  ? recordTitle(entries, entry.data.property)
                  : personName(members, entry.assigned_to)}
              </small>
            </button>
            {entry.data.priority === "Υψηλή" && (
              <span className="priority-dot" title="Υψηλή προτεραιότητα" />
            )}
            <span
              className={`due ${entry.data.date < today() && !completed ? "overdue" : ""}`}
            >
              {entry.data.date === today()
                ? "Σήμερα"
                : dateText(entry.data.date)}
            </span>
          </div>
        );
      })}
      {!tasks.length && (
        <Empty label="Δεν υπάρχουν εργασίες με αυτά τα κριτήρια." />
      )}
    </div>
  );
}
