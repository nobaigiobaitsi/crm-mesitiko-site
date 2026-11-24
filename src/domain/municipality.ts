import type { RecordData } from "./model";
import {
  legacyMunicipalityId,
  municipalityById,
} from "../../supabase/functions/_shared/municipalities.js";

export function recordMunicipalityId(data: RecordData): string {
  if (data.municipalityId)
    return municipalityById(data.municipalityId)?.id || "";
  const oldId = legacyMunicipalityId(data.area);
  if (oldId || !data.website_json) return oldId;
  try {
    const old = JSON.parse(data.website_json);
    return legacyMunicipalityId(
      old.area,
      old.locales?.el?.cardAddress,
      old.locales?.en?.cardAddress,
    );
  } catch {
    return "";
  }
}

export function recordMunicipalityName(data: RecordData): string {
  return municipalityById(recordMunicipalityId(data))?.el || "";
}
