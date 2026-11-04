-- Run once in a NEW Supabase project's SQL editor. Invite users via Authentication first.
begin;
create table public.crm_members (
 id uuid primary key references auth.users(id), name text not null,
 role text not null check(role in ('owner','agent','technical')), active boolean not null default true
);
create table public.crm_records (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('property','contact','request','appointment','task')),
 data jsonb not null check(jsonb_typeof(data)='object' and length(trim(data->>'title'))>0),
 assigned_to uuid references public.crm_members(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index crm_property_code on public.crm_records(lower(trim(data->>'code'))) where kind='property';
create index on public.crm_records(kind);
create index on public.crm_records(assigned_to);
create table public.crm_audit (
 id bigint generated always as identity primary key, record_id uuid not null,
 actor_id uuid references auth.users(id), action text not null, title text not null,
 created_at timestamptz not null default now()
);
create function public.crm_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.crm_members where id=(select auth.uid()) and active=true
$$;
revoke all on function public.crm_role() from public;
grant execute on function public.crm_role() to authenticated;
alter table public.crm_members enable row level security;
alter table public.crm_records enable row level security;
alter table public.crm_audit enable row level security;
create policy member_directory on public.crm_members for select to authenticated using(public.crm_role() is not null);
create policy record_read on public.crm_records for select to authenticated using(public.crm_role()='owner' or (public.crm_role()='agent' and assigned_to=(select auth.uid())));
create policy record_insert on public.crm_records for insert to authenticated with check(public.crm_role()='owner' or (public.crm_role()='agent' and assigned_to=(select auth.uid())));
create policy record_update on public.crm_records for update to authenticated using(public.crm_role()='owner' or (public.crm_role()='agent' and assigned_to=(select auth.uid()))) with check(public.crm_role()='owner' or (public.crm_role()='agent' and assigned_to=(select auth.uid())));
create policy record_delete on public.crm_records for delete to authenticated using(public.crm_role()='owner');
create policy audit_read on public.crm_audit for select to authenticated using(public.crm_role()='owner');
revoke all on public.crm_members,public.crm_records,public.crm_audit from anon,authenticated;
grant select on public.crm_members,public.crm_audit to authenticated;
grant select,insert,update,delete on public.crm_records to authenticated;
create function public.crm_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare ref_key text; ref_kind text; ref_id text;
begin
 if TG_OP='DELETE' then
  if exists(select 1 from public.crm_records r where r.id<>old.id and (r.data->>'contact'=old.id::text or r.data->>'property'=old.id::text)) then raise exception 'Η εγγραφή χρησιμοποιείται σε άλλες εγγραφές. Αφαίρεσε πρώτα τις συνδέσεις.'; end if;
  return old;
 end if;
 if coalesce(trim(new.data->>'title'),'')='' then raise exception 'Ο τίτλος είναι υποχρεωτικός.'; end if;
 if new.kind='property' and (coalesce(trim(new.data->>'code'),'')='' or coalesce(trim(new.data->>'area'),'')='') then raise exception 'Συμπληρώστε κωδικό και περιοχή.'; end if;
 if new.kind='property' and ((new.data->>'price')::numeric<0 or (new.data->>'sqm')::numeric<0 or new.data->>'price' is null or new.data->>'sqm' is null) then raise exception 'Μη έγκυρη τιμή ή εμβαδόν.'; end if;
 if new.assigned_to is null or not exists(select 1 from public.crm_members where id=new.assigned_to and active and role in ('owner','agent')) then raise exception 'Απαιτείται ενεργός υπεύθυνος.'; end if;
 if TG_OP='UPDATE' and (new.id<>old.id or new.kind<>old.kind or new.created_at<>old.created_at) then raise exception 'Μη επιτρεπτή αλλαγή.'; end if;
 if public.crm_role()='agent' and new.kind='property' then
  if TG_OP='INSERT' and coalesce(new.data->>'publication','Πρόχειρο')<>'Πρόχειρο' then raise exception 'Η έγκριση απαιτεί ιδιοκτήτη.'; end if;
  if TG_OP='UPDATE' then
   if old.data->>'publication'='Εγκεκριμένο' then new.data=jsonb_set(new.data,'{publication}','"Προς έγκριση"');
   elsif new.data->>'publication'='Εγκεκριμένο' then raise exception 'Η έγκριση απαιτεί ιδιοκτήτη.'; end if;
  end if;
 end if;
 foreach ref_key in array array['contact','property'] loop
  ref_id=new.data->>ref_key;
  ref_kind=case when ref_key='contact' then 'contact' else 'property' end;
  if ref_id is not null and ref_id<>'' and not exists(select 1 from public.crm_records r where r.id::text=ref_id and r.kind=ref_kind and (public.crm_role()='owner' or r.assigned_to=auth.uid())) then raise exception 'Μη έγκυρη ή μη προσβάσιμη σύνδεση.'; end if;
 end loop;
 new.updated_at=now();return new;
end $$;
create trigger crm_guard before insert or update or delete on public.crm_records for each row execute function public.crm_guard();
create function public.crm_log() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.crm_audit(record_id,actor_id,action,title) values(coalesce(new.id,old.id),auth.uid(),TG_OP,coalesce(new.data->>'title',old.data->>'title'));
 return coalesce(new,old);
end $$;
create trigger crm_log after insert or update or delete on public.crm_records for each row execute function public.crm_log();
revoke all on function public.crm_guard(),public.crm_log() from public;
commit;
-- Repeat for each invited user, replacing the UUID with Authentication > Users > User UID:
-- insert into public.crm_members(id,name,role) values ('USER_UUID','Ιδιοκτήτης Α','owner');
-- insert into public.crm_members(id,name,role) values ('USER_UUID','Ιδιοκτήτης Β','owner');
-- insert into public.crm_members(id,name,role) values ('USER_UUID','Σταύρος','technical');
-- Migration 002 extends the technical role to full CRM access.
-- Add an agent using role='agent'; assign their records as owner. There is NO public signup.
-- Approval is an INTERNAL workflow only. No public listing endpoint or site sync is enabled.
