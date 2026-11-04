import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { AuthCallback } from "../lib/auth-callback";

export function useAuth(
  client: SupabaseClient | null,
  initialCallback: AuthCallback,
) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [error, setError] = useState(initialCallback.error || "");
  const [callback, setCallback] = useState(initialCallback);
  const [requiresPassword, setRequiresPassword] = useState(
    initialCallback.type !== null,
  );

  useEffect(() => {
    if (!client) return;
    let active = true;
    const { data: listener } = client.auth.onAuthStateChange(
      (event, currentSession) => {
        // Keep the listener synchronous; database work runs in a separate effect.
        if (!active) return;
        setSession(currentSession);
        setLoading(false);
        if (event === "PASSWORD_RECOVERY") setRequiresPassword(true);
      },
    );
    client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        setSession(data.session);
        if (sessionError) setError(sessionError.message);
        setLoading(false);
      })
      .catch((error: Error) => {
        if (active) {
          setError(error.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  async function signIn(email: string, password: string) {
    const { error } = await client!.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    setError("");
  }
  async function signOut() {
    const { error } = await client!.auth.signOut({ scope: "local" });
    if (error) throw error;
    setSession(null);
    setRequiresPassword(false);
    setCallback({ type: null });
    setError("");
    window.history.replaceState(null, "", window.location.pathname);
  }
  async function requestReset(email: string) {
    const { error } = await client!.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + import.meta.env.BASE_URL,
    });
    if (error) throw error;
  }
  async function setPassword(password: string) {
    if (callback.tokenHash && callback.type) {
      const { error } = await client!.auth.verifyOtp({
        token_hash: callback.tokenHash,
        type: callback.type,
      });
      if (error) throw error;
      setCallback({ type: callback.type });
      window.history.replaceState(null, "", window.location.pathname);
    }
    const current = await client!.auth.getSession();
    if (!current.data.session)
      throw new Error(
        "Ο σύνδεσμος έχει λήξει ή δεν είναι έγκυρος. Ζητήστε νέο email ανάκτησης.",
      );
    const { error } = await client!.auth.updateUser({ password });
    if (error) throw error;
    window.history.replaceState(null, "", window.location.pathname);
    setRequiresPassword(false);
    setCallback({ type: null });
    setError("");
  }
  return {
    session,
    loading,
    error,
    requiresPassword,
    signIn,
    signOut,
    requestReset,
    setPassword,
  };
}
export type AuthState = ReturnType<typeof useAuth>;
