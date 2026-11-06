-- Apply once AFTER 002_team_and_photos.sql. Existing members and records are preserved.
begin;
create table public.website_publications (
 id boolean primary key default true check(id),
 revision uuid not null default gen_random_uuid(),
 requested_at timestamptz not null default now(),
 dispatch_error text
);
insert into public.website_publications(id) values(true);
create table public.website_listings (
 property_id uuid primary key references public.crm_records(id) on delete restrict,
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 revision uuid not null,
 updated_at timestamptz not null default now()
);
create unique index website_listing_id on public.website_listings((payload->>'id'));
create unique index website_listing_el_path on public.website_listings((payload #>> '{locales,el,path}'));
create unique index website_listing_en_path on public.website_listings((payload #>> '{locales,en,path}'));
alter table public.website_publications enable row level security;
alter table public.website_listings enable row level security;
revoke all on public.website_publications,public.website_listings from anon,authenticated;
grant select on public.website_publications,public.website_listings to authenticated;
create policy website_publication_read on public.website_publications for select to authenticated using(public.crm_role() in ('owner','technical'));
create policy website_listing_read on public.website_listings for select to authenticated using(public.crm_role() in ('owner','technical'));
grant all on public.website_publications,public.website_listings to service_role;
-- A publication is a transaction: snapshot and global revision always change together.
create function public.leaf_website_commit(p_property_id uuid,p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare revision_id uuid:=gen_random_uuid();
begin
 perform 1 from public.website_publications where id=true for update;
 if p_payload is null then
  delete from public.website_listings where property_id=p_property_id;
 else
  if not exists(select 1 from public.crm_records where id=p_property_id and kind='property' and data->>'publication'='Εγκεκριμένο') then raise exception 'Απαιτείται εγκεκριμένο ακίνητο.'; end if;
  insert into public.website_listings(property_id,payload,revision) values(p_property_id,p_payload,revision_id)
  on conflict(property_id) do update set payload=excluded.payload,revision=excluded.revision,updated_at=now();
 end if;
 update public.website_publications set revision=revision_id,requested_at=now(),dispatch_error=null where id=true;
 return revision_id;
end $$;
revoke all on function public.leaf_website_commit(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.leaf_website_commit(uuid,jsonb) to service_role;
-- Single SQL statement gives the build a consistent database snapshot.
create function public.leaf_website_export() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('revision',p.revision,'listings',coalesce((select jsonb_agg(l.payload order by l.payload->>'id') from public.website_listings l),'[]'::jsonb)) from public.website_publications p where id=true
$$;
revoke all on function public.leaf_website_export() from public,anon,authenticated;
grant execute on function public.leaf_website_export() to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('website-assets','website-assets',false,2097152,array['image/jpeg']) on conflict(id) do nothing;
-- No browser storage policies for website-assets: only the trusted function/build use it.
commit;
