import { supabase } from '@/integrations/supabase/client';

/**
 * Guarda de sessão: detecta que a senha do usuário mudou depois que a sessão
 * atual foi emitida e força o logout imediato.
 *
 * Fontes do marcador (a mais recente vence):
 *  - public.profiles.password_changed_at  → preenchido pelo trigger no banco
 *    (cobre troca feita pelo admin e pelo próprio usuário);
 *  - user_metadata.password_changed_at    → preenchido pelo app na troca
 *    self-service (funciona mesmo sem a migration aplicada).
 */

const SKEW_MS = 5000;

/** Extrai o `iat` (emissão) do access token JWT. */
export function getTokenIssuedAt(accessToken: string): number | null {
  try {
    const part = accessToken.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    const payload = JSON.parse(json);
    return typeof payload.iat === 'number' ? payload.iat * 1000 : null;
  } catch {
    return null;
  }
}

function toTime(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'number') return value > 1e12 ? value : value * 1000;
  const t = new Date(String(value)).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Marcador de troca de senha gravado no banco (pode não existir ainda). */
export async function fetchPasswordChangedAt(userId: string): Promise<number | null> {
  // Tabela dedicada criada pela migration de segurança.
  try {
    const { data, error } = await supabase
      .from('user_security')
      .select('password_changed_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) {
      const value = toTime((data as { password_changed_at?: string | null }).password_changed_at);
      if (value) return value;
    }
  } catch {
    // tabela ausente (migration não aplicada) — tenta o fallback abaixo
  }

  // Fallback: instalações que guardam o marcador em profiles.
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('password_changed_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    return toTime((data as { password_changed_at?: string | null } | null)?.password_changed_at);
  } catch {
    return null;
  }
}

/** Marcador gravado no user_metadata (fallback / troca self-service). */
export function getMetadataPasswordChangedAt(metadata: Record<string, unknown> | undefined): number | null {
  return toTime(metadata?.password_changed_at);
}

export interface StaleSessionResult {
  stale: boolean;
  changedAt: number | null;
}

/**
 * A sessão atual é anterior à última troca de senha?
 * Compara o `iat` do token com o marcador mais recente encontrado.
 */
export async function isSessionStale(
  userId: string,
  accessToken: string | undefined,
  metadata?: Record<string, unknown>
): Promise<StaleSessionResult> {
  if (!accessToken) return { stale: false, changedAt: null };
  const issuedAt = getTokenIssuedAt(accessToken);
  if (!issuedAt) return { stale: false, changedAt: null };

  const fromMeta = getMetadataPasswordChangedAt(metadata);
  const fromDb = await fetchPasswordChangedAt(userId);
  const changedAt = Math.max(fromMeta ?? 0, fromDb ?? 0) || null;

  if (!changedAt) return { stale: false, changedAt: null };
  return { stale: changedAt > issuedAt + SKEW_MS, changedAt };
}

/** Marca a troca de senha self-service no metadata (imediato, sem depender do banco). */
export function passwordChangedMetadata() {
  return { password_changed_at: new Date().toISOString() };
}
