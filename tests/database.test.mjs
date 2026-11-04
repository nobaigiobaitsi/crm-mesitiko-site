import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// A real PostgreSQL engine with the minimal Supabase auth/storage schema contract.
// Supabase's HTTP Auth and Storage services are outside this test harness.
test("migrations enforce roles, assignment, validation, audit and private photos", async () => {
  const db = new PGlite();
  const owner = "00000000-0000-4000-8000-000000000001",
    tech = "00000000-0000-4000-8000-000000000002",
    agent = "00000000-0000-4000-8000-000000000003",
    outsider = "00000000-0000-4000-8000-000000000004";
  const property = "10000000-0000-4000-8000-000000000001",
    contact = "10000000-0000-4000-8000-000000000002",
    photo = "20000000-0000-4000-8000-000000000001";
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth,storage to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant select,insert,delete on storage.objects to authenticated;
    `);
    await db.exec(
      await readFile(
        new URL("../supabase/001_crm.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL("../supabase/002_team_and_photos.sql", import.meta.url),
        "utf8",
      ),
    );
    for (const [id, role] of [
      [owner, "owner"],
      [tech, "technical"],
      [agent, "agent"],
    ]) {
      await db.query("insert into auth.users(id) values ($1)", [id]);
      await db.query(
        "insert into public.crm_members(id,name,role) values ($1,$2,$3)",
        [id, role, role],
      );
    }
    await db.query("insert into auth.users(id) values ($1)", [outsider]);
    async function as(id, role = "authenticated") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec(`set role ${role}`);
    }
    const data = {
      title: "Test home",
      code: "LF-TEST",
      area: "Athens",
      price: "100000",
      sqm: "90",
      beds: "2",
      type: "Διαμέρισμα",
      transaction: "Πώληση",
      status: "Διαθέσιμο",
      publication: "Εγκεκριμένο",
    };
    await as(owner);
    await db.query(
      "insert into public.crm_records(id,kind,data,assigned_to) values ($1,'contact',$2,$3)",
      [
        contact,
        JSON.stringify({ title: "Test contact", type: "Αγοραστής" }),
        owner,
      ],
    );
    await db.query(
      "insert into public.crm_records(id,kind,data,assigned_to) values ($1,'property',$2,$3)",
      [property, JSON.stringify(data), agent],
    );
    assert.equal(
      (await db.query("select * from public.crm_audit")).rows.length,
      2,
    );
    await as(tech);
    assert.equal(
      (await db.query("select * from public.crm_records")).rows.length,
      2,
    );
    await db.query(
      "update public.crm_records set data=jsonb_set(data,'{notes}','\"Tech update\"') where id=$1",
      [property],
    );
    await as(agent);
    assert.equal(
      (await db.query("select * from public.crm_records")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.crm_audit")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "delete from public.crm_records where id=$1 returning id",
          [property],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query("update public.crm_records set assigned_to=$1 where id=$2", [
        owner,
        property,
      ]),
    );
    await assert.rejects(
      db.query(
        "update public.crm_records set data=jsonb_set(data,'{contact}',to_jsonb($1::text)) where id=$2",
        [contact, property],
      ),
      /προσβάσιμη/,
    );
    await db.query(
      "update public.crm_records set data=jsonb_set(data,'{notes}','\"Agent update\"') where id=$1",
      [property],
    );
    assert.equal(
      (
        await db.query("select data from public.crm_records where id=$1", [
          property,
        ])
      ).rows[0].data.publication,
      "Προς έγκριση",
    );
    await assert.rejects(
      db.query(
        "update public.crm_records set data=jsonb_set(data,'{publication}','\"Εγκεκριμένο\"') where id=$1",
        [property],
      ),
      /έγκριση/,
    );
    await assert.rejects(
      db.query(
        "update public.crm_records set data=jsonb_set(data,'{price}','\"-1\"') where id=$1",
        [property],
      ),
      /αριθμός/,
    );
    await assert.rejects(
      db.query(
        "update public.crm_records set data=jsonb_set(data,'{sqm}','null') where id=$1",
        [property],
      ),
      /κείμενο/,
    );
    await assert.rejects(
      db.query("update public.crm_members set role='owner' where id=$1", [
        agent,
      ]),
    );
    await assert.rejects(
      db.query(
        "insert into public.crm_audit(record_id,action,title) values ($1,'DELETE','fake')",
        [property],
      ),
    );
    const path = `${property}/${photo}.jpg`;
    await db.query(
      "insert into storage.objects(bucket_id,name) values('property-photos',$1)",
      [path],
    );
    await db.query(
      "insert into public.crm_photos(id,property_id,path) values($1,$2,$3)",
      [photo, property, path],
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("delete from storage.objects returning id")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("delete from public.crm_photos returning id")).rows
        .length,
      0,
    );
    await as(outsider);
    for (const table of [
      "crm_records",
      "crm_members",
      "crm_audit",
      "crm_photos",
    ])
      assert.equal(
        (await db.query(`select * from public.${table}`)).rows.length,
        0,
      );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await as("", "anon");
    await assert.rejects(db.query("select * from public.crm_records"));
    await as(owner);
    await assert.rejects(
      db.query("delete from public.crm_records where id=$1", [property]),
      /foreign key/,
    );
    await db.exec("delete from storage.objects; delete from public.crm_photos");
    await db.query("delete from public.crm_records where id=$1", [property]);
    assert.equal(
      (await db.query("select * from public.crm_audit where action='DELETE'"))
        .rows.length,
      1,
    );
    await db.exec("reset role");
    await db.query("update public.crm_members set active=false where id=$1", [
      agent,
    ]);
    await as(agent);
    assert.equal(
      (await db.query("select * from public.crm_records")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
