import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { AuthState } from "../hooks/useAuth";
import { Brand, ErrorNotice } from "./Common";

export function AuthScreen({ auth }: { auth: AuthState }) {
  const [reset, setReset] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const settingPassword = auth.requiresPassword;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (settingPassword) {
        if (password !== confirmation)
          throw new Error("Οι δύο κωδικοί δεν συμφωνούν.");
        await auth.setPassword(password);
      } else if (reset) {
        await auth.requestReset(email);
        setMessage(
          "Αν υπάρχει λογαριασμός, θα λάβετε email για ορισμό νέου κωδικού.",
        );
      } else await auth.signIn(email, password);
      setPassword("");
      setConfirmation("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="panel auth-panel">
        <Brand />
        <div className="auth-heading">
          <div className="eyebrow">LEAF PROPERTIES</div>
          <h1>
            {settingPassword
              ? "Ορισμός κωδικού"
              : reset
                ? "Ανάκτηση πρόσβασης"
                : "Καλώς ήρθατε."}
          </h1>
          <p>
            {settingPassword
              ? "Επιλέξτε τον προσωπικό σας κωδικό για το CRM."
              : "Ο χώρος εργασίας της ομάδας σας."}
          </p>
        </div>
        <form onSubmit={submit} className="settings-form">
          {!settingPassword && (
            <label>
              Email συνεργάτη
              <input
                required
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          )}
          {(!reset || settingPassword) && (
            <label>
              {settingPassword
                ? "Νέος κωδικός (10+ χαρακτήρες)"
                : "Κωδικός πρόσβασης"}
              <input
                required
                type="password"
                autoComplete={
                  settingPassword ? "new-password" : "current-password"
                }
                minLength={settingPassword ? 10 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          )}
          {settingPassword && (
            <label>
              Επιβεβαίωση κωδικού
              <input
                required
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
          )}
          <ErrorNotice message={error || auth.error} />
          {message && <p role="status">{message}</p>}
          <button className="primary" disabled={busy} type="submit">
            {busy
              ? "Παρακαλώ περιμένετε…"
              : settingPassword
                ? "Αποθήκευση κωδικού"
                : reset
                  ? "Αποστολή συνδέσμου"
                  : "Σύνδεση"}
            <ArrowRight size={16} />
          </button>
          <button
            className="text-btn"
            disabled={busy}
            type="button"
            onClick={async () => {
              if (settingPassword) {
                try {
                  await auth.signOut();
                } catch (error) {
                  setError((error as Error).message);
                  return;
                }
              } else setReset(!reset);
              setError("");
              setMessage("");
            }}
          >
            {settingPassword || reset
              ? "Επιστροφή στη σύνδεση"
              : "Ξέχασα τον κωδικό μου"}
          </button>
        </form>
        <p className="auth-footer">
          Η πρόσβαση παρέχεται από τον διαχειριστή της Leaf Properties.
        </p>
      </section>
    </main>
  );
}
