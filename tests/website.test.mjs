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

test("all six imported records publish safely before and after editing, without legacy content", async () => {
  const { publicPayload } =
    await import("../supabase/functions/_shared/publication.js");
  const { readFile } = await import("node:fs/promises");
  const originals = JSON.parse(
    await readFile(
      new URL("../import/site/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  for (const p of originals) {
    const data = {
      import_source: "leaf-site-v1",
      website_json: JSON.stringify(p),
      code: "CRM-" + p.id,
      area: "Current area",
      address: "PRIVATE ADDRESS",
      status: "Διαθέσιμο",
      publication: "Εγκεκριμένο",
      type: "Διαμέρισμα",
    };
    const photos = [
      {
        src: "crm://photo.jpg",
        alt: { el: "PRIVATE CAPTION", en: "PRIVATE CAPTION" },
      },
    ];
    const direct = publicPayload(data, photos);
    const draft = publicDraft(data);
    assert.equal(direct.area, data.area);
    assert.equal(direct.reference, data.code);
    assert.equal(direct.mapUrl, "");
    assert.ok(
      direct.additionalFacts.every((f) =>
        ["floor", "heating", "energyClass"].includes(f.key),
      ),
    );
    assert.doesNotMatch(
      JSON.stringify(direct),
      /PRIVATE (?:ADDRESS|CAPTION)|agrielias|αγριελιάς|σοφοκλέους|sofokleous|filellinon|φιλελλήνων/i,
    );
    for (const lang of ["el", "en"]) {
      assert.equal(direct.locales[lang].address, p.locales[lang].cardAddress);
      assert.equal(direct.locales[lang].location, "");
      assert.equal(direct.locales[lang].path, draft["site_path_" + lang]);
      draft["site_location_" + lang] = "";
      draft["site_features_" + lang] = "";
    }
    draft.site_year = "2004";
    const saved = savePublicDraft(draft);
    assert.equal(saved.address, "PRIVATE ADDRESS");
    assert.equal(JSON.parse(saved.website_json).mapUrl, undefined);
    const next = publicPayload(saved, photos);
    assert.equal(next.locales.en.address, "");
    assert.equal(next.locales.el.cardAddress, "");
    assert.deepEqual(next.locales.el.features, []);
    assert.equal(
      next.additionalFacts.find((f) => f.key === "yearBuilt").value,
      2004,
    );
    draft.site_year = "";
    draft.site_location_el = "Νέα δημόσια περιοχή";
    draft.site_path_el = "/new-" + p.id + "/";
    const edited = publicPayload(savePublicDraft(draft), photos);
    assert.equal(edited.locales.el.address, draft.site_location_el);
    assert.equal(edited.locales.el.path, draft.site_path_el);
    assert.ok(!edited.additionalFacts.some((f) => f.key === "yearBuilt"));
  }
});

test("a location duplicated by the previous editor is cleaned on opening the imported draft", async () => {
  const { readFile } = await import("node:fs/promises");
  const originals = JSON.parse(
    await readFile(
      new URL("../import/site/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  for (const source of originals.slice(0, 3)) {
    const p = structuredClone(source);
    for (const lang of ["el", "en"])
      p.locales[lang].cardAddress = p.locales[lang].address;
    const draft = publicDraft({
      import_source: "leaf-site-v1",
      website_json: JSON.stringify(p),
    });
    for (const lang of ["el", "en"])
      assert.equal(
        draft["site_location_" + lang],
        source.locales[lang].cardAddress,
      );
  }
});
