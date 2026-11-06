import test from "node:test";
import assert from "node:assert/strict";
import { publicDraft, savePublicDraft } from "../src/domain/website.ts";
test("editing public fields preserves legacy content and private fields, removes transient inputs", () => {
  const original = {
    title: "Internal",
    notes: "private",
    website_json: JSON.stringify({
      id: "001",
      mapUrl: "https://example.com",
      locales: {
        el: {
          title: "Ακίνητο",
          description: "Κείμενο",
          path: "/old/",
          features: ["Feature"],
        },
        en: { title: "Home", path: "/en/old/" },
      },
      additionalFacts: [{ key: "parking", value: { el: "Ναι", en: "Yes" } }],
    }),
  };
  const draft = publicDraft(original);
  assert.equal(draft.site_path_el, "/old/");
  draft.site_description_el = "Νέα περιγραφή";
  const saved = savePublicDraft(draft),
    website = JSON.parse(saved.website_json);
  assert.equal(website.locales.el.description, "Νέα περιγραφή");
  assert.equal(website.locales.el.path, "/old/");
  assert.deepEqual(website.locales.el.features, ["Feature"]);
  assert.equal(website.additionalFacts[0].key, "parking");
  assert.equal(saved.notes, "private");
  assert.equal(saved.site_description_el, undefined);
});
