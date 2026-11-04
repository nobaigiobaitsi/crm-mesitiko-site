import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  canEdit,
  canManage,
  type Entry,
  type Kind,
  type View,
  type Workspace,
} from "../domain/model";
import { createEntry } from "../domain/records";
import type { CrmRepository } from "../services/crm";
import type { PhotoRepository } from "../services/photos";
import { Layout } from "./Layout";
import { ErrorNotice } from "./Common";
import { Dashboard } from "./Dashboard";
import { RecordCollection } from "./RecordCollection";
import { RecordDrawer } from "./RecordDrawer";
import { ChangeHistory, Settings, Team } from "./Administration";

interface Props {
  data: Workspace;
  repository: CrmRepository;
  photoRepository: PhotoRepository;
  refreshing: boolean;
  refreshError: string;
  onRefresh: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSaved: (entry: Entry) => void;
  onRemoved: (id: string) => void;
}
export function CrmApp({
  data,
  repository,
  photoRepository,
  refreshing,
  refreshError,
  onRefresh,
  onSignOut,
  onSaved,
  onRemoved,
}: Props) {
  const [view, setView] = useState<View>("dashboard"),
    [selected, setSelected] = useState<{ entry: Entry; isNew: boolean } | null>(
      null,
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);
  function open(entry: Entry) {
    setSelected({ entry, isNew: false });
    setError("");
  }
  function create(kind: Kind) {
    setSelected({ entry: createEntry(kind, data.me), isNew: true });
    setError("");
  }
  async function save(entry: Entry, exists: boolean) {
    if (!canEdit(data.me, entry))
      throw new Error("Δεν επιτρέπεται η αλλαγή αυτής της εγγραφής.");
    setBusy(true);
    try {
      const saved = await repository.save(entry, exists);
      onSaved(saved);
      setSelected({ entry: saved, isNew: false });
      setToast("Η εγγραφή αποθηκεύτηκε.");
      void onRefresh();
    } finally {
      setBusy(false);
    }
  }
  async function remove(entry: Entry) {
    if (!canManage(data.me)) throw new Error("Δεν επιτρέπεται η διαγραφή.");
    setBusy(true);
    try {
      await repository.remove(entry);
      onRemoved(entry.id);
      setSelected(null);
      setToast("Η εγγραφή διαγράφηκε.");
      void onRefresh();
    } finally {
      setBusy(false);
    }
  }
  async function toggleTask(entry: Entry) {
    if (!canEdit(data.me, entry)) return;
    setBusy(true);
    setError("");
    try {
      const saved = await repository.save(
        {
          ...entry,
          data: {
            ...entry.data,
            status:
              entry.data.status === "Ολοκληρώθηκε" ? "Ανοιχτή" : "Ολοκληρώθηκε",
          },
        },
        true,
      );
      onSaved(saved);
      void onRefresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await onSignOut();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const kind = [
    "property",
    "contact",
    "request",
    "appointment",
    "task",
  ].includes(view)
    ? (view as Kind)
    : null;
  return (
    <>
      <Layout
        data={data}
        view={view}
        onNavigate={(next) => {
          setView(next);
          setError("");
        }}
        onCreate={create}
        onSignOut={() => void signOut()}
        onRefresh={() => void onRefresh()}
        busy={busy || refreshing}
      >
        <ErrorNotice message={error || refreshError} />
        {view === "dashboard" && (
          <Dashboard
            data={data}
            onNavigate={setView}
            onOpen={open}
            onCreate={create}
            onToggleTask={(entry) => void toggleTask(entry)}
            busy={busy}
          />
        )}
        {kind && (
          <RecordCollection
            key={kind}
            kind={kind}
            data={data}
            onOpen={open}
            onToggleTask={(entry) => void toggleTask(entry)}
            busy={busy}
          />
        )}
        {view === "team" && <Team data={data} />}
        {view === "history" && canManage(data.me) && (
          <ChangeHistory data={data} />
        )}
        {view === "settings" && (
          <Settings
            data={data}
            onRefresh={() => void onRefresh()}
            busy={busy || refreshing}
          />
        )}
      </Layout>
      {selected && (
        <RecordDrawer
          key={`${selected.entry.id}:${selected.entry.updated_at}`}
          entry={selected.entry}
          isNew={selected.isNew}
          data={data}
          photoRepository={photoRepository}
          busy={busy}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
          onOpen={open}
          onSave={save}
          onRemove={remove}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </>
  );
}
