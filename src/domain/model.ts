export type Kind = "property" | "contact" | "request" | "appointment" | "task";
export type Role = "owner" | "technical" | "agent";
export type View = "dashboard" | Kind | "team" | "settings" | "history";
export type RecordData = { title: string; [key: string]: string };

export interface Entry {
  id: string;
  kind: Kind;
  data: RecordData;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}
export interface Member {
  id: string;
  name: string;
  role: Role;
  active: boolean;
}
export interface AuditEntry {
  id: number;
  record_id: string;
  actor_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  title: string;
  created_at: string;
}
export interface Workspace {
  entries: Entry[];
  members: Member[];
  me: Member;
  history: AuditEntry[];
}
export interface Photo {
  id: string;
  property_id: string;
  path: string;
  caption: string;
  created_at: string;
  url?: string;
}

export const labels: Record<Kind, string> = {
  property: "Ακίνητο",
  contact: "Επαφή",
  request: "Ζήτηση",
  appointment: "Ραντεβού",
  task: "Εργασία",
};
export const createLabels: Record<Kind, string> = {
  property: "Νέο ακίνητο",
  contact: "Νέα επαφή",
  request: "Νέα ζήτηση",
  appointment: "Νέο ραντεβού",
  task: "Νέα εργασία",
};
export const roleLabels: Record<Role, string> = {
  owner: "Ιδιοκτήτης",
  technical: "Tech lead / Διαχειριστής",
  agent: "Μεσίτης",
};
export const canManage = (member: Member) =>
  member.active && member.role !== "agent";
export const canEdit = (member: Member, entry: Entry) =>
  member.active && (canManage(member) || entry.assigned_to === member.id);

export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export const money = (value: string = "") =>
  new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
export const dateText = (value: string) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("el-GR", {
        day: "numeric",
        month: "short",
      })
    : "Χωρίς ημερομηνία";
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("");
export const personName = (members: Member[], id: string | null) =>
  members.find((member) => member.id === id)?.name || "Χωρίς υπεύθυνο";
export const recordTitle = (entries: Entry[], id?: string) =>
  entries.find((entry) => entry.id === id)?.data.title || "—";
export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("el-GR");

function numeric(value?: string) {
  return value?.trim() && Number.isFinite(Number(value)) ? Number(value) : null;
}
export function matches(request: Entry, properties: Entry[]) {
  const budget = numeric(request.data.budget),
    minArea = numeric(request.data.minsqm),
    minBeds = numeric(request.data.minbeds);
  return properties.filter((property) => {
    const price = numeric(property.data.price),
      area = numeric(property.data.sqm),
      beds = numeric(property.data.beds);
    return (
      property.kind === "property" &&
      property.data.status === "Διαθέσιμο" &&
      property.data.transaction === request.data.transaction &&
      (!request.data.area ||
        normalizeText(property.data.area || "").includes(
          normalizeText(request.data.area),
        )) &&
      (budget === null || (price !== null && price <= budget)) &&
      (minArea === null || (area !== null && area >= minArea)) &&
      (minBeds === null || (beds !== null && beds >= minBeds))
    );
  });
}
