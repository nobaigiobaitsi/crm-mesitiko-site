import test from "node:test";
import assert from "node:assert/strict";
import { canEdit, canManage, matches } from "../src/domain/model.ts";
import { createEntry, validateEntry } from "../src/domain/records.ts";
import { validateConfiguration } from "../src/lib/config.ts";
import { readAuthCallback } from "../src/lib/auth-callback.ts";

const owner = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Owner",
  role: "owner",
  active: true,
};
const tech = {
  ...owner,
  id: "00000000-0000-4000-8000-000000000002",
  role: "technical",
};
const agent = {
  ...owner,
  id: "00000000-0000-4000-8000-000000000003",
  role: "agent",
};
function property(data = {}) {
  return {
    ...createEntry("property", owner),
    data: {
      title: "Property",
      code: "LF-1",
      area: "Γλυφάδα",
      type: "Διαμέρισμα",
      transaction: "Πώληση",
      price: "385000",
      sqm: "112",
      beds: "3",
      status: "Διαθέσιμο",
      publication: "Πρόχειρο",
      ...data,
    },
  };
}

test("matching applies availability, accent-insensitive area, budget, size and bedroom boundaries", () => {
  const p = property();
  const request = {
    ...createEntry("request", owner),
    data: {
      title: "Request",
      area: "γλυφαδα",
      transaction: "Πώληση",
      budget: "385000",
      minsqm: "112",
      minbeds: "3",
    },
  };
  assert.deepEqual(matches(request, [p]), [p]);
  for (const data of [
    { price: "385001" },
    { sqm: "111" },
    { beds: "2" },
    { status: "Πουλήθηκε" },
    { transaction: "Ενοικίαση" },
    { price: "" },
    { sqm: "" },
    { beds: "" },
  ])
    assert.equal(
      matches(request, [{ ...p, data: { ...p.data, ...data } }]).length,
      0,
    );
});

test("new records contain only blank form values and assign the signed-in member", () => {
  const p = createEntry("property", tech);
  assert.equal(p.data.title, "");
  assert.equal(p.assigned_to, tech.id);
  assert.match(p.data.code, /^LF-[0-9A-F]{8}$/);
  assert.equal(Object.hasOwn(p.data, "address"), false);
  assert.equal(Object.hasOwn(p.data, "photo"), false);
  assert.notEqual(createEntry("property", tech).id, p.id);
});

test("permissions require active membership; agents can edit assigned records only", () => {
  assert.equal(canManage(owner), true);
  assert.equal(canManage(tech), true);
  assert.equal(canManage(agent), false);
  assert.equal(canEdit(agent, property()), false);
  assert.equal(canEdit(agent, { ...property(), assigned_to: agent.id }), true);
  assert.equal(canEdit({ ...owner, active: false }, property()), false);
});

test("validation rejects blank, negative, unsafe and duplicate property values", () => {
  assert.doesNotThrow(() => validateEntry(property(), []));
  for (const data of [
    { title: " " },
    { price: "-1" },
    { sqm: "not-a-number" },
    { photo: "javascript:alert(1)" },
  ])
    assert.throws(() => validateEntry(property(data), []));
  assert.throws(() =>
    validateEntry(property({ code: " lf-1 " }), [property()]),
  );
});

test("frontend configuration allows only public keys and a project origin", () => {
  const url = "https://company.supabase.co",
    key = "sb_publishable_public-key";
  assert.deepEqual(validateConfiguration(url + "/", key), {
    url,
    publishableKey: key,
  });
  for (const value of [
    "sb_secret_do-not-use",
    " " +
      ["x", btoa(JSON.stringify({ role: "service_role" })), "x"].join(".") +
      " ",
  ])
    assert.throws(() => validateConfiguration(url, value));
  for (const value of [
    "http://company.supabase.co",
    "https://company.supabase.co.attacker.test",
    "https://user:pass@company.supabase.co",
    "https://company.supabase.co/rest/v1",
  ])
    assert.throws(() => validateConfiguration(value, key));
  assert.throws(() => validateConfiguration(undefined, undefined));
});

test("invitation and recovery callback intent survives URL token processing", () => {
  assert.deepEqual(
    readAuthCallback(
      "https://crm.example/?token_hash=one-time-token&type=invite",
    ),
    { type: "invite", tokenHash: "one-time-token", error: undefined },
  );
  assert.equal(
    readAuthCallback(
      "https://crm.example/#access_token=temporary&type=recovery",
    ).type,
    "recovery",
  );
  assert.equal(
    readAuthCallback("https://crm.example/#error_description=Expired+link")
      .error,
    "Expired link",
  );
  assert.equal(readAuthCallback("https://crm.example/?type=signup").type, null);
});
