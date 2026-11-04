import { AlertCircle, Leaf, Search, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { initials, personName, type Member } from "../domain/model";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Leaf size={24} />
      </span>
      <span>
        leaf<span className="brand-crm">CRM</span>
      </span>
    </span>
  );
}
export function Loading({ label = "Φόρτωση…" }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <Leaf size={24} />
      Leaf CRM · {label}
    </div>
  );
}
export function Empty({ label }: { label: string }) {
  return (
    <div className="empty">
      <Search size={25} />
      <p>{label}</p>
    </div>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <div className="error" role="alert">
      <AlertCircle size={17} />
      {message}
    </div>
  ) : null;
}
export function Badge({ value }: { value: string }) {
  const tone = ["Διαθέσιμο", "Εγκεκριμένο", "Ολοκληρώθηκε", "Ενεργή"].includes(
    value,
  )
    ? "green"
    : ["Υπό διαπραγμάτευση", "Προς έγκριση", "Υψηλή"].includes(value)
      ? "amber"
      : "gray";
  return <span className={`badge ${tone}`}>{value}</span>;
}
export function Person({
  members,
  id,
}: {
  members: Member[];
  id: string | null;
}) {
  const name = personName(members, id);
  return (
    <span className="person">
      <i>{initials(name)}</i>
      {name}
    </span>
  );
}
export function Gate({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="panel auth-panel">
        <Brand />
        <div className="locked">
          <ShieldCheck size={32} />
          <h1>{title}</h1>
          {children}
        </div>
      </section>
    </main>
  );
}
