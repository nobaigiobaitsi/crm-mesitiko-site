import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  Link2,
  NotebookPen,
  Trash2,
  X,
} from "lucide-react";
import { fields } from "../domain/fields";
import {
  canEdit,
  canManage,
  createLabels,
  labels,
  matches,
  money,
  personName,
  recordTitle,
  type Entry,
  type Workspace,
} from "../domain/model";
import { validateEntry } from "../domain/records";
import type { PhotoRepository } from "../services/photos";
import { Badge, ErrorNotice } from "./Common";
import { PropertyGallery } from "./PropertyGallery";

export function RecordDrawer({
  entry,
  isNew,
  data,
  photoRepository,
  busy,
  onClose,
  onOpen,
  onSave,
  onRemove,
}: {
  entry: Entry;
  isNew: boolean;
  data: Workspace;
  photoRepository: PhotoRepository;
  busy: boolean;
  onClose: () => void;
  onOpen: (entry: Entry) => void;
  onSave: (entry: Entry, exists: boolean) => Promise<void>;
  onRemove: (entry: Entry) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState(isNew),
    [draft, setDraft] = useState(entry.data),
    [assigned, setAssigned] = useState(entry.assigned_to || ""),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  const manager = canManage(data.me),
    writable = canEdit(data.me, entry);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const updated = {
      ...entry,
      data: {
        ...draft,
        title: draft.title.trim(),
        ...(entry.kind === "property" ? { code: draft.code.trim() } : {}),
      },
      assigned_to: assigned,
    };
    try {
      validateEntry(updated, data.entries);
      await onSave(updated, !isNew);
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function remove() {
    setError("");
    try {
      if (
        data.entries.some(
          (item) =>
            item.id !== entry.id &&
            (item.data.contact === entry.id || item.data.property === entry.id),
        )
      )
        throw new Error(
          "Η εγγραφή χρησιμοποιείται αλλού. Αφαιρέστε πρώτα τις συνδέσεις.",
        );
      if (
        entry.kind === "property" &&
        (await photoRepository.list(entry.id)).length
      )
        throw new Error("Διαγράψτε πρώτα τις φωτογραφίες του ακινήτου.");
      await onRemove(entry);
    } catch (error) {
      setError((error as Error).message);
    }
  }
  const properties = data.entries.filter((item) => item.kind === "property");
  const linked = data.entries.filter(
    (item) => item.data.contact === entry.id || item.data.property === entry.id,
  );
  return (
    <dialog
      ref={dialog}
      className="drawer-modal"
      aria-labelledby="drawer-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section className="drawer">
        <div className="drawer-top">
          <span className="eyebrow">
            {isNew
              ? "ΝΕΑ ΕΓΓΡΑΦΗ"
              : labels[entry.kind].toLocaleUpperCase("el-GR")}
          </span>
          <button
            className="icon-btn"
            aria-label="Κλείσιμο λεπτομερειών"
            onClick={onClose}
            disabled={busy}
          >
            <X size={21} />
          </button>
        </div>
        <h2 id="drawer-title">
          {isNew ? createLabels[entry.kind] : entry.data.title}
        </h2>
        <ErrorNotice message={error} />
        {editing ? (
          <form onSubmit={submit}>
            <fieldset disabled={busy} className="form-grid drawer-fields">
              {fields[entry.kind].map((field) => (
                <label
                  className={
                    ["title", "address"].includes(field.key) ? "wide" : ""
                  }
                  key={field.key}
                >
                  {field.label}
                  {field.required && " *"}
                  {field.options ? (
                    <select
                      value={draft[field.key] || field.options[0]}
                      onChange={(event) =>
                        setDraft({ ...draft, [field.key]: event.target.value })
                      }
                    >
                      {field.options
                        .filter(
                          (option) =>
                            !(
                              data.me.role === "agent" &&
                              field.key === "publication" &&
                              option === "Εγκεκριμένο" &&
                              entry.data.publication !== "Εγκεκριμένο"
                            ),
                        )
                        .map((option) => (
                          <option
                            key={option}
                            disabled={
                              data.me.role === "agent" &&
                              field.key === "publication" &&
                              option === "Εγκεκριμένο"
                            }
                          >
                            {option}
                          </option>
                        ))}
                    </select>
                  ) : field.type === "contact" || field.type === "property" ? (
                    <select
                      required={field.required}
                      value={draft[field.key] || ""}
                      onChange={(event) =>
                        setDraft({ ...draft, [field.key]: event.target.value })
                      }
                    >
                      <option value="">Επιλέξτε…</option>
                      {data.entries
                        .filter((item) => item.kind === field.type)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.data.title}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      min={field.type === "number" ? "0" : undefined}
                      step={field.type === "number" ? "0.01" : undefined}
                      maxLength={500}
                      required={field.required}
                      value={draft[field.key] || ""}
                      onChange={(event) =>
                        setDraft({ ...draft, [field.key]: event.target.value })
                      }
                    />
                  )}
                </label>
              ))}
              <label className="wide">
                Υπεύθυνος
                <select
                  required
                  disabled={!manager}
                  value={assigned}
                  onChange={(event) => setAssigned(event.target.value)}
                >
                  <option value="">Επιλέξτε…</option>
                  {data.members
                    .filter((member) => member.active)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="wide">
                Εσωτερικές σημειώσεις
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={draft.notes || ""}
                  onChange={(event) =>
                    setDraft({ ...draft, notes: event.target.value })
                  }
                />
              </label>
            </fieldset>
            <div className="drawer-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => (isNew ? onClose() : setEditing(false))}
              >
                Ακύρωση
              </button>
              <button className="primary" disabled={busy} type="submit">
                <Check size={16} />
                {busy ? "Αποθήκευση…" : "Αποθήκευση"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="detail-status">
              <Badge value={entry.data.status || entry.data.type} />
              {entry.kind === "property" && (
                <Badge value={entry.data.publication} />
              )}
            </div>
            {entry.kind === "property" && (
              <div className="property-summary">
                <Building2 size={42} />
                <div>
                  <strong>{money(entry.data.price)}</strong>
                  <span>
                    {entry.data.sqm} τ.μ. · {entry.data.area} ·{" "}
                    {entry.data.transaction}
                  </span>
                </div>
              </div>
            )}
            <dl className="details-list">
              {fields[entry.kind]
                .filter((field) => field.key !== "title")
                .map((field) => (
                  <div key={field.key}>
                    <dt>{field.label}</dt>
                    <dd>
                      {["contact", "property"].includes(field.type || "") &&
                      entry.data[field.key] ? (
                        <button
                          className="inline-link"
                          onClick={() => {
                            const record = data.entries.find(
                              (item) => item.id === entry.data[field.key],
                            );
                            if (record) onOpen(record);
                          }}
                        >
                          {recordTitle(data.entries, entry.data[field.key])}
                          <ArrowUpRight size={13} />
                        </button>
                      ) : field.key === "email" && entry.data.email ? (
                        <a href={`mailto:${entry.data.email}`}>
                          {entry.data.email}
                        </a>
                      ) : field.key === "phone" && entry.data.phone ? (
                        <a href={`tel:${entry.data.phone}`}>
                          {entry.data.phone}
                        </a>
                      ) : field.key === "price" || field.key === "budget" ? (
                        money(entry.data[field.key])
                      ) : (
                        entry.data[field.key] || "—"
                      )}
                    </dd>
                  </div>
                ))}
              <div>
                <dt>Υπεύθυνος</dt>
                <dd>{personName(data.members, entry.assigned_to)}</dd>
              </div>
            </dl>
            <div className="notes-block">
              <h3>
                <NotebookPen size={16} />
                Εσωτερικές σημειώσεις
              </h3>
              <p>{entry.data.notes || "Δεν υπάρχουν σημειώσεις."}</p>
            </div>
            {entry.kind === "property" && (
              <PropertyGallery
                propertyId={entry.id}
                repository={photoRepository}
                canWrite={writable}
                canDelete={manager}
              />
            )}
            {entry.kind === "request" && (
              <div className="linked-section">
                <h3>
                  Συμβατά ακίνητα
                  <span className="count">
                    {matches(entry, properties).length}
                  </span>
                </h3>
                <p className="field-hint">
                  Ταύτιση περιοχής, συναλλαγής, budget, εμβαδού και
                  υπνοδωματίων.
                </p>
                {matches(entry, properties).map((item) => (
                  <button
                    className="linked-row"
                    key={item.id}
                    onClick={() => onOpen(item)}
                  >
                    <Building2 size={18} />
                    <span>
                      {item.data.title}
                      <small>
                        {money(item.data.price)} · {item.data.sqm} τ.μ.
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
                {!matches(entry, properties).length && (
                  <p className="muted">
                    Δεν βρέθηκε συμβατό διαθέσιμο ακίνητο.
                  </p>
                )}
              </div>
            )}
            {["property", "contact"].includes(entry.kind) && (
              <div className="linked-section">
                <h3>Συνδεδεμένες εγγραφές</h3>
                {linked.map((item) => (
                  <button
                    className="linked-row"
                    key={item.id}
                    onClick={() => onOpen(item)}
                  >
                    <Link2 size={16} />
                    <span>
                      {item.data.title}
                      <small>{labels[item.kind]}</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
                {!linked.length && (
                  <p className="muted">Δεν υπάρχουν συνδέσεις ακόμη.</p>
                )}
              </div>
            )}
            <div className="drawer-actions">
              {manager && (
                <button
                  className="icon-btn delete"
                  aria-label="Διαγραφή εγγραφής"
                  disabled={busy}
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 size={18} />
                </button>
              )}
              {writable && (
                <button className="primary" onClick={() => setEditing(true)}>
                  <NotebookPen size={16} />
                  Επεξεργασία
                </button>
              )}
            </div>
            {confirm && (
              <div className="confirm-box">
                <strong>Οριστική διαγραφή εγγραφής;</strong>
                <p>Αυτή η ενέργεια δεν αναιρείται.</p>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  Διαγραφή
                </button>
                <button
                  className="text-btn"
                  disabled={busy}
                  onClick={() => setConfirm(false)}
                >
                  Ακύρωση
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </dialog>
  );
}
