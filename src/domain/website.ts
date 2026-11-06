import type { RecordData } from "./model";
export function publicDraft(data: RecordData): RecordData {
  let website: any = {};
  try {
    website = JSON.parse(data.website_json || "{}");
  } catch {
    /* editing can repair invalid JSON */
  }
  const facts = website.additionalFacts || [];
  const fact = (key: string, lang: string) =>
    facts.find((item: any) => item.key === key)?.value?.[lang] || "";
  return {
    ...data,
    site_title_el: website.locales?.el?.title || "",
    site_title_en: website.locales?.en?.title || "",
    site_description_el: website.locales?.el?.description || "",
    site_description_en: website.locales?.en?.description || "",
    site_features_el: (website.locales?.el?.features || []).join("\n"),
    site_features_en: (website.locales?.en?.features || []).join("\n"),
    site_location_el: website.locales?.el?.address || "",
    site_location_en: website.locales?.en?.address || "",
    site_path_el: website.locales?.el?.path || "",
    site_path_en: website.locales?.en?.path || "",
    site_bathrooms: String(website.bathrooms ?? ""),
    site_floor_el: fact("floor", "el"),
    site_floor_en: fact("floor", "en"),
    site_heating_el: fact("heating", "el"),
    site_heating_en: fact("heating", "en"),
    site_energy_class: fact("energyClass", "el"),
    site_year: String(website.year || ""),
  };
}
export function savePublicDraft(data: RecordData): RecordData {
  let website: any = {};
  try {
    website = JSON.parse(data.website_json || "{}");
  } catch {
    /* reconstruct */
  }
  website.locales ||= {};
  for (const lang of ["el", "en"]) {
    website.locales[lang] = {
      ...website.locales[lang],
      title: data[`site_title_${lang}`],
      cardTitle: data[`site_title_${lang}`],
      description: data[`site_description_${lang}`],
      features: (data[`site_features_${lang}`] || "")
        .split(/\r\n|\r|\n/)
        .map((line: string) => line.trim().replace(/^[✔✓•]\s*/, ""))
        .filter(Boolean),
      address: data[`site_location_${lang}`],
      cardAddress: data[`site_location_${lang}`],
      path: data[`site_path_${lang}`],
    };
  }
  for (const lang of ["el", "en"]) {
    const features = website.locales[lang].features;
    if (
      features.length > 60 ||
      features.some((feature: string) => feature.length > 500)
    ) {
      throw new Error(
        "Χαρακτηριστικά & Παροχές: έως 60 παροχές ανά γλώσσα, με έως 500 χαρακτήρες η καθεμία.",
      );
    }
  }
  website.bathrooms = data.site_bathrooms ? Number(data.site_bathrooms) : null;
  website.year = data.site_year ? Number(data.site_year) : null;
  const edited = ["floor", "heating", "energyClass"];
  website.additionalFacts = (website.additionalFacts || []).filter(
    (item: any) => !edited.includes(item.key),
  );
  for (const [key, prefix, label] of [
    ["floor", "site_floor", "Όροφος"],
    ["heating", "site_heating", "Θέρμανση"],
    ["energyClass", "site_energy_class", "Ενεργειακή κλάση"],
  ]) {
    const el = data[`${prefix}_el`] || data[prefix] || "",
      en = data[`${prefix}_en`] || el;
    if (el || en)
      website.additionalFacts.push({
        key,
        value: { el, en },
        label: { el: label, en: key },
        format: "text",
      });
  }
  const result: RecordData = { ...data, website_json: JSON.stringify(website) };
  for (const key of Object.keys(result))
    if (key.startsWith("site_")) delete result[key];
  return result;
}
