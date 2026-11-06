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

test("public text and feature lists survive editing and publication in both languages", async () => {
  const { publicPayload } =
    await import("../supabase/functions/_shared/publication.js");
  const draft = publicDraft({
    code: "001",
    area: "Athens",
    publication: "Εγκεκριμένο",
    status: "Διαθέσιμο",
    type: "Διαμέρισμα",
  });
  for (const lang of ["el", "en"]) {
    draft[`site_title_${lang}`] = "Home";
    draft[`site_path_${lang}`] = lang === "el" ? "/home/" : "/en/home/";
    draft[`site_description_${lang}`] =
      "First  line\n\nSecond paragraph\n• Item <script>";
    draft[`site_features_${lang}`] = "✔ Parking\r\n\r\n• Balcony\nHeating";
  }
  const saved = savePublicDraft(draft);
  const payload = publicPayload(saved, [{ src: "crm://photo.jpg" }]);
  const reopened = publicDraft(saved);
  for (const lang of ["el", "en"]) {
    assert.equal(
      payload.locales[lang].description,
      draft[`site_description_${lang}`],
    );
    assert.deepEqual(payload.locales[lang].features, [
      "Parking",
      "Balcony",
      "Heating",
    ]);
    assert.equal(
      reopened[`site_features_${lang}`],
      "Parking\nBalcony\nHeating",
    );
    reopened[`site_features_${lang}`] = "";
  }
  assert.deepEqual(
    JSON.parse(savePublicDraft(reopened).website_json).locales.el.features,
    [],
  );
  draft.site_features_el = Array(61).fill("Feature").join("\n");
  assert.throws(() => savePublicDraft(draft), /60/);
  draft.site_features_el = "x".repeat(501);
  assert.throws(() => savePublicDraft(draft), /500/);
});
