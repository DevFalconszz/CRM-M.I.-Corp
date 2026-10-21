-- ============================================================================
-- Força logout imediato quando a senha do usuário é alterada.
--
-- 1) Marca public.user_security.password_changed_at quando encrypted_password
--    muda — cobre a troca feita pelo admin (RPC admin_update_user) e pelo
--    próprio usuário (auth.updateUser).
-- 2) Remove as sessões/refresh tokens ativos do usuário no GoTrue.
--
-- O app (src/lib/session-guard.ts) compara esse timestamp com o `iat` do JWT
-- da sessão atual e encerra o acesso assim que detecta que a senha mudou.
--
-- Aplicar com: supabase db push   (ou colar no SQL Editor do dashboard)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_security (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own security flag" ON public.user_security;
CREATE POLICY "Users can read own security flag" ON public.user_security
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.user_security TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_password_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    INSERT INTO public.user_security (user_id, password_changed_at, updated_at)
    VALUES (NEW.id, now(), now())
    ON CONFLICT (user_id) DO UPDATE
      SET password_changed_at = EXCLUDED.password_changed_at,
          updated_at = EXCLUDED.updated_at;

    -- Invalida as sessões ativas do usuário (força novo login).
    BEGIN
      DELETE FROM auth.refresh_tokens WHERE user_id = NEW.id::text;
      DELETE FROM auth.sessions WHERE user_id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      -- Nunca bloqueia a alteração de senha por falha ao limpar sessões.
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_password_changed ON auth.users;
CREATE TRIGGER on_auth_user_password_changed
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_password_change();

-- Melhor esforço: publica a tabela no Realtime para o logout ser instantâneo.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_security;
EXCEPTION WHEN OTHERS THEN
  NULL; -- já publicada ou Realtime indisponível — o polling cobre.
END;
$$;
