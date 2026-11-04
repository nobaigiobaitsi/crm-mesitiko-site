import { createClient } from "@supabase/supabase-js";
import { validateConfiguration, type SupabaseConfig } from "./config";
import { readAuthCallback } from "./auth-callback";

// Capture the intent before the Auth SDK processes and clears redirect parameters.
export const initialAuthCallback = readAuthCallback(window.location.href);
let config: SupabaseConfig | null = null;
let configurationError = "";
try {
  config = validateConfiguration(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
} catch (error) {
  configurationError = (error as Error).message;
}

export { config, configurationError };
export const supabase = config
  ? createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;
