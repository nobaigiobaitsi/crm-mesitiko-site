import { useCallback, useEffect, useRef, useState } from "react";
import type { Workspace, Entry } from "../domain/model";
import { AccessDeniedError, type CrmRepository } from "../services/crm";

export function useWorkspace(
  repository: CrmRepository | null,
  userId: string | null,
) {
  const [data, setData] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!repository || !userId) return;
    const request = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await repository.load(userId);
      if (request === generation.current) setData(result);
    } catch (error) {
      if (request === generation.current) {
        setError((error as Error).message);
        if (error instanceof AccessDeniedError) setData(null);
      }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [repository, userId]);
  useEffect(() => {
    setData(null);
    setError("");
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);
  function acceptSaved(entry: Entry) {
    setData((current) =>
      current
        ? {
            ...current,
            entries: [
              entry,
              ...current.entries.filter((item) => item.id !== entry.id),
            ],
          }
        : null,
    );
  }
  function acceptRemoved(id: string) {
    setData((current) =>
      current
        ? {
            ...current,
            entries: current.entries.filter((item) => item.id !== id),
          }
        : null,
    );
  }
  return {
    data: data?.me.id === userId ? data : null,
    loading,
    error,
    refresh,
    acceptSaved,
    acceptRemoved,
  };
}
