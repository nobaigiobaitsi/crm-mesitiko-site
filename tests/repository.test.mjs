import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createCrmRepository, AccessDeniedError } from "../src/services/crm.ts";
import { createPhotoRepository } from "../src/services/photos.ts";

const reply = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const client = (fetch) =>
  createClient("https://company.supabase.co", "sb_publishable_test", {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { fetch },
  });

test("repository loads all pages and resolves membership from the authenticated UID", async () => {
  const api = client(async (url) => {
    const u = new URL(String(url));
    const offset = Number(u.searchParams.get("offset"));
    if (u.pathname.endsWith("crm_records"))
      return reply(
        Array.from({ length: offset === 0 ? 500 : 1 }, (_, i) => ({
          id: String(offset + i),
        })),
      );
    if (u.pathname.endsWith("crm_members"))
      return reply([
        { id: "me", name: "Tech lead", role: "technical", active: true },
      ]);
    return reply([]);
  });
  const repository = createCrmRepository(api),
    data = await repository.load("me");
  assert.equal(data.entries.length, 501);
  assert.equal(data.me.role, "technical");
  await assert.rejects(repository.load("other-user"), AccessDeniedError);
});

test("stale saves and deletes fail with the original version included in the query", async () => {
  const requests = [];
  const api = client(async (url, options) => {
    requests.push({ url: new URL(String(url)), method: options.method });
    return reply([]);
  });
  const repository = createCrmRepository(api);
  const entry = {
    id: "property-1",
    kind: "property",
    data: { title: "Property" },
    assigned_to: "me",
    created_at: "2026-11-04T00:00:00Z",
    updated_at: "2026-11-04T08:10:00.123456+00:00",
  };
  await assert.rejects(repository.save(entry, true), /άλλαξε/);
  await assert.rejects(repository.remove(entry), /άλλαξε/);
  assert.deepEqual(
    requests.map((request) => request.method),
    ["PATCH", "DELETE"],
  );
  for (const request of requests)
    assert.equal(
      request.url.searchParams.get("updated_at"),
      "eq." + entry.updated_at,
    );
});

test("photo URLs are signed through private storage rather than permanent public URLs", async () => {
  const api = client(async (url, options) => {
    const u = new URL(String(url));
    if (u.pathname.endsWith("crm_photos"))
      return reply([
        {
          id: "photo-1",
          property_id: "property-1",
          path: "property-1/photo-1.jpg",
          caption: "Room",
          created_at: "2026-11-04",
        },
      ]);
    assert.equal(u.pathname, "/storage/v1/object/sign/property-photos");
    assert.equal(JSON.parse(options.body).expiresIn, 300);
    return reply([
      {
        path: "property-1/photo-1.jpg",
        signedURL:
          "/object/sign/property-photos/property-1/photo-1.jpg?token=short-lived",
      },
    ]);
  });
  const photos = await createPhotoRepository(api).list("property-1");
  assert.match(photos[0].url, /\/storage\/v1\/object\/sign\//);
  assert.equal(photos[0].url.includes("/object/public/"), false);
});
