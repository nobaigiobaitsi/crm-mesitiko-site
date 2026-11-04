export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export function validateConfiguration(
  url: string | undefined,
  key: string | undefined,
): SupabaseConfig {
  if (!url?.trim() || !key?.trim())
    throw new Error(
      "Συμπληρώστε VITE_SUPABASE_URL και VITE_SUPABASE_PUBLISHABLE_KEY στο .env.local.",
    );
  const parsed = new URL(url.trim());
  if (
    parsed.protocol !== "https:" ||
    !/^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.search ||
    parsed.hash ||
    !["", "/"].includes(parsed.pathname)
  ) {
    throw new Error(
      "Το VITE_SUPABASE_URL πρέπει να είναι το HTTPS Project URL του Supabase.",
    );
  }
  const publishableKey = key.trim();
  if (!publishableKey.startsWith("sb_publishable_")) {
    try {
      const parts = publishableKey.split(".");
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (parts.length !== 3 || payload.role !== "anon") throw new Error();
    } catch {
      throw new Error(
        "Χρησιμοποιήστε publishable / anon key. Τα secret και service_role keys δεν επιτρέπονται στο frontend.",
      );
    }
  }
  return { url: parsed.origin, publishableKey };
}
