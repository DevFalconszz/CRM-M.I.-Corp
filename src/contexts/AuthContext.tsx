import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isSessionStale, passwordChangedMetadata } from '@/lib/session-guard';
import { toast } from 'sonner';

export type UserRole = 'admin' | 'sdr' | 'tm';

export interface ProfileUpdate {
  full_name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (data: ProfileUpdate) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const forcedLogoutRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') forcedLogoutRef.current = false;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || '' },
      },
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    // Marca a troca no metadata (vale mesmo sem a migration aplicada) e encerra
    // a sessão atual imediatamente — o usuário precisa entrar com a nova senha.
    const { error } = await supabase.auth.updateUser({
      password,
      data: passwordChangedMetadata(),
    });
    if (error) return { error };
    forcedLogoutRef.current = true;
    await supabase.auth.signOut();
    return { error: null };
  };

  const updateProfile = async (data: ProfileUpdate) => {
    const { error } = await supabase.auth.updateUser({ data });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const [role, setRole] = useState<UserRole | null>(null);

  // Resolve o role observando o usuário e, quando logado, consultando a fonte
  // autoritativa no banco (app_metadata), com fallback para o JWT da sessão.
  useEffect(() => {
    let active = true;
    if (!user) {
      setRole(null);
      return;
    }
    const resolveRole = (raw: unknown): UserRole =>
      raw === 'admin' ? 'admin' : raw === 'tm' ? 'tm' : 'sdr';
    const setFromJwt = () =>
      setRole(resolveRole(user?.app_metadata?.role));
    setFromJwt();
    (async () => {
      try {
        const { data, error } = await (supabase.rpc as any)('get_current_user_role');
        if (!active) return;
        if (!error) {
          setRole(resolveRole(data));
        }
      } catch {
        // mantém o valor do JWT em caso de falha da consulta
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  /**
   * Vigia a sessão: se a senha do usuário foi alterada depois que este token
   * foi emitido (pelo admin ou pelo próprio usuário), desloga na hora.
   */
  const forceLogout = useCallback(async (message: string) => {
    if (forcedLogoutRef.current) return;
    forcedLogoutRef.current = true;
    await supabase.auth.signOut();
    toast.error(message);
  }, []);

  useEffect(() => {
    const accessToken = session?.access_token;
    const currentUser = user;
    if (!accessToken || !currentUser) return;

    let cancelled = false;

    const check = async () => {
      const { stale } = await isSessionStale(
        currentUser.id,
        accessToken,
        currentUser.user_metadata as Record<string, unknown> | undefined
      );
      if (!cancelled && stale) {
        forceLogout('Sua senha foi alterada. Entre novamente com a nova senha.');
      }
    };

    check();
    // Polling curto + checagem ao voltar o foco garantem o desligamento imediato
    // mesmo quando o Realtime não está habilitado para a tabela.
    const interval = setInterval(check, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    // Realtime (melhor esforço): derruba a sessão no instante da alteração.
    const channel = supabase
      .channel(`pwd-watch-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_security', filter: `user_id=eq.${currentUser.id}` },
        () => { check(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [session?.access_token, user?.id, forceLogout]);

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signIn, signUp, updatePassword, updateProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
