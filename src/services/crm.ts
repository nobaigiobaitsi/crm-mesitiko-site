import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditEntry, Entry, Member, Workspace } from "../domain/model";

export class AccessDeniedError extends Error {}
const conflictMessage =
  "Η εγγραφή άλλαξε από συνεργάτη ή δεν είναι διαθέσιμη. Κλείστε την, πατήστε Ανανέωση και ανοίξτε την ξανά.";

export function createCrmRepository(client: SupabaseClient) {
  async function records(): Promise<Entry[]> {
    const entries: Entry[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client
        .from("crm_records")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + 499);
      if (error) throw error;
      entries.push(...(data as Entry[]));
      if (data.length < 500) return entries;
    }
  }
  async function members(): Promise<Member[]> {
    const result: Member[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client
        .from("crm_members")
        .select("*")
        .order("id")
        .range(offset, offset + 499);
      if (error) throw error;
      result.push(...(data as Member[]));
      if (data.length < 500) return result;
    }
  }
  return {
    async load(userId: string): Promise<Workspace> {
      const [entries, team, audit] = await Promise.all([
        records(),
        members(),
        client
          .from("crm_audit")
          .select("*")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(100),
      ]);
      if (audit.error) throw audit.error;
      const me = team.find((member) => member.id === userId && member.active);
      if (!me)
        throw new AccessDeniedError(
          "Ο λογαριασμός σας δεν έχει ενεργή πρόσβαση στο CRM. Επικοινωνήστε με τον διαχειριστή.",
        );
      return {
        entries,
        members: team,
        me,
        history: audit.data as AuditEntry[],
      };
    },
    async save(entry: Entry, exists: boolean): Promise<Entry> {
      const payload = {
        kind: entry.kind,
        data: entry.data,
        assigned_to: entry.assigned_to,
      };
      const query = exists
        ? client
            .from("crm_records")
            .update(payload)
            .eq("id", entry.id)
            .eq("updated_at", entry.updated_at)
        : client.from("crm_records").insert({ id: entry.id, ...payload });
      const { data, error } = await query.select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(conflictMessage);
      return data as Entry;
    },
    async remove(entry: Entry) {
      const { data, error } = await client
        .from("crm_records")
        .delete()
        .eq("id", entry.id)
        .eq("updated_at", entry.updated_at)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error(conflictMessage);
    },
  };
}
export type CrmRepository = ReturnType<typeof createCrmRepository>;
