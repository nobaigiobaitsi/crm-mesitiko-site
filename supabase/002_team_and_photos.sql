-- Apply AFTER 001_crm.sql. This migration grants the technical lead full CRM access.
-- User creation, invitations and membership changes stay in the trusted Supabase dashboard.
begin;

drop policy record_read on public.crm_records;
drop policy record_insert on public.crm_records;
drop policy record_update on public.crm_records;
drop policy record_delete on public.crm_records;
drop policy audit_read on public.crm_audit;
create policy record_read on public.crm_records for select to authenticated using(public.crm_role() in ('owner','technical') or (public.crm_role()='agent' and assigned_to=(select auth.uid())));
create policy record_insert on public.crm_records for insert to authenticated with check(public.crm_role() in ('owner','technical') or (public.crm_role()='agent' and assigned_to=(select auth.uid())));
create policy record_update on public.crm_records for update to authenticated using(public.crm_role() in ('owner','technical') or (public.crm_role()='agent' and assigned_to=(select auth.uid()))) with check(public.crm_role() in ('owner','technical') or (public.crm_role()='agent' and assigned_to=(select auth.uid())));
create policy record_delete on public.crm_records for delete to authenticated using(public.crm_role() in ('owner','technical'));
create policy audit_read on public.crm_audit for select to authenticated using(public.crm_role() in ('owner','technical'));

create function public.crm_validate_data(k text, d jsonb) returns void language plpgsql set search_path='' as $$
declare field text; value text; required_fields text[]; allowed text[];
begin
 if exists(select 1 from jsonb_each(d) item where jsonb_typeof(item.value)<>'string') then raise exception 'Τα πεδία πρέπει να είναι κείμενο.'; end if;
 if coalesce(length(trim(d->>'title')),0) not between 1 and 500 or coalesce(length(d->>'notes'),0)>5000 then raise exception 'Μη έγκυρος τίτλος ή σημειώσεις.'; end if;
 required_fields=case k
  when 'property' then array['code','area','price','sqm','type','transaction','status','publication']
  when 'contact' then array['type']
  when 'request' then array['contact','budget','transaction','status']
  when 'appointment' then array['contact','property','date','time','status']
  when 'task' then array['date','priority','status'] end;
 foreach field in array required_fields loop
  if coalesce(trim(d->>field),'')='' then raise exception 'Λείπει υποχρεωτικό πεδίο: %',field; end if;
 end loop;
 foreach field in array array['price','sqm','beds','budget','minsqm','minbeds'] loop
  value=d->>field;
  if coalesce(value,'')<>'' and (value !~ '^\d+(\.\d{1,2})?$' or length(value)>15) then raise exception 'Μη έγκυρος αριθμός: %',field; end if;
 end loop;
 if coalesce(d->>'photo','')<>'' and d->>'photo' !~ '^https://[^[:space:]]+$' then raise exception 'Η φωτογραφία χρειάζεται HTTPS URL.'; end if;
 if k in ('property','request') and d->>'transaction' not in ('Πώληση','Ενοικίαση') then raise exception 'Μη έγκυρη συναλλαγή.'; end if;
 if k='property' and (d->>'publication' not in ('Πρόχειρο','Προς έγκριση','Εγκεκριμένο') or d->>'type' not in ('Διαμέρισμα','Μονοκατοικία','Μεζονέτα','Οικόπεδο','Επαγγελματικός χώρος')) then raise exception 'Μη έγκυρος τύπος ή έγκριση.'; end if;
 if k='contact' and d->>'type' not in ('Ιδιοκτήτης','Αγοραστής','Ενοικιαστής','Συνεργάτης') then raise exception 'Μη έγκυρη ιδιότητα.'; end if;
 if k='task' and d->>'priority' not in ('Κανονική','Υψηλή','Χαμηλή') then raise exception 'Μη έγκυρη προτεραιότητα.'; end if;
 allowed=case k
  when 'property' then array['Διαθέσιμο','Υπό διαπραγμάτευση','Πουλήθηκε','Ενοικιάστηκε','Ανενεργό']
  when 'request' then array['Ενεργή','Ολοκληρωμένη','Σε αναμονή']
  when 'appointment' then array['Προγραμματισμένο','Ολοκληρώθηκε','Ακυρώθηκε']
  when 'task' then array['Ανοιχτή','Σε εξέλιξη','Ολοκληρώθηκε'] end;
 if allowed is not null and not (d->>'status'=any(allowed)) then raise exception 'Μη έγκυρη κατάσταση.'; end if;
 if k in ('task','appointment') then
  if d->>'date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Μη έγκυρη ημερομηνία.'; end if;
  perform (d->>'date')::date;
 end if;
 if k='appointment' then
  if d->>'time' !~ '^\d{2}:\d{2}$' then raise exception 'Μη έγκυρη ώρα.'; end if;
  perform (d->>'time')::time;
 end if;
end $$;
revoke all on function public.crm_validate_data(text,jsonb) from public;

create or replace function public.crm_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare ref_key text; ref_kind text; ref_id text;
begin
 if TG_OP='DELETE' then
  if exists(select 1 from public.crm_records r where r.id<>old.id and (r.data->>'contact'=old.id::text or r.data->>'property'=old.id::text)) then raise exception 'Η εγγραφή χρησιμοποιείται αλλού. Αφαίρεσε πρώτα τις συνδέσεις.'; end if;
  return old;
 end if;
 perform public.crm_validate_data(new.kind,new.data);
 if new.kind='property' then new.data=jsonb_set(new.data,'{code}',to_jsonb(trim(new.data->>'code'))); end if;
 if new.assigned_to is null or not exists(select 1 from public.crm_members where id=new.assigned_to and active) then raise exception 'Απαιτείται ενεργός υπεύθυνος.'; end if;
 if TG_OP='UPDATE' and (new.id<>old.id or new.kind<>old.kind or new.created_at<>old.created_at) then raise exception 'Μη επιτρεπτή αλλαγή.'; end if;
 if public.crm_role()='agent' and new.kind='property' then
  if TG_OP='INSERT' and new.data->>'publication'<>'Πρόχειρο' then raise exception 'Η έγκριση απαιτεί διαχειριστή.'; end if;
  if TG_OP='UPDATE' then
   if old.data->>'publication'='Εγκεκριμένο' then new.data=jsonb_set(new.data,'{publication}','"Προς έγκριση"');
   elsif new.data->>'publication'='Εγκεκριμένο' then raise exception 'Η έγκριση απαιτεί διαχειριστή.'; end if;
  end if;
 end if;
 foreach ref_key in array array['contact','property'] loop
  ref_id=new.data->>ref_key;
  ref_kind=case when ref_key='contact' then 'contact' else 'property' end;
  if coalesce(ref_id,'')<>'' and not exists(select 1 from public.crm_records r where r.id::text=ref_id and r.kind=ref_kind and (public.crm_role() in ('owner','technical') or r.assigned_to=auth.uid())) then raise exception 'Μη έγκυρη ή μη προσβάσιμη σύνδεση.'; end if;
 end loop;
 new.updated_at=clock_timestamp();return new;
end $$;

create table public.crm_photos (
 id uuid primary key default gen_random_uuid(),
 property_id uuid not null references public.crm_records(id) on delete restrict,
 path text not null unique,
 caption text not null default '' check(length(caption)<=200),
 created_at timestamptz not null default now(),
 check(path=property_id::text || '/' || id::text || '.jpg')
);
create index crm_photos_property on public.crm_photos(property_id);
alter table public.crm_photos enable row level security;
revoke all on public.crm_photos from anon,authenticated;
grant select,insert,delete on public.crm_photos to authenticated;
create function public.crm_can_access_property(property_key text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.crm_records r where r.id::text=property_key and r.kind='property'
 and (public.crm_role() in ('owner','technical') or (public.crm_role()='agent' and r.assigned_to=auth.uid())))
$$;
revoke all on function public.crm_can_access_property(text) from public;
grant execute on function public.crm_can_access_property(text) to authenticated;
create policy photo_read on public.crm_photos for select to authenticated using(public.crm_can_access_property(property_id::text));
create policy photo_insert on public.crm_photos for insert to authenticated with check(public.crm_can_access_property(property_id::text));
create policy photo_delete on public.crm_photos for delete to authenticated using(public.crm_role() in ('owner','technical') and public.crm_can_access_property(property_id::text));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('property-photos','property-photos',false,2097152,array['image/jpeg']);
create policy leaf_photo_read on storage.objects for select to authenticated using(bucket_id='property-photos' and public.crm_can_access_property(split_part(name,'/',1)));
create policy leaf_photo_insert on storage.objects for insert to authenticated with check(bucket_id='property-photos'
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' and public.crm_can_access_property(split_part(name,'/',1)));
-- Agents can remove unregistered uploads only (cleanup after failed metadata insert).
create policy leaf_photo_delete on storage.objects for delete to authenticated using(bucket_id='property-photos' and public.crm_can_access_property(split_part(name,'/',1))
 and (public.crm_role() in ('owner','technical') or not exists(select 1 from public.crm_photos p where p.path=name)));
commit;
