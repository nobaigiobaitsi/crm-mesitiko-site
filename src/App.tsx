import { useMemo, useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { CrmApp } from "./components/CrmApp";
import { ErrorNotice, Gate, Loading } from "./components/Common";
import { useAuth } from "./hooks/useAuth";
import { useWorkspace } from "./hooks/useWorkspace";
import {
  configurationError,
  initialAuthCallback,
  supabase,
} from "./lib/supabase";
import { createCrmRepository } from "./services/crm";
import { createPhotoRepository } from "./services/photos";

export default function App() {
  const auth = useAuth(supabase, initialAuthCallback);
  const repository = useMemo(
    () => (supabase ? createCrmRepository(supabase) : null),
    [],
  );
  const photos = useMemo(
    () => (supabase ? createPhotoRepository(supabase) : null),
    [],
  );
  const userId = auth.requiresPassword ? null : auth.session?.user.id || null;
  const workspace = useWorkspace(repository, userId);
  const [signOutError, setSignOutError] = useState("");

  if (!supabase)
    return (
      <Gate title="Απαιτείται ρύθμιση σύνδεσης">
        <p>
          Ο τεχνικός διαχειριστής πρέπει να συμπληρώσει τις ρυθμίσεις της
          εταιρικής βάσης και να επανεκκινήσει την εφαρμογή.
        </p>
        <ErrorNotice message={configurationError} />
      </Gate>
    );
  if (auth.loading) return <Loading />;
  if (!auth.session || auth.requiresPassword) return <AuthScreen auth={auth} />;
  if (!workspace.data) {
    if (workspace.loading || !workspace.error)
      return <Loading label="Σύνδεση στην εταιρική βάση…" />;
    return (
      <Gate title="Δεν ήταν δυνατή η πρόσβαση">
        <ErrorNotice message={workspace.error} />
        <ErrorNotice message={signOutError} />
        <div className="gate-actions">
          <button className="primary" onClick={() => void workspace.refresh()}>
            Δοκιμή ξανά
          </button>
          <button
            className="secondary"
            onClick={() => {
              void auth
                .signOut()
                .catch((error: Error) => setSignOutError(error.message));
            }}
          >
            Αποσύνδεση
          </button>
        </div>
      </Gate>
    );
  }
  return (
    <CrmApp
      key={userId}
      data={workspace.data}
      repository={repository!}
      photoRepository={photos!}
      refreshing={workspace.loading}
      refreshError={workspace.error}
      onRefresh={workspace.refresh}
      onSignOut={auth.signOut}
      onSaved={workspace.acceptSaved}
      onRemoved={workspace.acceptRemoved}
    />
  );
}
