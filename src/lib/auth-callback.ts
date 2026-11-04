export interface AuthCallback {
  type: "invite" | "recovery" | null;
  tokenHash?: string;
  error?: string;
}

export function readAuthCallback(url: string): AuthCallback {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.slice(1));
  const type = parsed.searchParams.get("type") || hash.get("type");
  return {
    type: type === "invite" || type === "recovery" ? type : null,
    tokenHash: parsed.searchParams.get("token_hash") || undefined,
    error:
      parsed.searchParams.get("error_description") ||
      hash.get("error_description") ||
      undefined,
  };
}
