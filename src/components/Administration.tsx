import { Download, History, RefreshCw, ShieldCheck } from "lucide-react";
import {
  canManage,
  initials,
  personName,
  roleLabels,
  today,
  type Workspace,
} from "../domain/model";
import { Badge, Empty } from "./Common";

export function Team({ data }: { data: Workspace }) {
  return (
    <>
      <div className="section-intro">
        <ShieldCheck size={20} />
        <p>
          Κάθε συνεργάτης έχει προσωπικό λογαριασμό. Οι μεσίτες έχουν πρόσβαση
          στις δικές τους αναθέσεις.
        </p>
      </div>
      <div className="cards-grid">
        {data.members.map((member) => (
          <div className="panel member-card" key={member.id}>
            <span className="large-avatar">{initials(member.name)}</span>
            <Badge value={member.active ? "Ενεργή" : "Ανενεργό"} />
            <h3>{member.name}</h3>
            <p>{roleLabels[member.role]}</p>
            <div className="member-permissions">
              {canManage(member)
                ? "Όλες οι εγγραφές, αναθέσεις και εσωτερικές εγκρίσεις"
                : "Προσωπικές αναθέσεις και ενημερώσεις"}
            </div>
          </div>
        ))}
      </div>
      <div className="panel setup-note">
        <h3>Προσθήκη συνεργατών</h3>
        <p>
          Για πρόσκληση νέου μέλους ή αλλαγή πρόσβασης, επικοινωνήστε με τον
          τεχνικό διαχειριστή.
        </p>
      </div>
    </>
  );
}
export function ChangeHistory({ data }: { data: Workspace }) {
  const actions = {
    INSERT: "Δημιουργία",
    UPDATE: "Ενημέρωση",
    DELETE: "Διαγραφή",
  };
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Ιστορικό αλλαγών</h2>
          <p>Οι τελευταίες 100 αλλαγές εγγραφών.</p>
        </div>
      </div>
      {data.history.map((entry) => (
        <div key={entry.id} className="history-row">
          <span className="record-icon">
            <History size={18} />
          </span>
          <div>
            <strong>{entry.title}</strong>
            <small>
              {actions[entry.action]} ·{" "}
              {personName(data.members, entry.actor_id)}
            </small>
          </div>
          <time>{new Date(entry.created_at).toLocaleString("el-GR")}</time>
        </div>
      ))}
      {!data.history.length && (
        <Empty label="Δεν υπάρχουν καταγεγραμμένες αλλαγές." />
      )}
    </section>
  );
}
export function Settings({
  data,
  onRefresh,
  busy,
}: {
  data: Workspace;
  onRefresh: () => void;
  busy: boolean;
}) {
  function exportRecords() {
    const { me, entries, members, history } = data;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            exported_at: new Date().toISOString(),
            exported_by: me.id,
            entries,
            members,
            history,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leaf-crm-${today()}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="panel-heading">
          <h2>
            <ShieldCheck size={19} />
            Εταιρική βάση
          </h2>
        </div>
        <div className="settings-content connected">
          <ShieldCheck size={30} />
          <h3>Σύνδεση ενεργή</h3>
          <p>
            {data.me.name} · {roleLabels[data.me.role]}
          </p>
          <p>Οι εγγραφές αποθηκεύονται στην κοινή βάση της Leaf Properties.</p>
          <button className="secondary" disabled={busy} onClick={onRefresh}>
            <RefreshCw size={15} />
            Ανανέωση δεδομένων
          </button>
        </div>
      </section>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <h2>
            <Download size={19} />
            Εξαγωγή δεδομένων
          </h2>
        </div>
        <div className="settings-content">
          <p>
            Λήψη των εγγραφών που έχετε δικαίωμα να βλέπετε και του πρόσφατου
            ιστορικού. Οι φωτογραφίες δεν περιλαμβάνονται. Η εξαγωγή δεν
            αντικαθιστά το πλήρες backup της βάσης.
          </p>
          <button className="secondary" onClick={exportRecords}>
            <Download size={16} />
            Εξαγωγή JSON
          </button>
        </div>
      </section>
    </div>
  );
}
