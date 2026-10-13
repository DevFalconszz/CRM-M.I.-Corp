import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
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
