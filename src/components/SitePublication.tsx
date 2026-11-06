import { useEffect, useState } from "react";
import type { Entry } from "../domain/model";
import { supabase } from "../lib/supabase";
import { ErrorNotice } from "./Common";
type Status = {
  revision: string;
  deployed_revision: string;
  state: string;
  dispatch_error?: string;
  listings?: { property_id: string; revision: string }[];
};
export function SitePublication({ entry }: { entry: Entry }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function action(action: string) {
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await supabase.functions.invoke("publish-site", {
        body: { action, property_id: entry.id },
      });
      if (error) {
        let message = error.message;
        try {
          const body = await error.context?.json();
          message = body?.error || message;
        } catch {
          /* network failure */
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      if (action === "status") setStatus(data);
      else {
        const check = await supabase.functions.invoke("publish-site", {
          body: { action: "status", property_id: entry.id },
        });
        if (check.error)
          throw new Error(
            "Το αίτημα καταχωρίστηκε, αλλά ο έλεγχος κατάστασης απέτυχε. Πατήστε Έλεγχος κατάστασης.",
          );
        setStatus(check.data);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void action("status");
  }, [entry.id]);
  const included = status?.listings?.some(
    (item) => item.property_id === entry.id,
  );
  const labels: Record<string, string> = {
    published: "Το site έχει ενημερωθεί",
    pending: "Αναμονή επιβεβαίωσης δημοσίευσης",
    failed: "Η ενημέρωση απέτυχε",
    not_configured: "Απαιτείται ρύθμιση της σύνδεσης",
  };
  return (
    <section className="linked-section">
      <h3>Δημοσίευση στο site</h3>
      <p>
        Αποθηκεύστε πρώτα τις αλλαγές. Η δημοσίευση περιλαμβάνει τα δημόσια
        στοιχεία και τις φωτογραφίες. Η απόσυρση ολοκληρώνεται όταν ενημερωθεί
        το site.
      </p>
      <ErrorNotice message={error || status?.dispatch_error || ""} />
      {status && (
        <p role="status">
          {labels[status.state] || status.state} ·{" "}
          {included
            ? "Το ακίνητο περιλαμβάνεται στην επόμενη έκδοση."
            : "Το ακίνητο δεν περιλαμβάνεται στην επόμενη έκδοση."}
        </p>
      )}
      <div className="drawer-actions">
        <button
          className="primary"
          type="button"
          disabled={busy || entry.data.publication !== "Εγκεκριμένο"}
          onClick={() => void action("publish")}
        >
          {busy ? "Παρακαλώ περιμένετε…" : "Δημοσίευση / ενημέρωση"}
        </button>
        <button
          className="secondary"
          type="button"
          disabled={busy}
          onClick={() => void action("withdraw")}
        >
          Απόσυρση
        </button>
        <button
          className="text-btn"
          type="button"
          disabled={busy}
          onClick={() => void action("status")}
        >
          Έλεγχος κατάστασης
        </button>
        <button
          className="text-btn"
          type="button"
          disabled={busy}
          onClick={() => void action("retry")}
        >
          Επανάληψη ενημέρωσης site
        </button>
      </div>
      {entry.data.publication !== "Εγκεκριμένο" && (
        <p className="field-hint">
          Απαιτείται εσωτερική έγκριση για δημοσίευση.
        </p>
      )}
    </section>
  );
}
