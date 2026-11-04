import { fields } from "./fields.ts";
import {
  today,
  type Entry,
  type Kind,
  type Member,
  type RecordData,
} from "./model.ts";

export function createEntry(kind: Kind, member: Member): Entry {
  const data: RecordData = { title: "" };
  for (const field of fields[kind])
    if (field.options) data[field.key] = field.options[0];
  if (kind === "task" || kind === "appointment") data.date = today();
  if (kind === "appointment") data.time = "10:00";
  if (kind === "property")
    data.code = `LF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    kind,
    data,
    assigned_to: member.id,
    created_at: now,
    updated_at: now,
  };
}
export function validateEntry(entry: Entry, records: Entry[]) {
  for (const field of fields[entry.kind]) {
    const value = entry.data[field.key]?.trim() || "";
    if (field.required && !value)
      throw new Error(`Συμπληρώστε: ${field.label}.`);
    if (
      value &&
      field.type === "number" &&
      (!/^\d+(\.\d{1,2})?$/.test(value) || value.length > 15)
    )
      throw new Error(`Μη έγκυρη τιμή: ${field.label}.`);
    if (value && field.type === "url") {
      try {
        if (new URL(value).protocol !== "https:") throw new Error();
      } catch {
        throw new Error("Η φωτογραφία χρειάζεται έγκυρο HTTPS URL.");
      }
    }
  }
  if (!entry.assigned_to) throw new Error("Επιλέξτε υπεύθυνο.");
  if (
    entry.kind === "property" &&
    records.some(
      (record) =>
        record.kind === "property" &&
        record.id !== entry.id &&
        record.data.code?.trim().toLocaleLowerCase() ===
          entry.data.code?.trim().toLocaleLowerCase(),
    )
  ) {
    throw new Error("Ο κωδικός ακινήτου χρησιμοποιείται ήδη.");
  }
}
