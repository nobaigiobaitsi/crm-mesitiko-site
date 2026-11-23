// Migration for the original leaf-site-v1 import. Recognised legacy address formats are
// replaced. Once saved, the CRM editor owns the public strings and both routes.
export function importedPublicFields(listing) {
  const locales = {};
  for (const lang of ["el", "en"]) {
    const original = listing.locales?.[lang] || {};
    const { title, features } = original;
    let { description, path } = original;
    let address = original.cardAddress ?? "";
    const el = lang === "el";
    if (listing.publicFieldsVersion !== 2) {
      // The old editor sometimes copied the detailed header into the card.
      if (
        listing.id === "001" &&
        /^[^,]+ \d+, (?:Έκαλη|Ekali), \d{5}$/u.test(address)
      ) {
        address = el ? "Έκαλη, Αθήνα" : "Ekali, Athens";
      }
      if (listing.id === "002" || listing.id === "003") {
        const unit = listing.id === "002" ? "a" : "b";
        if (
          /^[^,]+ & [^,]+, (?:Καλαμάτα · Ισόγειο · Διαμέρισμα [ΑΒ]|Kalamata · Ground Floor · Apartment [AB])$/u.test(
            address,
          )
        ) {
          address = el ? "Καλαμάτα" : "Kalamata";
        }
        const oldClause = el
          ? / στη συμβολή των οδών [^.,\n]+,(?= στο κέντρο της Καλαμάτας)/u
          : / at the (?:corner|junction) of [^.,\n]+ streets,(?= in the center of Kalamata)/i;
        description = description?.replace(oldClause, "");
        // The imported EN location names the junction used in both original URLs.
        // Read it from the record so the CRM client ships no private street names.
        const english = listing.locales?.en;
        const junction = [english?.location, english?.description]
          .map((text) =>
            /(?:corner|junction) of ([a-z]+) and ([a-z]+) streets/i.exec(
              text || "",
            ),
          )
          .find(Boolean);
        if (junction) {
          const streets = (junction[1] + "-" + junction[2]).toLowerCase();
          const oldPath = el
            ? `/diamerisma-${unit}-${streets}-kalamata/`
            : `/en/apartment-${unit}-${streets}-kalamata-${listing.id}/`;
          if (path === oldPath)
            path = el
              ? `/diamerisma-${unit}-kalamata/`
              : `/en/apartment-${unit}-kalamata-${listing.id}/`;
        }
      }
    }
    locales[lang] = {
      title,
      cardTitle: title,
      description,
      features,
      path,
      address,
      cardAddress: address,
    };
  }
  return {
    locales,
    additionalFacts: (listing.additionalFacts || []).filter((f) =>
      ["floor", "heating", "energyClass"].includes(f.key),
    ),
  };
}

export function importedPhotoLabels(photos, locales) {
  return photos.map(({ src }, index) => ({
    src,
    alt: {
      el: `${locales.el.title} – φωτογραφία ${index + 1}`,
      en: `${locales.en.title} – photo ${index + 1}`,
    },
  }));
}
