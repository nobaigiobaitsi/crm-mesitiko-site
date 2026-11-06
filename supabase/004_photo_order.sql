begin;
alter table public.crm_photos add column if not exists sort_order integer not null default 100000;
create or replace function public.leaf_reorder_photos(property_id uuid, photo_ids uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if not public.crm_can_access_property(property_id::text) then raise exception 'Δεν επιτρέπεται η αλλαγή.'; end if;
 perform 1 from public.crm_records r where r.id=property_id for update;
 select count(*) into n from public.crm_photos p where p.property_id=leaf_reorder_photos.property_id;
 if cardinality(photo_ids) <> n or (select count(distinct x) from unnest(photo_ids) x) <> n
 or exists(select 1 from unnest(photo_ids) x where not exists(select 1 from public.crm_photos p where p.id=x and p.property_id=leaf_reorder_photos.property_id)) then
 raise exception 'Οι φωτογραφίες άλλαξαν. Ανανεώστε και δοκιμάστε ξανά.'; end if;
 update public.crm_photos p set sort_order=ids.ord::integer from unnest(photo_ids) with ordinality ids(id,ord) where p.id=ids.id and p.property_id=leaf_reorder_photos.property_id;
end; $$;
revoke all on function public.leaf_reorder_photos(uuid,uuid[]) from public,anon;
grant execute on function public.leaf_reorder_photos(uuid,uuid[]) to authenticated;
commit;
