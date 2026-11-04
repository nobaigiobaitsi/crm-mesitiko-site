import type { Kind } from "./model";
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
};
export const fields: Record<Kind, Field[]> = {
  property: [
    { key: "title", label: "Τίτλος ακινήτου", required: true },
    { key: "code", label: "Κωδικός", required: true },
    { key: "area", label: "Περιοχή", required: true },
    { key: "address", label: "Ακριβής διεύθυνση (εσωτερική)" },
    { key: "photo", label: "Φωτογραφία εξωφύλλου (HTTPS URL)", type: "url" },
    {
      key: "type",
      label: "Τύπος",
      options: [
        "Διαμέρισμα",
        "Μονοκατοικία",
        "Μεζονέτα",
        "Οικόπεδο",
        "Επαγγελματικός χώρος",
      ],
    },
    {
      key: "transaction",
      label: "Συναλλαγή",
      options: ["Πώληση", "Ενοικίαση"],
    },
    { key: "price", label: "Τιμή (€)", type: "number", required: true },
    { key: "sqm", label: "Εμβαδόν (τ.μ.)", type: "number", required: true },
    { key: "beds", label: "Υπνοδωμάτια", type: "number" },
    {
      key: "status",
      label: "Εμπορική κατάσταση",
      options: [
        "Διαθέσιμο",
        "Υπό διαπραγμάτευση",
        "Πουλήθηκε",
        "Ενοικιάστηκε",
        "Ανενεργό",
      ],
    },
    {
      key: "publication",
      label: "Εσωτερική έγκριση",
      options: ["Πρόχειρο", "Προς έγκριση", "Εγκεκριμένο"],
    },
    { key: "contact", label: "Ιδιοκτήτης ακινήτου", type: "contact" },
  ],
  contact: [
    { key: "title", label: "Ονοματεπώνυμο", required: true },
    {
      key: "type",
      label: "Ιδιότητα",
      options: ["Ιδιοκτήτης", "Αγοραστής", "Ενοικιαστής", "Συνεργάτης"],
    },
    { key: "phone", label: "Τηλέφωνο", type: "tel" },
    { key: "email", label: "Email", type: "email" },
  ],
  request: [
    { key: "title", label: "Τίτλος ζήτησης", required: true },
    { key: "contact", label: "Πελάτης", type: "contact", required: true },
    { key: "area", label: "Περιοχή" },
    {
      key: "transaction",
      label: "Συναλλαγή",
      options: ["Πώληση", "Ενοικίαση"],
    },
    {
      key: "budget",
      label: "Μέγιστο budget (€)",
      type: "number",
      required: true,
    },
    { key: "minsqm", label: "Ελάχιστα τ.μ.", type: "number" },
    { key: "minbeds", label: "Ελάχιστα υπνοδωμάτια", type: "number" },
    {
      key: "status",
      label: "Κατάσταση",
      options: ["Ενεργή", "Ολοκληρωμένη", "Σε αναμονή"],
    },
  ],
  appointment: [
    { key: "title", label: "Τίτλος ραντεβού", required: true },
    { key: "property", label: "Ακίνητο", type: "property", required: true },
    { key: "contact", label: "Πελάτης", type: "contact", required: true },
    { key: "date", label: "Ημερομηνία", type: "date", required: true },
    { key: "time", label: "Ώρα", type: "time", required: true },
    {
      key: "status",
      label: "Κατάσταση",
      options: ["Προγραμματισμένο", "Ολοκληρώθηκε", "Ακυρώθηκε"],
    },
    { key: "result", label: "Αποτέλεσμα επίσκεψης" },
  ],
  task: [
    { key: "title", label: "Τι χρειάζεται να γίνει;", required: true },
    { key: "date", label: "Προθεσμία", type: "date", required: true },
    {
      key: "priority",
      label: "Προτεραιότητα",
      options: ["Κανονική", "Υψηλή", "Χαμηλή"],
    },
    {
      key: "status",
      label: "Κατάσταση",
      options: ["Ανοιχτή", "Σε εξέλιξη", "Ολοκληρώθηκε"],
    },
    { key: "property", label: "Σχετικό ακίνητο", type: "property" },
    { key: "contact", label: "Σχετική επαφή", type: "contact" },
  ],
};
