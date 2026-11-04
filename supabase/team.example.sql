-- Run after inviting users through Supabase Authentication.
-- Replace ALL three placeholder UUIDs and the owners' names before executing.
-- These UUIDs must match Authentication > Users > User UID.
insert into public.crm_members(id,name,role) values
 ('REPLACE_WITH_OWNER_1_AUTH_UUID','Ιδιοκτήτης Α','owner'),
 ('REPLACE_WITH_OWNER_2_AUTH_UUID','Ιδιοκτήτης Β','owner'),
 ('REPLACE_WITH_TECH_LEAD_AUTH_UUID','Σταύρος','technical');

-- A future agent (invite in Authentication first):
-- insert into public.crm_members(id,name,role) values ('AUTH_USER_UUID','Όνομα μεσίτη','agent');
-- Deactivate access without deleting past assignments:
-- update public.crm_members set active=false where id='AUTH_USER_UUID';
